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
          { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 24 },
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
            <Feather name="calendar" size={40} color={colors.primary} />
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
              <Feather name="mail" size={18} color={colors.mutedForeground} />
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
  container: { flexGrow: 1, paddingHorizontal: 24 },
  header: { alignItems: "center", marginBottom: 40, gap: 12 },
  logoWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  title: { fontSize: 28 },
  subtitle: { fontSize: 16 },
  form: { gap: 18, marginBottom: 32 },
  fieldWrap: { gap: 6 },
  label: { fontSize: 14 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  input: { flex: 1, fontSize: 16 },
  signInBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
  },
  signInText: { color: "#fff", fontSize: 17 },
  forgotPasswordFooter: {
    flexDirection: "row",
    alignSelf: "flex-end",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: { fontSize: 15 },
  footerLink: { fontSize: 15 },
});
