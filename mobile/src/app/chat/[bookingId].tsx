import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ErrorView, Loading } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { notify, useBooking } from '@/lib/queries';
import { getSocket } from '@/lib/socket';
import type { Message } from '@/lib/types';
import { useAuth } from '@/store/auth';
import { colors, font, radius, spacing } from '@/theme';

type Ack<T> = { ok: true; data: T } | { ok: false; error: string };

export default function Chat() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const me = useAuth((s) => s.user);
  const queryClient = useQueryClient();
  const booking = useBooking(bookingId);
  const [text, setText] = useState('');
  const [otherTyping, setOtherTyping] = useState(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Newest first; the list is inverted so the newest shows at the bottom.
  const messages = useQuery({
    queryKey: ['messages', bookingId],
    queryFn: () => api<{ data: Message[] }>(`/bookings/${bookingId}/messages?limit=100`).then((r) => r.data),
  });

  // Mark as read when opening, and whenever a new message arrives while the screen is open.
  const latestId = messages.data?.[0]?.id;
  useEffect(() => {
    if (latestId) getSocket()?.emit('message:read', { bookingId });
    queryClient.invalidateQueries({ queryKey: ['unread-chats'] });
  }, [latestId, bookingId, queryClient]);

  useEffect(() => {
    const socket = getSocket();
    const onTyping = (p: { bookingId: string; isTyping: boolean }) => {
      if (p.bookingId !== bookingId) return;
      setOtherTyping(p.isTyping);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      if (p.isTyping) typingTimer.current = setTimeout(() => setOtherTyping(false), 4000);
    };
    socket?.on('typing', onTyping);
    return () => {
      socket?.off('typing', onTyping);
    };
  }, [bookingId]);

  const lastTypingSent = useRef(0);
  const onChange = (value: string) => {
    setText(value);
    if (Date.now() - lastTypingSent.current > 2000) {
      getSocket()?.emit('typing', { bookingId, isTyping: true });
      lastTypingSent.current = Date.now();
    }
  };

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setText('');
    const socket = getSocket();
    try {
      let message: Message;
      if (socket?.connected) {
        const ack: Ack<Message> = await socket.timeout(8000).emitWithAck('message:send', { bookingId, body });
        if (!ack.ok) throw new Error(ack.error);
        message = ack.data;
      } else {
        message = await api<Message>(`/bookings/${bookingId}/messages`, { method: 'POST', body: { body } });
      }
      queryClient.setQueryData<Message[]>(['messages', bookingId], (old = []) => (old.some((m) => m.id === message.id) ? old : [message, ...old]));
      getSocket()?.emit('typing', { bookingId, isTyping: false });
    } catch (e) {
      setText(body);
      notify('Message not sent', errorMessage(e));
    }
  };

  if (messages.isLoading || booking.isLoading) return <Loading />;
  if (messages.error) return <ErrorView message={errorMessage(messages.error)} onRetry={messages.refetch} />;

  const b = booking.data;
  const title = b ? (me?.id === b.business.ownerId ? b.customer.fullName : b.business.name) : 'Chat';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom']}>
      <Stack.Screen options={{ title }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <FlatList
          inverted
          data={messages.data ?? []}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
          ListEmptyComponent={
            <View style={{ transform: [{ scaleY: -1 }], alignItems: 'center', padding: spacing.xl }}>
              <Text style={font.small}>Say hello 👋 Messages are only visible to you and the other person.</Text>
            </View>
          }
          ListHeaderComponent={otherTyping ? <Text style={[font.small, { fontStyle: 'italic' }]}>{title} is typing…</Text> : null}
          renderItem={({ item, index }) => {
            const mine = item.senderId === me?.id;
            const isLatestMine = mine && messages.data!.findIndex((m) => m.senderId === me?.id) === index;
            return (
              <View style={{ alignItems: mine ? 'flex-end' : 'flex-start' }}>
                <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                  <Text style={{ color: mine ? colors.white : colors.text, fontSize: 15 }}>{item.body}</Text>
                </View>
                <Text style={[font.tiny, { marginTop: 2 }]}>
                  {new Date(item.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  {isLatestMine ? (item.readAt ? ' · Seen' : ' · Sent') : ''}
                </Text>
              </View>
            );
          }}
        />
        <View style={styles.composer}>
          <TextInput value={text} onChangeText={onChange} placeholder="Type a message" placeholderTextColor={colors.textFaint} style={styles.input} multiline maxLength={2000} />
          <Pressable onPress={send} disabled={!text.trim()} style={[styles.send, !text.trim() && { opacity: 0.4 }]} accessibilityLabel="Send">
            <Ionicons name="send" size={18} color={colors.white} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bubble: { maxWidth: '80%', paddingVertical: 10, paddingHorizontal: 14, borderRadius: radius.lg },
  mine: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  theirs: { backgroundColor: colors.card, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border },
  input: { flex: 1, maxHeight: 120, backgroundColor: colors.bg, borderRadius: radius.lg, paddingHorizontal: spacing.lg, paddingVertical: 11, fontSize: 15, color: colors.text },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
