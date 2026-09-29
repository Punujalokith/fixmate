import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Row } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

const perks = [
  { icon: 'shield-checkmark' as const, text: 'Verified, rated local professionals' },
  { icon: 'sparkles' as const, text: 'Describe the problem — AI finds the right fix' },
  { icon: 'chatbubbles' as const, text: 'Live updates and chat with your provider' },
];

export default function Welcome() {
  return (
    <View style={styles.bg}>
      <View style={styles.blobA} />
      <View style={styles.blobB} />
      <SafeAreaView style={{ flex: 1, justifyContent: 'space-between', padding: spacing.xl }}>
        <View style={{ marginTop: spacing.xxl }}>
          <View style={styles.logo}>
            <Ionicons name="construct" size={30} color={colors.primary} />
          </View>
          <Text style={styles.title}>FixMate</Text>
          <Text style={styles.subtitle}>Trusted home services across Sri Lanka, booked in minutes.</Text>

          <View style={{ marginTop: spacing.xxl, gap: spacing.lg }}>
            {perks.map((perk) => (
              <Row key={perk.text} gap={spacing.md}>
                <View style={styles.perkIcon}>
                  <Ionicons name={perk.icon} size={18} color={colors.white} />
                </View>
                <Text style={styles.perk}>{perk.text}</Text>
              </Row>
            ))}
          </View>
        </View>

        <View style={{ gap: spacing.md }}>
          <Button title="Create an account" variant="light" onPress={() => router.push('/register')} />
          <Button title="I already have an account" variant="outlineLight" onPress={() => router.push('/login')} />
          <Text style={styles.small}>Offer services? Sign up as a provider on the next screen.</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.primary, overflow: 'hidden' },
  blobA: { position: 'absolute', width: 380, height: 380, borderRadius: 190, backgroundColor: colors.primaryDark, top: -120, right: -140 },
  blobB: { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(245,158,11,0.18)', bottom: 120, left: -120 },
  logo: { width: 60, height: 60, borderRadius: radius.lg, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.white, fontSize: 40, fontWeight: '800', marginTop: spacing.lg, letterSpacing: -1 },
  subtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 17, marginTop: spacing.sm, lineHeight: 24 },
  perkIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  perk: { color: colors.white, fontSize: 15, flex: 1 },
  small: { color: 'rgba(255,255,255,0.7)', textAlign: 'center', fontSize: 13 },
});
