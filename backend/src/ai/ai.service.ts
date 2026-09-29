import Anthropic from '@anthropic-ai/sdk';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CategoriesService } from '../categories/categories.service.js';
import { MarketplaceService } from '../marketplace/marketplace.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { SearchServicesQueryDto } from '../marketplace/dto/marketplace.dto.js';
import type { AssistRequestDto } from './dto/ai.dto.js';
import { classifyByKeywords } from './keyword-classifier.js';

const URGENCY = ['low', 'medium', 'high', 'emergency'] as const;
type Urgency = (typeof URGENCY)[number];

/** What the model must return — enforced by structured outputs (output_config.format). */
interface Diagnosis {
  category_slug: string;
  confidence: number;
  urgency: Urgency;
  summary: string;
  follow_up_questions: string[];
  safety_advice: string;
  search_keywords: string;
  booking_note: string;
}

export interface AssistResult {
  source: 'ai' | 'fallback';
  category: { id: string; name: string; slug: string; icon: string | null } | null;
  confidence: number;
  urgency: Urgency;
  summary: string;
  followUpQuestions: string[];
  safetyAdvice: string | null;
  bookingNote: string;
  providers: unknown[];
}

/**
 * AI Service Assistant: the customer describes a problem in plain words,
 * Claude works out which service they need, how urgent it is, asks up to 3
 * follow-up questions, and we attach matching providers.
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly client?: Anthropic;
  private readonly model: string;

  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly categories: CategoriesService,
    private readonly marketplace: MarketplaceService,
  ) {
    const apiKey = config.get<string>('ANTHROPIC_API_KEY');
    this.model = config.get<string>('ANTHROPIC_MODEL', 'claude-opus-5-5');
    if (apiKey) this.client = new Anthropic({ apiKey, timeout: 30_000, maxRetries: 2 });
    else this.logger.log('ANTHROPIC_API_KEY not set: AI assistant uses keyword fallback');
  }

  get enabled() {
    return Boolean(this.client);
  }

  async assist(userId: string, dto: AssistRequestDto): Promise<AssistResult> {
    const categories = await this.categories.findAll();
    const started = Date.now();

    let diagnosis: Diagnosis | null = null;
    let source: AssistResult['source'] = 'fallback';

    if (this.client) {
      try {
        const { diagnosis: result, usage } = await this.askClaude(dto, categories);
        diagnosis = result;
        source = 'ai';
        await this.logRequest(userId, dto.message, result, usage, Date.now() - started, true);
      } catch (error) {
        const message = error instanceof Anthropic.APIError ? `${error.status}: ${error.message}` : (error as Error).message;
        this.logger.warn(`AI assist failed, using fallback: ${message}`);
        await this.logRequest(userId, dto.message, null, null, Date.now() - started, false, message);
      }
    }

    diagnosis ??= this.fallbackDiagnosis(dto);

    const category = categories.find((c) => c.slug === diagnosis.category_slug) ?? null;
    const providers = category ? await this.findProviders(category.slug, dto.city ?? undefined) : [];

    return {
      source,
      category: category && { id: category.id, name: category.name, slug: category.slug, icon: category.icon },
      confidence: Math.max(0, Math.min(1, diagnosis.confidence)),
      urgency: diagnosis.urgency,
      summary: diagnosis.summary,
      followUpQuestions: diagnosis.follow_up_questions.filter(Boolean).slice(0, 3),
      safetyAdvice: diagnosis.safety_advice || null,
      bookingNote: diagnosis.booking_note,
      providers,
    };
  }

  private async askClaude(dto: AssistRequestDto, categories: { slug: string; name: string; description: string | null }[]) {
    const slugs = [...categories.map((c) => c.slug), 'unknown'];

    // Stable system prompt first (cache-friendly); the customer's words go in messages.
    const system = [
      'You are the service assistant for FixMate, a home-services marketplace in Sri Lanka.',
      'A customer describes a problem at home. Work out which service category fits, how urgent it is,',
      'and what a provider would need to know. Be practical and brief; customers read this on a phone.',
      '',
      'Categories:',
      ...categories.map((c) => `- ${c.slug}: ${c.name}${c.description ? ` (${c.description})` : ''}`),
      '- unknown: none of the above fits, or the message is not about a home service',
      '',
      'Field guidance:',
      '- confidence: 0 to 1, how sure you are about the category.',
      '- urgency: "emergency" only for danger to people or property right now (gas smell, sparking, flooding, fire).',
      '- follow_up_questions: 0-3 short questions whose answers would change the price or the provider’s preparation.',
      '  Ask none if the problem is already clear. Never repeat a question the customer already answered.',
      '- safety_advice: one sentence of immediate safety steps for high/emergency urgency, otherwise an empty string.',
      '- search_keywords: 2-5 words to search provider listings.',
      '- booking_note: a clear note the customer can send to the provider, written in first person, max 2 sentences.',
      'Reply in the same language the customer used (English, Sinhala or Tamil).',
    ].join('\n');

    const messages: Anthropic.Beta.BetaMessageParam[] = [
      ...(dto.history ?? []).map((turn) => ({ role: turn.role, content: turn.content })),
      { role: 'user', content: dto.message },
    ];

    const response = await this.client!.beta.messages.create({
      model: this.model,
      max_tokens: 2048,
      system,
      messages,
      // Short classification task: low effort keeps it fast and cheap.
      output_config: {
        effort: 'low',
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            additionalProperties: false,
            required: [
              'category_slug',
              'confidence',
              'urgency',
              'summary',
              'follow_up_questions',
              'safety_advice',
              'search_keywords',
              'booking_note',
            ],
            properties: {
              category_slug: { type: 'string', enum: slugs },
              confidence: { type: 'number' },
              urgency: { type: 'string', enum: [...URGENCY] },
              summary: { type: 'string', description: 'One sentence describing the problem' },
              follow_up_questions: { type: 'array', items: { type: 'string' } },
              safety_advice: { type: 'string' },
              search_keywords: { type: 'string' },
              booking_note: { type: 'string' },
            },
          },
        },
      },
      // If a safety classifier declines, the API retries on a fallback model inside the same call.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
    });

    if (response.stop_reason === 'refusal') throw new Error('Request declined by the model');
    if (response.stop_reason === 'max_tokens') throw new Error('Model response was cut off');

    const text = response.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')?.text;
    if (!text) throw new Error('Model returned no text');
    const diagnosis = JSON.parse(text) as Diagnosis;
    if (!slugs.includes(diagnosis.category_slug) || !URGENCY.includes(diagnosis.urgency)) {
      throw new Error('Model returned an unexpected category or urgency');
    }
    return { diagnosis, usage: { input: response.usage.input_tokens, output: response.usage.output_tokens, model: response.model } };
  }

  private fallbackDiagnosis(dto: AssistRequestDto): Diagnosis {
    const text = [...(dto.history ?? []).filter((t) => t.role === 'user').map((t) => t.content), dto.message].join(' ');
    const guess = classifyByKeywords(text);
    return {
      category_slug: guess.slug ?? 'unknown',
      confidence: guess.confidence,
      urgency: guess.urgency,
      summary: dto.message.length > 140 ? `${dto.message.slice(0, 137)}...` : dto.message,
      follow_up_questions: guess.slug
        ? ['When did the problem start?', 'Can you share a photo of the problem?']
        : ['Could you describe what is broken and where in your home it is?'],
      safety_advice:
        guess.urgency === 'emergency'
          ? 'If you smell gas, see sparks or water is flooding, switch off the main supply and keep people away until help arrives.'
          : '',
      search_keywords: '',
      booking_note: dto.message,
    };
  }

  private async findProviders(categorySlug: string, city?: string) {
    const query = { category: categorySlug, city, sort: 'rating', page: 1, limit: 5 } as SearchServicesQueryDto;
    let result = await this.marketplace.searchServices(query);
    // Nobody in that city yet? Show the best providers anywhere instead of nothing.
    if (!result.data.length && city) result = await this.marketplace.searchServices({ ...query, city: undefined } as SearchServicesQueryDto);
    return result.data;
  }

  private async logRequest(
    userId: string,
    input: string,
    output: Diagnosis | null,
    usage: { input: number; output: number; model: string } | null,
    latencyMs: number,
    success: boolean,
    errorMessage?: string,
  ) {
    await this.prisma.aiRequest
      .create({
        data: {
          userId,
          input,
          output: output ? (output as unknown as object) : undefined,
          model: usage?.model ?? this.model,
          inputTokens: usage?.input ?? 0,
          outputTokens: usage?.output ?? 0,
          latencyMs,
          success,
          errorMessage: errorMessage?.slice(0, 500),
        },
      })
      .catch((error: Error) => this.logger.error(`Could not log AI request: ${error.message}`));
  }
}
