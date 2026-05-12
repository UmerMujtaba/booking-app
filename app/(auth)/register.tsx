import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/features/auth/AuthContext";
import { UserRole } from "@/features/auth/types";
import { useColors } from "@/hooks/useColors";
import { useTranslation } from "@/hooks/useTranslation";
import { rs, normalize } from "@/lib/responsive";

export default function RegisterScreen() {
  const { signUp, needsEmailConfirm } = useAuth();
  const colors = useColors();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Exclude<UserRole, "admin">>("customer");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSignUp = async () => {
    if (!fullName || !email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }
    try {
      setLoading(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await signUp(email.trim().toLowerCase(), password, fullName.trim(), role);
      router.replace("/");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Registration failed";
      console.log("🚀 ~ handleSignUp ~ err:", err);
      console.log("🚀 ~ handleSignUp ~ message:", message);
      Alert.alert("Sign Up Failed", message);
    } finally {
      setLoading(false);
    }
  };

  // Email confirmation pending screen
  if (needsEmailConfirm) {
    return (
      <View
        style={[
          styles.confirmContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <View
          style={[
            styles.confirmIcon,
            { backgroundColor: colors.primary + "18" },
          ]}
        >
          <Feather name="mail" size={rs(48)} color={colors.primary} />
        </View>
        <Text
          style={[
            styles.confirmTitle,
            { color: colors.text, fontFamily: "Inter_700Bold" },
          ]}
        >
          Check Your Email
        </Text>
        <Text
          style={[
            styles.confirmBody,
            { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
          ]}
        >
          A confirmation link has been sent to{"\n"}
          <Text
            style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}
          >
            {email}
          </Text>
          {"\n\n"}
          Click the link in that email to activate your account, then come back
          and sign in.
        </Text>
        <View
          style={[
            styles.tipBox,
            {
              backgroundColor: colors.accent + "14",
              borderColor: colors.accent + "30",
            },
          ]}
        >
          <Feather name="zap" size={rs(14)} color={colors.accent} />
          <Text
            style={[
              styles.tipText,
              { color: colors.accent, fontFamily: "Inter_400Regular" },
            ]}
          >
            Tip: Disable "Confirm email" in your Supabase Auth settings to skip
            this step during development.
          </Text>
        </View>
        <Pressable
          style={[styles.backToSignIn, { backgroundColor: colors.primary }]}
          onPress={() => router.replace("/(auth)/login")}
        >
          <Text
            style={[
              styles.backToSignInText,
              { fontFamily: "Inter_600SemiBold" },
            ]}
          >
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
    value: Exclude<UserRole, "admin">;
    label: string;
    icon: string;
  }) => (
    <Pressable
      style={[
        styles.roleOption,
        {
          backgroundColor: role === value ? colors.primary + "12" : colors.card,
          borderColor: role === value ? colors.primary : colors.border,
        },
      ]}
      onPress={() => setRole(value)}
    >
      <Feather
        name={icon as keyof typeof Feather.glyphMap}
        size={rs(22)}
        color={role === value ? colors.primary : colors.mutedForeground}
      />
      <Text
        style={[
          styles.roleLabel,
          {
            color: role === value ? colors.primary : colors.text,
            fontFamily:
              role === value ? "Inter_600SemiBold" : "Inter_400Regular",
          },
        ]}
      >
        {label}
      </Text>
      {role === value && (
        <Feather
          name="check-circle"
          size={rs(18)}
          color={colors.primary}
          style={styles.roleCheck}
        />
      )}
    </Pressable>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: insets.top + rs(20),
            paddingBottom: insets.bottom + rs(24),
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={rs(22)} color={colors.text} />
        </Pressable>

        <View style={styles.header}>
          <Text
            style={[
              styles.title,
              { color: colors.text, fontFamily: "Inter_700Bold" },
            ]}
          >
            {t("signUp")}
          </Text>
          <Text
            style={[
              styles.subtitle,
              { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
            ]}
          >
            Join thousands of happy customers
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.fieldWrap}>
            <Text
              style={[
                styles.label,
                { color: colors.text, fontFamily: "Inter_500Medium" },
              ]}
            >
              {t("chooseRole")}
            </Text>
            <View style={styles.roleRow}>
              <RoleOption value="customer" label={t("customer")} icon="user" />
              <RoleOption value="owner" label={t("owner")} icon="briefcase" />
              {/* <RoleOption value="admin" label={t('admin')} icon="lock" /> */}
            </View>
          </View>

          <View style={styles.fieldWrap}>
            <Text
              style={[
                styles.label,
                { color: colors.text, fontFamily: "Inter_500Medium" },
              ]}
            >
              {t("fullName")}
            </Text>
            <View
              style={[
                styles.inputWrap,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Feather
                name="user"
                size={rs(18)}
                color={colors.mutedForeground}
              />
              <TextInput
                style={[
                  styles.input,
                  { color: colors.text, fontFamily: "Inter_400Regular" },
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
            <Text
              style={[
                styles.label,
                { color: colors.text, fontFamily: "Inter_500Medium" },
              ]}
            >
              {t("email")}
            </Text>
            <View
              style={[
                styles.inputWrap,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Feather
                name="mail"
                size={rs(18)}
                color={colors.mutedForeground}
              />
              <TextInput
                style={[
                  styles.input,
                  { color: colors.text, fontFamily: "Inter_400Regular" },
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
            <Text
              style={[
                styles.label,
                { color: colors.text, fontFamily: "Inter_500Medium" },
              ]}
            >
              {t("password")}
            </Text>
            <View
              style={[
                styles.inputWrap,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Feather
                name="lock"
                size={rs(18)}
                color={colors.mutedForeground}
              />
              <TextInput
                style={[
                  styles.input,
                  { color: colors.text, fontFamily: "Inter_400Regular" },
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
                  name={showPassword ? "eye-off" : "eye"}
                  size={rs(18)}
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
            <Text
              style={[styles.signUpText, { fontFamily: "Inter_600SemiBold" }]}
            >
              {loading ? t("creatingAccount") : t("signUp")}
            </Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text
            style={[
              styles.footerText,
              { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
            ]}
          >
            {t("hasAccount")}{" "}
          </Text>
          <Pressable onPress={() => router.replace("/(auth)/login")}>
            <Text
              style={[
                styles.footerLink,
                { color: colors.primary, fontFamily: "Inter_600SemiBold" },
              ]}
            >
              {t("signIn")}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: rs(24) },
  confirmContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: rs(32),
    gap: rs(18),
  },
  confirmIcon: {
    width: rs(100),
    height: rs(100),
    borderRadius: rs(28),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: rs(8),
  },
  confirmTitle: { fontSize: normalize(26), textAlign: "center" },
  confirmBody: {
    fontSize: normalize(16),
    textAlign: "center",
    lineHeight: rs(24),
  },
  tipBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: rs(8),
    padding: rs(14),
    borderRadius: rs(12),
    borderWidth: 1,
    marginVertical: rs(4),
  },
  tipText: { fontSize: normalize(13), lineHeight: rs(18), flex: 1 },
  backToSignIn: {
    paddingHorizontal: rs(32),
    paddingVertical: rs(14),
    borderRadius: rs(14),
    marginTop: rs(8),
  },
  backToSignInText: { color: "#fff", fontSize: normalize(16) },
  backBtn: { marginBottom: rs(24) },
  header: { marginBottom: rs(32), gap: rs(6) },
  title: { fontSize: normalize(28) },
  subtitle: { fontSize: normalize(16) },
  form: { gap: rs(18), marginBottom: rs(32) },
  fieldWrap: { gap: rs(8), marginTop: rs(4) },
  label: { fontSize: normalize(14) },
  roleRow: { flexDirection: "row", gap: rs(10) },
  roleOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: rs(14),
    borderRadius: rs(12),
    borderWidth: 1.5,
    gap: rs(8),
  },
  roleLabel: { fontSize: normalize(13), flex: 1 },
  roleCheck: { marginLeft: "auto" },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: rs(12),
    borderWidth: 1,
    paddingHorizontal: rs(14),
    paddingVertical: rs(4),
    gap: rs(10),
  },
  input: { flex: 1, fontSize: normalize(14) },
  signUpBtn: {
    paddingVertical: rs(16),
    borderRadius: rs(14),
    alignItems: "center",
    marginTop: rs(8),
  },
  signUpText: { color: "#fff", fontSize: normalize(17) },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: { fontSize: normalize(15) },
  footerLink: { fontSize: normalize(15) },
});
