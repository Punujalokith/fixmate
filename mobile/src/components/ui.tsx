import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { initials } from '@/lib/format';
import { colors, font, radius, shadow, spacing } from '@/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

// ─────────────── Layout ───────────────

export function Screen({
  children,
  scroll = true,
  refreshing,
  onRefresh,
  edges = ['top'],
  padded = true,
  footer,
}: {
  children: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  edges?: Edge[];
  padded?: boolean;
  footer?: ReactNode;
}) {
  const content = scroll ? (
    <ScrollView
      contentContainerStyle={[padded && styles.padded, { paddingBottom: spacing.xxl }]}
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1 }, padded && styles.padded]}>{children}</View>
  );
  return (
    <SafeAreaView style={styles.screen} edges={edges}>
      {content}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

export function Row({ children, gap = spacing.sm, style }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <Row style={{ justifyContent: 'space-between', marginTop: spacing.xl, marginBottom: spacing.md }}>
      <Text style={font.h3}>{title}</Text>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={{ color: colors.primary, fontWeight: '600' }}>{action}</Text>
        </Pressable>
      ) : null}
    </Row>
  );
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.card, style, pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] }]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

// ─────────────── Controls ───────────────

// 'light' and 'outlineLight' are for buttons placed on the teal brand background.
type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'light' | 'outlineLight';

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  icon,
  style,
  small,
}: {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
}) {
  const palette = {
    primary: { bg: colors.primary, fg: colors.white, border: colors.primary },
    secondary: { bg: colors.card, fg: colors.text, border: colors.border },
    danger: { bg: colors.dangerSoft, fg: colors.danger, border: colors.dangerSoft },
    ghost: { bg: 'transparent', fg: colors.primary, border: 'transparent' },
    light: { bg: colors.white, fg: colors.primary, border: colors.white },
    outlineLight: { bg: 'transparent', fg: colors.white, border: 'rgba(255,255,255,0.5)' },
  }[variant];
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        small && { paddingVertical: 9, paddingHorizontal: spacing.md },
        { backgroundColor: palette.bg, borderColor: palette.border },
        pressed && { opacity: 0.8 },
        isDisabled && { opacity: 0.5 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <Row gap={6}>
          {icon ? <Ionicons name={icon} size={small ? 16 : 18} color={palette.fg} /> : null}
          <Text style={{ color: palette.fg, fontWeight: '700', fontSize: small ? 14 : 16 }}>{title}</Text>
        </Row>
      )}
    </Pressable>
  );
}

export function Input({ label, error, icon, ...props }: TextInputProps & { label?: string; error?: string; icon?: IconName }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.inputWrap, error ? { borderColor: colors.danger } : null]}>
        {icon ? <Ionicons name={icon} size={18} color={colors.textFaint} style={{ marginRight: spacing.sm }} /> : null}
        <TextInput placeholderTextColor={colors.textFaint} style={[styles.input, props.multiline && { minHeight: 90, textAlignVertical: 'top' }]} {...props} />
      </View>
      {error ? <Text style={{ color: colors.danger, fontSize: 12, marginTop: 4 }}>{error}</Text> : null}
    </View>
  );
}

export function Chip({ label, selected, onPress, icon }: { label: string; selected?: boolean; onPress?: () => void; icon?: IconName }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && { backgroundColor: colors.primary, borderColor: colors.primary }]}
      accessibilityState={{ selected }}
    >
      <Row gap={4}>
        {icon ? <Ionicons name={icon} size={14} color={selected ? colors.white : colors.textMuted} /> : null}
        <Text style={{ color: selected ? colors.white : colors.text, fontWeight: '600', fontSize: 13 }}>{label}</Text>
      </Row>
    </Pressable>
  );
}

// ─────────────── Display ───────────────

export function Badge({ label, color = colors.primary, bg = colors.primarySoft, icon }: { label: string; color?: string; bg?: string; icon?: IconName }) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      {icon ? <Ionicons name={icon} size={12} color={color} /> : null}
      <Text style={{ color, fontSize: 12, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

export function Avatar({ name, url, size = 44 }: { name: string; url?: string | null; size?: number }) {
  if (url) return <Image source={{ uri: url }} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" />;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.primaryDark, fontWeight: '800', fontSize: size * 0.36 }}>{initials(name)}</Text>
    </View>
  );
}

export function Stars({ rating, count, size = 14 }: { rating: number; count?: number; size?: number }) {
  return (
    <Row gap={4}>
      <Ionicons name="star" size={size} color={colors.accent} />
      <Text style={{ fontWeight: '700', color: colors.text, fontSize: size }}>{rating ? rating.toFixed(1) : 'New'}</Text>
      {count !== undefined && count > 0 ? <Text style={{ color: colors.textMuted, fontSize: size - 1 }}>({count})</Text> : null}
    </Row>
  );
}

export function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <Row gap={spacing.sm} style={{ justifyContent: 'center', marginVertical: spacing.md }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onChange(n)} hitSlop={6} accessibilityLabel={`${n} stars`}>
          <Ionicons name={n <= value ? 'star' : 'star-outline'} size={36} color={colors.accent} />
        </Pressable>
      ))}
    </Row>
  );
}

export function IconCircle({ name, color = colors.primary, bg = colors.primarySoft, size = 44 }: { name: IconName; color?: string; bg?: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={name} size={size * 0.5} color={color} />
    </View>
  );
}

export function EmptyState({ icon, title, message, action, onAction }: { icon: IconName; title: string; message?: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: spacing.xxl * 1.5, paddingHorizontal: spacing.xl }}>
      <IconCircle name={icon} size={72} />
      <Text style={[font.h3, { marginTop: spacing.lg, textAlign: 'center' }]}>{title}</Text>
      {message ? <Text style={[font.small, { textAlign: 'center', marginTop: spacing.xs }]}>{message}</Text> : null}
      {action ? <Button title={action} onPress={onAction} style={{ marginTop: spacing.lg }} small /> : null}
    </View>
  );
}

export function Loading() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

export function ErrorView({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <EmptyState icon="cloud-offline-outline" title="Something went wrong" message={message} action={onRetry ? 'Try again' : undefined} onAction={onRetry} />;
}

export function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.md }} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  padded: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  footer: { padding: spacing.lg, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, ...shadow },
  button: { borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: spacing.xl, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md },
  input: { flex: 1, paddingVertical: 13, fontSize: 15, color: colors.text },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 10, borderRadius: radius.pill },
});
