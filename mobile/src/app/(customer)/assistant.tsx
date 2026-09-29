import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ServiceCard } from '@/components/cards';
import { Badge, Card, Chip, IconCircle, Row, type IconName } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import type { AssistResult } from '@/lib/types';
import { colors, font, radius, spacing } from '@/theme';

type Turn = { role: 'user'; content: string } | { role: 'assistant'; content: string; result: AssistResult };

const EXAMPLES = ['My kitchen sink is leaking', 'AC is running but not cooling', 'Washing machine makes a loud noise', 'Termites in the door frame'];

const URGENCY: Record<AssistResult['urgency'], { label: string; color: string; bg: string; icon: IconName }> = {
  low: { label: 'Low urgency', color: colors.success, bg: colors.successSoft, icon: 'leaf' },
  medium: { label: 'Normal', color: colors.info, bg: colors.infoSoft, icon: 'time' },
  high: { label: 'Urgent', color: colors.warning, bg: colors.warningSoft, icon: 'alert-circle' },
  emergency: { label: 'Emergency', color: colors.danger, bg: colors.dangerSoft, icon: 'warning' },
};

export default function Assistant() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState('');
  const scroll = useRef<ScrollView>(null);

  const ask = useMutation({
    mutationFn: (message: string) =>
      api<AssistResult>('/ai/assist', {
        method: 'POST',
        body: { message, history: turns.slice(-8).map((t) => ({ role: t.role, content: t.content })) },
      }),
    onSuccess: (result) => {
      setTurns((prev) => [...prev, { role: 'assistant', content: result.summary, result }]);
      setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 100);
    },
  });

  const send = (message = text) => {
    const clean = message.trim();
    if (clean.length < 3 || ask.isPending) return;
    setTurns((prev) => [...prev, { role: 'user', content: clean }]);
    setText('');
    ask.mutate(clean);
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={font.h1}>Ask AI</Text>
            {turns.length ? <Chip label="New chat" icon="refresh" onPress={() => setTurns([])} /> : null}
          </Row>
        </View>

        <ScrollView ref={scroll} contentContainerStyle={{ padding: spacing.lg, paddingTop: 0, gap: spacing.md }} keyboardShouldPersistTaps="handled">
          {turns.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
              <IconCircle name="sparkles" size={72} color={colors.accent} bg={colors.accentSoft} />
              <Text style={[font.h3, { marginTop: spacing.lg, textAlign: 'center' }]}>Describe what's wrong</Text>
              <Text style={[font.small, { textAlign: 'center', marginTop: 4, maxWidth: 300 }]}>
                Tell us in your own words. We'll work out which service you need, how urgent it is, and who can help.
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center', marginTop: spacing.xl }}>
                {EXAMPLES.map((e) => (
                  <Chip key={e} label={e} onPress={() => send(e)} />
                ))}
              </View>
            </View>
          ) : null}

          {turns.map((turn, i) =>
            turn.role === 'user' ? (
              <View key={i} style={styles.userBubble}>
                <Text style={{ color: colors.white, fontSize: 15 }}>{turn.content}</Text>
              </View>
            ) : (
              <ResultCard key={i} result={turn.result} onAnswer={(q) => setText(`${q} `)} />
            ),
          )}

          {ask.isPending ? (
            <Row style={styles.thinking}>
              <ActivityIndicator color={colors.primary} />
              <Text style={font.small}>Looking into it…</Text>
            </Row>
          ) : null}
          {ask.error ? <Text style={{ color: colors.danger }}>{errorMessage(ask.error)}</Text> : null}
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="e.g. Water is dripping from the ceiling"
            placeholderTextColor={colors.textFaint}
            style={styles.input}
            multiline
            maxLength={1000}
          />
          <Pressable onPress={() => send()} disabled={text.trim().length < 3 || ask.isPending} style={[styles.send, text.trim().length < 3 && { opacity: 0.4 }]} accessibilityLabel="Send">
            <Ionicons name="arrow-up" size={22} color={colors.white} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ResultCard({ result, onAnswer }: { result: AssistResult; onAnswer: (question: string) => void }) {
  const urgency = URGENCY[result.urgency];
  return (
    <View style={{ gap: spacing.md }}>
      <Card>
        <Row style={{ justifyContent: 'space-between', marginBottom: spacing.sm }}>
          {result.category ? (
            <Badge label={result.category.name} icon={(result.category.icon as IconName) ?? 'construct'} />
          ) : (
            <Badge label="Not sure yet" color={colors.textMuted} bg={colors.border} />
          )}
          <Badge label={urgency.label} icon={urgency.icon} color={urgency.color} bg={urgency.bg} />
        </Row>
        <Text style={font.body}>{result.summary}</Text>

        {result.safetyAdvice ? (
          <View style={styles.safety}>
            <Ionicons name="shield-checkmark" size={18} color={colors.danger} />
            <Text style={{ color: colors.danger, flex: 1, fontWeight: '600' }}>{result.safetyAdvice}</Text>
          </View>
        ) : null}

        {result.followUpQuestions.length ? (
          <View style={{ marginTop: spacing.md }}>
            <Text style={font.tiny}>A FEW QUESTIONS (TAP TO ANSWER)</Text>
            {result.followUpQuestions.map((q) => (
              <Pressable key={q} onPress={() => onAnswer(q)} style={styles.question}>
                <Text style={{ flex: 1, color: colors.text }}>{q}</Text>
                <Ionicons name="return-down-forward" size={16} color={colors.primary} />
              </Pressable>
            ))}
          </View>
        ) : null}
        {result.source === 'fallback' ? <Text style={[font.tiny, { marginTop: spacing.md }]}>Quick match (offline mode)</Text> : null}
      </Card>

      {result.providers.length ? (
        <>
          <Text style={font.h3}>Recommended providers</Text>
          {result.providers.slice(0, 3).map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              onPress={() => router.push({ pathname: '/book/[serviceId]', params: { serviceId: service.id, note: result.bookingNote } })}
            />
          ))}
          {result.category ? (
            <Pressable onPress={() => router.push({ pathname: '/search', params: { category: result.category!.slug } })}>
              <Text style={{ color: colors.primary, fontWeight: '700', textAlign: 'center' }}>See all {result.category.name} providers</Text>
            </Pressable>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  userBubble: { alignSelf: 'flex-end', backgroundColor: colors.primary, borderRadius: radius.lg, borderBottomRightRadius: 4, padding: spacing.md, maxWidth: '85%' },
  thinking: { alignSelf: 'flex-start', backgroundColor: colors.card, padding: spacing.md, borderRadius: radius.lg },
  safety: { flexDirection: 'row', gap: spacing.sm, backgroundColor: colors.dangerSoft, padding: spacing.md, borderRadius: radius.md, marginTop: spacing.md },
  question: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border },
  input: { flex: 1, maxHeight: 120, backgroundColor: colors.bg, borderRadius: radius.lg, paddingHorizontal: spacing.lg, paddingVertical: 12, fontSize: 15, color: colors.text },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
