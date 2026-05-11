import { Feather } from "@expo/vector-icons";
import { Redirect, router } from "expo-router";
import React from "react";
import { StyleSheet, Pressable, Text, View } from "react-native";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useAuth } from "@/features/auth/AuthContext";
import { useColors } from "@/hooks/useColors";
import { rs, normalize } from "@/lib/responsive";

export default function Index() {
  const { user, profile, loading, isRecovering, signOut } = useAuth();
  const colors = useColors();

  if (loading || isRecovering) return <LoadingScreen />;
  if (!user) return <Redirect href="/(auth)/login" />;

  // Authenticated but no profile — migration hasn't been run yet
  if (!profile) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: colors.destructive + "14" },
          ]}
        >
          <Feather name="alert-triangle" size={rs(40)} color={colors.destructive} />
        </View>
        <Text
          style={[
            styles.title,
            { color: colors.text, fontFamily: "Inter_700Bold" },
          ]}
        >
          Database Not Set Up
        </Text>
        <Text
          style={[
            styles.body,
            { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
          ]}
        >
          Your account was created but the database schema hasn't been applied
          yet.
        </Text>
        <View
          style={[
            styles.stepBox,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text
            style={[
              styles.stepTitle,
              { color: colors.text, fontFamily: "Inter_600SemiBold" },
            ]}
          >
            Run the SQL migration:
          </Text>
          <Text
            style={[
              styles.step,
              { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
            ]}
          >
            1. Open your Supabase dashboard{"\n"}
            2. Go to SQL Editor{"\n"}
            3. Run the file:{"\n"}
            <Text
              style={{ fontFamily: "Inter_600SemiBold", color: colors.primary }}
            >
              supabase/migrations/001_initial_schema.sql
            </Text>
          </Text>
        </View>
        <Pressable
          style={[styles.retryBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.replace("/")}
        >
          <Text style={[styles.retryText, { fontFamily: "Inter_600SemiBold" }]}>
            Try Again
          </Text>
        </Pressable>
        <Pressable style={styles.signOutLink} onPress={signOut}>
          <Text
            style={[
              styles.signOutText,
              { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
            ]}
          >
            Sign out and try a different account
          </Text>
        </Pressable>
      </View>
    );
  }

  if (profile?.role === "admin") return <Redirect href="/(admin)" />;
  if (profile?.role === "owner") return <Redirect href="/(owner)" />;
  return <Redirect href="/(customer)" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: rs(32),
    gap: rs(16),
  },
  iconWrap: {
    width: rs(80),
    height: rs(80),
    borderRadius: rs(24),
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: normalize(22), textAlign: "center" },
  body: { fontSize: normalize(15), textAlign: "center", lineHeight: rs(22) },
  stepBox: {
    borderRadius: rs(14),
    borderWidth: 1,
    padding: rs(18),
    gap: rs(10),
    width: "100%",
  },
  stepTitle: { fontSize: normalize(15) },
  step: { fontSize: normalize(14), lineHeight: rs(22) },
  retryBtn: { paddingHorizontal: rs(32), paddingVertical: rs(14), borderRadius: rs(12) },
  retryText: { color: "#fff", fontSize: normalize(16) },
  signOutLink: { marginTop: rs(8) },
  signOutText: { fontSize: normalize(14), textDecorationLine: "underline" },
});
