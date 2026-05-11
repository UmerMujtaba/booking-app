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
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { rs, normalize } from "@/lib/responsive";
import { supabase } from "@/lib/supabase";

import { useAuth } from "@/features/auth/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useTranslation } from "@/hooks/useTranslation";

export default function CustomerProfileScreen() {
  const { profile, signOut, refreshProfile } = useAuth();
  // console.log("🚀 ~ afsaksmfkmakfmksamf ~ profile:", profile);

  const colors = useColors();
  const { t, language, setLanguage } = useTranslation();
  const insets = useSafeAreaInsets();

  const [isPhoneModalVisible, setIsPhoneModalVisible] = React.useState(false);
  const [newPhone, setNewPhone] = React.useState("");
  const [isUpdating, setIsUpdating] = React.useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const handleUpdatePhone = async () => {
    if (!profile?.id) return;
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ phone: newPhone })
        .eq("id", profile.id);

      if (error) throw error;

      await refreshProfile();
      setIsPhoneModalVisible(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update phone number");
    } finally {
      setIsUpdating(false);
    }
  };

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
          label={"Phone Number"}
          value={profile?.phone ?? "Not set"}
          colors={colors}
          onPress={() => {
            setNewPhone(profile?.phone ?? "");
            setIsPhoneModalVisible(true);
          }}
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
        <Feather name="log-out" size={rs(18)} color={colors.destructive} />
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

      <Modal
        visible={isPhoneModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsPhoneModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => !isUpdating && setIsPhoneModalVisible(false)}
          />
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text
              style={[
                styles.modalTitle,
                { color: colors.text, fontFamily: "Inter_600SemiBold" },
              ]}
            >
              {t("updatePhone")}
            </Text>
            <Text
              style={[
                styles.modalSubtitle,
                {
                  color: colors.mutedForeground,
                  fontFamily: "Inter_400Regular",
                },
              ]}
            >
              Enter your mobile number to receive updates about your bookings.
            </Text>

            <TextInput
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                  fontFamily: "Inter_400Regular",
                },
              ]}
              value={newPhone}
              onChangeText={setNewPhone}
              placeholder="+923xxxxxxxxx"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="phone-pad"
              autoFocus
            />

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalBtn, { borderColor: colors.border }]}
                onPress={() => setIsPhoneModalVisible(false)}
                disabled={isUpdating}
              >
                <Text
                  style={[
                    styles.modalBtnText,
                    {
                      color: colors.mutedForeground,
                      fontFamily: "Inter_500Medium",
                    },
                  ]}
                >
                  {t("cancel")}
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalBtn,
                  styles.modalBtnPrimary,
                  { backgroundColor: colors.primary },
                ]}
                onPress={handleUpdatePhone}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text
                    style={[
                      styles.modalBtnText,
                      { color: "#fff", fontFamily: "Inter_600SemiBold" },
                    ]}
                  >
                    {t("save")}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

function SettingRow({
  icon,
  label,
  value,
  colors,
  onPress,
}: {
  icon: string;
  label: string;
  value: string;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
  onPress?: () => void;
}) {
  const Content = (
    <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
      <Feather
        name={icon as keyof typeof Feather.glyphMap}
        size={rs(18)}
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
      {onPress && (
        <Feather
          name="chevron-right"
          size={rs(16)}
          color={colors.mutedForeground}
          style={{ marginLeft: 4 }}
        />
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
      >
        {Content}
      </Pressable>
    );
  }

  return Content;
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: rs(20), gap: rs(20) },
  title: { fontSize: normalize(26), marginBottom: rs(4) },
  avatarSection: { alignItems: "center", gap: rs(10), marginVertical: rs(8) },
  avatar: {
    width: rs(80),
    height: rs(80),
    borderRadius: rs(40),
    alignItems: "center",
    justifyContent: "center",
  },
  initials: { color: "#fff", fontSize: normalize(28) },
  name: { fontSize: normalize(20) },
  roleBadge: { paddingHorizontal: rs(12), paddingVertical: rs(5), borderRadius: rs(20) },
  roleText: { fontSize: normalize(13) },
  section: { borderRadius: rs(14), overflow: "hidden" },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(12),
    paddingVertical: rs(14),
    borderBottomWidth: 1,
  },
  settingLabel: { fontSize: normalize(14), width: rs(60) },
  settingValue: { fontSize: normalize(15), flex: 1, textAlign: "right" },
  card: { borderRadius: rs(14), borderWidth: 1, padding: rs(16), gap: rs(12) },
  sectionLabel: { fontSize: normalize(13) },
  langRow: { flexDirection: "row", gap: rs(10) },
  langBtn: {
    flex: 1,
    paddingVertical: rs(10),
    alignItems: "center",
    borderRadius: rs(10),
    borderWidth: 1,
  },
  langText: { fontSize: normalize(15) },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: rs(10),
    paddingVertical: rs(15),
    borderRadius: rs(14),
    borderWidth: 1,
    marginTop: rs(8),
  },
  signOutText: { fontSize: normalize(16) },
  version: { textAlign: "center", fontSize: normalize(13) },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: rs(20),
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    width: "100%",
    maxWidth: rs(400),
    borderRadius: rs(20),
    padding: rs(24),
    borderWidth: 1,
    gap: rs(16),
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: rs(3.84),
  },
  modalTitle: { fontSize: normalize(20) },
  modalSubtitle: { fontSize: normalize(14), lineHeight: rs(20), marginBottom: rs(4) },
  input: {
    height: rs(50),
    borderWidth: 1,
    borderRadius: rs(12),
    paddingHorizontal: rs(16),
    fontSize: normalize(16),
  },
  modalButtons: {
    flexDirection: "row",
    gap: rs(12),
    marginTop: rs(8),
  },
  modalBtn: {
    flex: 1,
    height: rs(48),
    borderRadius: rs(12),
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  modalBtnPrimary: { borderWidth: 0 },
  modalBtnText: { fontSize: normalize(15) },
});
