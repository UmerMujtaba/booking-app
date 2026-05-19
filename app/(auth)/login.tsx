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
import { useColors } from "@/hooks/useColors";
import { useTranslation } from "@/hooks/useTranslation";
import { isIos, normalize, rs } from "@/lib/responsive";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const colors = useColors();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  // const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    try {
      setLoading(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await signIn(email.trim().toLowerCase(), password);
      router.replace("/");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Sign in failed";
      Alert.alert("Sign In Failed", message);
    } finally {
      setLoading(false);
    }
  };

  // const handlePhoneLogin = async () => {
  //   try {
  //     setLoading(true);

  //     const { data, error } = await supabase.auth.signInWithOtp({
  //       phone: "+923054034026",
  //     });

  //     if (error) {
  //       console.log(error.message);
  //       return;
  //     }

  //     console.log("OTP sent successfully");
  //   } catch (err) {
  //     console.log(err);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: insets.top + rs(60),
            paddingBottom: insets.bottom + rs(24),
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View
            style={[
              styles.logoWrap,
              { backgroundColor: colors.primary + "14" },
            ]}
          >
            <Feather name="calendar" size={rs(40)} color={colors.primary} />
          </View>
          <Text
            style={[
              styles.title,
              { color: colors.text, fontFamily: "Inter_700Bold" },
            ]}
          >
            {t("welcome")}
          </Text>
          <Text
            style={[
              styles.subtitle,
              { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
            ]}
          >
            Book local services with ease
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
                placeholder="••••••••"
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
            <View style={styles.forgotPasswordFooter}>
              <Pressable onPress={() => router.push("/forgotPassword")}>
                <Text
                  style={[
                    styles.footerPasswordLink,
                    {
                      color: colors.primary,
                      fontFamily: "Inter_600SemiBold",
                      alignSelf: "flex-end",
                    },
                  ]}
                >
                  {t("forgotPassword")}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* <TextInput
            placeholder="+923001234567"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoCapitalize="none"
            style={[
              styles.input,
              {
                borderColor: colors.border,
                color: colors.foreground,
                fontFamily: "Inter_400Regular",
              },
            ]}
            placeholderTextColor={colors.mutedForeground}
          /> */}
          <Pressable
            style={({ pressed }) => [
              styles.signInBtn,
              {
                backgroundColor: colors.primary,
                opacity: pressed || loading ? 0.85 : 1,
              },
            ]}
            onPress={handleSignIn}
            disabled={loading}
          >
            <Text
              style={[styles.signInText, { fontFamily: "Inter_600SemiBold" }]}
            >
              {loading ? t("signingIn") : t("signIn")}
            </Text>
          </Pressable>
          {/* <Pressable
            style={({ pressed }) => [
              styles.signInBtn,
              {
                backgroundColor: colors.primary,
                opacity: pressed || loading ? 0.85 : 1,
              },
            ]}
            onPress={handlePhoneLogin}
            disabled={loading}
          >
            <Text
              style={[styles.signInText, { fontFamily: "Inter_600SemiBold" }]}
            >
              {loading ? "Sending OTP..." : "Send OTP"}
            </Text>
          </Pressable> */}
        </View>

        <View style={styles.footer}>
          <Text
            style={[
              styles.footerText,
              { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
            ]}
          >
            {t("noAccount")}{" "}
          </Text>
          <Pressable onPress={() => router.push("/(auth)/register")}>
            <Text
              style={[
                styles.footerLink,
                { color: colors.primary, fontFamily: "Inter_600SemiBold" },
              ]}
            >
              {t("signUp")}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: rs(24) },
  header: { alignItems: "center", marginBottom: rs(40), gap: rs(12) },
  logoWrap: {
    width: rs(80),
    height: rs(80),
    borderRadius: rs(24),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: rs(8),
  },
  title: { fontSize: normalize(28) },
  subtitle: { fontSize: normalize(16) },
  form: { gap: rs(18), marginBottom: rs(32) },
  fieldWrap: { gap: rs(6) },
  label: { fontSize: normalize(14) },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: rs(12),
    borderWidth: 1,
    paddingHorizontal: rs(14),
    paddingVertical: isIos() ? rs(14) : rs(4),
    gap: rs(10),
  },
  input: { flex: 1, fontSize: normalize(14) },
  signInBtn: {
    paddingVertical: rs(16),
    borderRadius: rs(14),
    alignItems: "center",
    marginTop: rs(8),
  },
  signInText: { color: "#fff", fontSize: normalize(17) },
  forgotPasswordFooter: {
    flexDirection: "row",
    alignSelf: "flex-end",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: { fontSize: normalize(14) },
  footerLink: { fontSize: normalize(14) },
  footerPasswordLink: { fontSize: normalize(13) },
});
