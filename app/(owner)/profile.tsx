import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { logActivity } from "@/features/audit/logging";
import { useAuth } from "@/features/auth/AuthContext";
import { Business, BusinessUpdateRequest } from "@/features/booking/types";
import { useColors } from "@/hooks/useColors";
import { useTranslation } from "@/hooks/useTranslation";
import { supabase } from "@/lib/supabase";
import { styles } from "./styles";

const CATEGORIES = ["Barber", "Salon", "Spa", "Nails", "Massage", "Skincare"];

async function fetchOwnerBusiness(ownerId: string): Promise<Business | null> {
  const { data } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", ownerId)
    .single();

  return data as Business | null;
}

async function fetchLatestUpdateRequest(
  ownerId: string,
): Promise<BusinessUpdateRequest | null> {
  const { data, error } = await supabase
    .from("business_update_requests")
    .select("*")
    .eq("requested_by", ownerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as BusinessUpdateRequest | null;
}

interface BizForm {
  name: string;
  category: string;
  bio: string;
}

export default function OwnerProfileScreen() {
  const { user, profile, signOut } = useAuth();
  const colors = useColors();
  const { t, language, setLanguage } = useTranslation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data: business, isLoading } = useQuery({
    queryKey: ["owner-business", user?.id],
    queryFn: () => fetchOwnerBusiness(user!.id),
    enabled: !!user?.id,
  });

  const { data: latestUpdateRequest } = useQuery({
    queryKey: ["owner-business-update-request", user?.id],
    queryFn: () => fetchLatestUpdateRequest(user!.id),
    enabled: !!user?.id,
  });

  const [form, setForm] = useState<BizForm>({
    name: "",
    category: "Barber",
    bio: "",
  });

  useEffect(() => {
    if (business) {
      setForm({
        name: business.name,
        category: business.category,
        bio: business.bio ?? "",
      });
    }
  }, [business]);

  const { mutate: requestBusinessUpdate, isPending: saving } = useMutation({
    mutationFn: async () => {
      // if (!business)
      //   throw new Error("Your business must be registered by an admin first.");
      if (!form.name.trim()) throw new Error("Business name is required");

      const { error } = await supabase.from("business_update_requests").insert({
        business_id: business?.id,
        requested_by: user!.id,
        proposed_name: form.name.trim(),
        proposed_category: form.category.trim(),
        proposed_bio: form.bio.trim(),
      });
      if (error) throw error;

      await logActivity({
        action: "business_update_requested",
        entityType: "business",
        entityId: business?.id,
      });
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({
        queryKey: ["owner-business-update-request"],
      });
      Alert.alert(
        "Submitted",
        "Your changes were submitted for admin approval.",
      );
    },
    onError: (err: unknown) => {
      console.log("🚀 ~ OwnerProfileScreen ~ err:", err);
      return Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Request failed",
      );
    },
  });

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: topPad + 12, paddingBottom: insets.bottom + 60 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={[
            styles.title,
            { color: colors.text, fontFamily: "Inter_700Bold" },
          ]}
        >
          {t("myBusiness")}
        </Text>

        <View style={styles.ownerCard}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={[styles.initials, { fontFamily: "Inter_700Bold" }]}>
              {profile?.full_name
                ?.split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2) ?? "?"}
            </Text>
          </View>
          <View>
            <Text
              style={[
                styles.ownerName,
                { color: colors.text, fontFamily: "Inter_600SemiBold" },
              ]}
            >
              {profile?.full_name}
            </Text>
            <View
              style={[
                styles.roleBadge,
                { backgroundColor: colors.accent + "18" },
              ]}
            >
              <Text
                style={[
                  styles.roleText,
                  { color: colors.accent, fontFamily: "Inter_500Medium" },
                ]}
              >
                {t("owner")}
              </Text>
            </View>
            <Text
              style={[
                styles.ownerEmail,
                { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
              ]}
            >
              {profile?.email}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text
            style={[
              styles.cardTitle,
              { color: colors.text, fontFamily: "Inter_700Bold" },
            ]}
          >
            {business
              ? "Request Business Profile Update"
              : "Business Registration"}
          </Text>
          {!business && (
            <Text style={{ color: colors.mutedForeground }}>
              Businesses are registered by admins only. Contact an admin to
              create your business profile.
            </Text>
          )}

          <View style={styles.field}>
            <Text
              style={[
                styles.label,
                { color: colors.text, fontFamily: "Inter_500Medium" },
              ]}
            >
              {t("businessName")}
            </Text>
            <View
              style={[
                styles.inputWrap,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                },
              ]}
            >
              <Feather
                name="briefcase"
                size={16}
                color={colors.mutedForeground}
              />
              <TextInput
                style={[
                  styles.input,
                  { color: colors.text, fontFamily: "Inter_400Regular" },
                ]}
                value={form.name}
                onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                placeholder="e.g. Ahmed's Barbershop"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text
              style={[
                styles.label,
                { color: colors.text, fontFamily: "Inter_500Medium" },
              ]}
            >
              {t("category")}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.catRow}
            >
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat}
                  style={[
                    styles.catChip,
                    {
                      backgroundColor:
                        form.category === cat ? colors.primary : colors.muted,
                      borderColor:
                        form.category === cat ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setForm((f) => ({ ...f, category: cat }))}
                >
                  <Text
                    style={[
                      styles.catText,
                      {
                        color: form.category === cat ? "#fff" : colors.text,
                        fontFamily:
                          form.category === cat
                            ? "Inter_600SemiBold"
                            : "Inter_400Regular",
                      },
                    ]}
                  >
                    {cat}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <View style={styles.field}>
            <Text
              style={[
                styles.label,
                { color: colors.text, fontFamily: "Inter_500Medium" },
              ]}
            >
              {t("bio")}
            </Text>
            <View
              style={[
                styles.textAreaWrap,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                },
              ]}
            >
              <TextInput
                style={[
                  styles.textArea,
                  { color: colors.text, fontFamily: "Inter_400Regular" },
                ]}
                value={form.bio}
                onChangeText={(v) => setForm((f) => ({ ...f, bio: v }))}
                placeholder="Tell customers about your business..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={4}
              />
            </View>
          </View>

          {!business?.approved && (
            <Pressable
              style={({ pressed }) => [
                styles.saveBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: pressed || saving || !business ? 0.85 : 1,
                },
              ]}
              onPress={() => requestBusinessUpdate()}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text
                  style={[styles.saveBtnText, { fontFamily: "Inter_700Bold" }]}
                >
                  {"Submit for Approval"}
                </Text>
              )}
            </Pressable>
          )}
          {latestUpdateRequest?.status === "pending" && (
            <Text style={{ color: colors.accent }}>
              A previous update request is still pending admin approval.
            </Text>
          )}
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text
            style={[
              styles.cardTitle,
              { color: colors.text, fontFamily: "Inter_700Bold" },
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
          onPress={() =>
            Alert.alert(t("signOut"), "Sign out of your account?", [
              { text: t("cancel"), style: "cancel" },
              { text: t("signOut"), style: "destructive", onPress: signOut },
            ])
          }
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
