import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/features/auth/AuthContext';
import { UserRole } from '@/features/auth/types';
import { useColors } from '@/hooks/useColors';
import { useTranslation } from '@/hooks/useTranslation';

export default function RegisterScreen() {
  const { signUp, needsEmailConfirm } = useAuth();
  const colors = useColors();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Exclude<UserRole, 'admin'>>('customer');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSignUp = async () => {
    if (!fullName || !email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    try {
      setLoading(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await signUp(email.trim().toLowerCase(), password, fullName.trim(), role);
      router.replace('/');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      console.log("🚀 ~ handleSignUp ~ err:", err)
      console.log("🚀 ~ handleSignUp ~ message:", message)
      Alert.alert('Sign Up Failed', message);
    } finally {
      setLoading(false);
    }
  };

  // Email confirmation pending screen
  if (needsEmailConfirm) {
    return (
      <View style={[styles.confirmContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.confirmIcon, { backgroundColor: colors.primary + '18' }]}>
          <Feather name="mail" size={48} color={colors.primary} />
        </View>
        <Text style={[styles.confirmTitle, { color: colors.text, fontFamily: 'Inter_700Bold' }]}>
          Check Your Email
        </Text>
        <Text style={[styles.confirmBody, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
          A confirmation link has been sent to{'\n'}
          <Text style={{ color: colors.primary, fontFamily: 'Inter_600SemiBold' }}>{email}</Text>
          {'\n\n'}
          Click the link in that email to activate your account, then come back and sign in.
        </Text>
        <View style={[styles.tipBox, { backgroundColor: colors.accent + '14', borderColor: colors.accent + '30' }]}>
          <Feather name="zap" size={14} color={colors.accent} />
          <Text style={[styles.tipText, { color: colors.accent, fontFamily: 'Inter_400Regular' }]}>
            Tip: Disable "Confirm email" in your Supabase Auth settings to skip this step during development.
          </Text>
        </View>
        <Pressable
          style={[styles.backToSignIn, { backgroundColor: colors.primary }]}
          onPress={() => router.replace('/(auth)/login')}
        >
          <Text style={[styles.backToSignInText, { fontFamily: 'Inter_600SemiBold' }]}>
            Go to Sign In
          </Text>
        </Pressable>
      </View>
    );
  }

  const RoleOption = ({
    value,
    label,
    icon,
  }: {
    value: Exclude<UserRole, 'admin'>;
    label: string;
    icon: string;
  }) => (
    <Pressable
      style={[
        styles.roleOption,
        {
          backgroundColor: role === value ? colors.primary + '12' : colors.card,
          borderColor: role === value ? colors.primary : colors.border,
        },
      ]}
      onPress={() => setRole(value)}
    >
      <Feather
        name={icon as keyof typeof Feather.glyphMap}
        size={22}
        color={role === value ? colors.primary : colors.mutedForeground}
      />
      <Text
        style={[
          styles.roleLabel,
          {
            color: role === value ? colors.primary : colors.text,
            fontFamily: role === value ? 'Inter_600SemiBold' : 'Inter_400Regular',
          },
        ]}
      >
        {label}
      </Text>
      {role === value && (
        <Feather name="check-circle" size={18} color={colors.primary} style={styles.roleCheck} />
      )}
    </Pressable>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.text} />
        </Pressable>

        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text, fontFamily: 'Inter_700Bold' }]}>
            {t('signUp')}
          </Text>
          <Text
            style={[
              styles.subtitle,
              { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
            ]}
          >
            Join thousands of happy customers
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.fieldWrap}>
            <Text style={[styles.label, { color: colors.text, fontFamily: 'Inter_500Medium' }]}>
              {t('chooseRole')}
            </Text>
            <View style={styles.roleRow}>
              <RoleOption value="customer" label={t('customer')} icon="user" />
              <RoleOption value="owner" label={t('owner')} icon="briefcase" />
              {/* <RoleOption value="admin" label={t('admin')} icon="lock" /> */}
            </View>
          </View>

          <View style={styles.fieldWrap}>
            <Text style={[styles.label, { color: colors.text, fontFamily: 'Inter_500Medium' }]}>
              {t('fullName')}
            </Text>
            <View
              style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Feather name="user" size={18} color={colors.mutedForeground} />
              <TextInput
                style={[
                  styles.input,
                  { color: colors.text, fontFamily: 'Inter_400Regular' },
                ]}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Your full name"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.fieldWrap}>
            <Text style={[styles.label, { color: colors.text, fontFamily: 'Inter_500Medium' }]}>
              {t('email')}
            </Text>
            <View
              style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Feather name="mail" size={18} color={colors.mutedForeground} />
              <TextInput
                style={[
                  styles.input,
                  { color: colors.text, fontFamily: 'Inter_400Regular' },
                ]}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.fieldWrap}>
            <Text style={[styles.label, { color: colors.text, fontFamily: 'Inter_500Medium' }]}>
              {t('password')}
            </Text>
            <View
              style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Feather name="lock" size={18} color={colors.mutedForeground} />
              <TextInput
                style={[
                  styles.input,
                  { color: colors.text, fontFamily: 'Inter_400Regular' },
                ]}
                value={password}
                onChangeText={setPassword}
                placeholder="Min. 6 characters"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <Pressable onPress={() => setShowPassword((p) => !p)} hitSlop={8}>
                <Feather
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={18}
                  color={colors.mutedForeground}
                />
              </Pressable>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.signUpBtn,
              {
                backgroundColor: colors.primary,
                opacity: pressed || loading ? 0.85 : 1,
              },
            ]}
            onPress={handleSignUp}
            disabled={loading}
          >
            <Text style={[styles.signUpText, { fontFamily: 'Inter_600SemiBold' }]}>
              {loading ? t('creatingAccount') : t('signUp')}
            </Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text
            style={[
              styles.footerText,
              { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
            ]}
          >
            {t('hasAccount')}{' '}
          </Text>
          <Pressable onPress={() => router.replace('/(auth)/login')}>
            <Text
              style={[styles.footerLink, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}
            >
              {t('signIn')}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 24 },
  confirmContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 18,
  },
  confirmIcon: {
    width: 100,
    height: 100,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  confirmTitle: { fontSize: 26, textAlign: 'center' },
  confirmBody: { fontSize: 16, textAlign: 'center', lineHeight: 24 },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 4,
  },
  tipText: { fontSize: 13, lineHeight: 18, flex: 1 },
  backToSignIn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  backToSignInText: { color: '#fff', fontSize: 16 },
  backBtn: { marginBottom: 24 },
  header: { marginBottom: 32, gap: 6 },
  title: { fontSize: 28 },
  subtitle: { fontSize: 16 },
  form: { gap: 18, marginBottom: 32 },
  fieldWrap: { gap: 8 },
  label: { fontSize: 14 },
  roleRow: { flexDirection: 'row', gap: 10 },
  roleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 8,
  },
  roleLabel: { fontSize: 14, flex: 1 },
  roleCheck: { marginLeft: 'auto' },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  input: { flex: 1, fontSize: 16 },
  signUpBtn: { paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 8 },
  signUpText: { color: '#fff', fontSize: 17 },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { fontSize: 15 },
  footerLink: { fontSize: 15 },
});
