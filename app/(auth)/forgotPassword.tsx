import { Feather } from "@expo/vector-icons";
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
import { router } from "expo-router";
import { rs, normalize } from "@/lib/responsive";

export default function ForgotPasswordScreen() {
  const { signIn, resetPassword } = useAuth();
  const colors = useColors();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handlePasswordReset = async () => {
    if (!email) {
      Alert.alert(t("error"), t("emailRequired"));
      return;
    }
    try {
      setLoading(true);
      await resetPassword(email);
      Alert.alert(t("success"), t("resetLinkSent"));
      router.back();
    } catch (error: any) {
      Alert.alert(t("error"), error.message || t("resetFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + rs(60), paddingBottom: insets.bottom + rs(24) },
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
            {t("resetPassword")}
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
              <Feather name="mail" size={rs(18)} color={colors.mutedForeground} />
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

          <Pressable
            style={({ pressed }) => [
              styles.signInBtn,
              {
                backgroundColor: colors.primary,
                opacity: pressed || loading ? 0.85 : 1,
              },
            ]}
            onPress={handlePasswordReset}
            disabled={loading}
          >
            <Text
              style={[styles.signInText, { fontFamily: "Inter_600SemiBold" }]}
            >
              {loading ? t("sending") : t("sendResetLink")}
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
    paddingVertical: rs(14),
    gap: rs(10),
  },
  input: { flex: 1, fontSize: normalize(16) },
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
  footerText: { fontSize: normalize(15) },
  footerLink: { fontSize: normalize(15) },
});
