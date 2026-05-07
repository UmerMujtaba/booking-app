import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/features/auth/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useTranslation } from "@/hooks/useTranslation";

export default function CustomerProfileScreen() {
  const { profile, signOut } = useAuth();
  console.log("🚀 ~ afsaksmfkmakfmksamf ~ profile:", profile);

  const colors = useColors();
  const { t, language, setLanguage } = useTranslation();
  const insets = useSafeAreaInsets();

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const handleSignOut = () => {
    Alert.alert(t("signOut"), "Are you sure you want to sign out?", [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("signOut"),
        style: "destructive",
        onPress: async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          await signOut();
        },
      },
    ]);
  };

  const initials =
    profile?.full_name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? "?";

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.container,
        { paddingTop: topPad + 12, paddingBottom: insets.bottom + 32 },
      ]}
    >
      <Text
        style={[
          styles.title,
          { color: colors.text, fontFamily: "Inter_700Bold" },
        ]}
      >
        {t("profile")}
      </Text>

      <View style={styles.avatarSection}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={[styles.initials, { fontFamily: "Inter_700Bold" }]}>
            {initials}
          </Text>
        </View>
        <Text
          style={[
            styles.name,
            { color: colors.text, fontFamily: "Inter_600SemiBold" },
          ]}
        >
          {profile?.full_name}
        </Text>
        <View
          style={[styles.roleBadge, { backgroundColor: colors.primary + "14" }]}
        >
          <Text
            style={[
              styles.roleText,
              { color: colors.primary, fontFamily: "Inter_500Medium" },
            ]}
          >
            {t("customer")}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <SettingRow
          icon="mail"
          label="Email"
          value={profile?.email ?? ""}
          colors={colors}
        />
        <SettingRow
          icon="phone"
          label={t("phone")}
          value={profile?.phone ?? "Not set"}
          colors={colors}
        />
      </View>

      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text
          style={[
            styles.sectionLabel,
            { color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
          ]}
        >
          {t("language")}
        </Text>
        <View style={styles.langRow}>
          {(["en", "ur"] as const).map((lang) => (
            <Pressable
              key={lang}
              style={[
                styles.langBtn,
                {
                  backgroundColor:
                    language === lang ? colors.primary : colors.muted,
                  borderColor:
                    language === lang ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setLanguage(lang)}
            >
              <Text
                style={[
                  styles.langText,
                  {
                    color: language === lang ? "#fff" : colors.text,
                    fontFamily:
                      language === lang
                        ? "Inter_600SemiBold"
                        : "Inter_400Regular",
                  },
                ]}
              >
                {lang === "en" ? t("english") : t("urdu")}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.signOutBtn,
          {
            backgroundColor: colors.destructive + "12",
            borderColor: colors.destructive + "30",
            opacity: pressed ? 0.8 : 1,
          },
        ]}
        onPress={handleSignOut}
      >
        <Feather name="log-out" size={18} color={colors.destructive} />
        <Text
          style={[
            styles.signOutText,
            { color: colors.destructive, fontFamily: "Inter_600SemiBold" },
          ]}
        >
          {t("signOut")}
        </Text>
      </Pressable>

      <Text
        style={[
          styles.version,
          { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
        ]}
      >
        {t("appVersion")} 1.0.0
      </Text>
    </ScrollView>
  );
}

function SettingRow({
  icon,
  label,
  value,
  colors,
}: {
  icon: string;
  label: string;
  value: string;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  return (
    <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
      <Feather
        name={icon as keyof typeof Feather.glyphMap}
        size={18}
        color={colors.mutedForeground}
      />
      <Text
        style={[
          styles.settingLabel,
          { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.settingValue,
          { color: colors.text, fontFamily: "Inter_500Medium" },
        ]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, gap: 20 },
  title: { fontSize: 26, marginBottom: 4 },
  avatarSection: { alignItems: "center", gap: 10, marginVertical: 8 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: { color: "#fff", fontSize: 28 },
  name: { fontSize: 20 },
  roleBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  roleText: { fontSize: 13 },
  section: { borderRadius: 14, overflow: "hidden" },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  settingLabel: { fontSize: 14, width: 60 },
  settingValue: { fontSize: 15, flex: 1, textAlign: "right" },
  card: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 12 },
  sectionLabel: { fontSize: 13 },
  langRow: { flexDirection: "row", gap: 10 },
  langBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
  },
  langText: { fontSize: 15 },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
  },
  signOutText: { fontSize: 16 },
  version: { textAlign: "center", fontSize: 13 },
});
