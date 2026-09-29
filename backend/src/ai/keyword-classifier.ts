// Offline fallback used when no ANTHROPIC_API_KEY is set or the AI call fails.
// Simple keyword scoring — far less smart than the model, but the feature keeps working.

const KEYWORDS: Record<string, string[]> = {
  plumbing: ['leak', 'leaking', 'pipe', 'tap', 'faucet', 'sink', 'toilet', 'drain', 'blocked', 'water', 'shower', 'tank', 'flush', 'geyser', 'heater'],
  electrical: ['electric', 'power', 'wiring', 'wire', 'socket', 'plug', 'switch', 'breaker', 'trip', 'light', 'bulb', 'fan', 'spark', 'shock', 'fuse'],
  'ac-repair': ['ac', 'a/c', 'air condition', 'aircon', 'cooling', 'not cold', 'gas refill', 'inverter'],
  'appliance-repair': ['washing machine', 'washer', 'fridge', 'refrigerator', 'freezer', 'oven', 'microwave', 'dryer', 'dishwasher', 'rice cooker', 'noise', 'spin', 'drum'],
  cleaning: ['clean', 'cleaning', 'dust', 'dirty', 'deep clean', 'sofa', 'carpet', 'mould', 'mold'],
  carpentry: ['wood', 'door', 'window', 'cupboard', 'cabinet', 'furniture', 'hinge', 'drawer', 'bed', 'table', 'lock'],
  painting: ['paint', 'painting', 'wall colour', 'wall color', 'peeling', 'damp wall', 'repaint'],
  'pest-control': ['termite', 'ant', 'ants', 'cockroach', 'rat', 'rats', 'mouse', 'mice', 'mosquito', 'bed bug', 'pest', 'bees', 'wasp'],
};

// Everyday words that appear in many problems ("water", "door") count less than specific ones ("termite").
const WEAK = new Set(['water', 'wood', 'door', 'window', 'light', 'power', 'noise', 'clean', 'table', 'bed', 'lock', 'dust', 'tank']);

const EMERGENCY = ['gas leak', 'smell gas', 'fire', 'smoke', 'spark', 'shock', 'flood', 'flooding', 'burst'];

export function classifyByKeywords(text: string) {
  const lower = ` ${text.toLowerCase().replace(/[^a-z0-9/ ]/g, ' ')} `;
  const matches = (w: string) => lower.includes(w.length <= 3 ? ` ${w} ` : w);
  const scores = Object.entries(KEYWORDS)
    .map(([slug, words]) => ({ slug, score: words.filter(matches).reduce((sum, w) => sum + (WEAK.has(w) ? 1 : 3), 0) }))
    .sort((a, b) => b.score - a.score);

  const best = scores[0];
  const second = scores[1];
  const isEmergency = EMERGENCY.some((w) => lower.includes(w));
  return {
    slug: best.score > 0 ? best.slug : null,
    confidence: best.score === 0 ? 0 : Math.min(0.8, 0.4 + 0.05 * (best.score - (second?.score ?? 0))),
    urgency: isEmergency ? ('emergency' as const) : ('medium' as const),
  };
}
