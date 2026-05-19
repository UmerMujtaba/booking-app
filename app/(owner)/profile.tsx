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
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import * as ImagePicker from "expo-image-picker";

import { logActivity } from "@/features/audit/logging";
import { useAuth } from "@/features/auth/AuthContext";
import { Business, BusinessUpdateRequest } from "@/features/booking/types";
import { useColors } from "@/hooks/useColors";
import { useTranslation } from "@/hooks/useTranslation";
import { supabase } from "@/lib/supabase";
import { uploadToSupabase } from "@/lib/supabase-storage";

import { Image } from "expo-image";
import { rs, normalize } from "@/lib/responsive";

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
  address: string;
  cnic_front_image: string;
  cnic_back_image: string;
  opening_time: string;
  closing_time: string;
}

export default function OwnerProfileScreen() {
  const { user, profile, signOut } = useAuth();
  const colors = useColors();
  const { t, language, setLanguage } = useTranslation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [uploading, setUploading] = useState<string | null>(null);
  const [localPreviews, setLocalPreviews] = useState<Record<string, string>>(
    {},
  );

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
    address: "",
    cnic_front_image: "",
    cnic_back_image: "",
    opening_time: "09:00",
    closing_time: "21:00",
  });

  useEffect(() => {
    if (business) {
      setForm({
        name: business.name,
        category: business.category,
        bio: business.bio ?? "",
        address: business.address ?? "",
        cnic_front_image: business.cnic_front_image ?? "",
        cnic_back_image: business.cnic_back_image ?? "",
        opening_time: business.opening_time?.slice(0, 5) ?? "09:00",
        closing_time: business.closing_time?.slice(0, 5) ?? "21:00",
      });
    }
  }, [business]);

  const handleImagePick = async (
    field: "cnic_front_image" | "cnic_back_image",
  ) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Denied",
        "We need access to your gallery to upload CNIC images.",
      );
      return;
    }

    Alert.alert("Upload CNIC Image", "Select source", [
      {
        text: "Camera",
        onPress: async () => {
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: "images",
            quality: 0.8,
          });
          if (!result.canceled) {
            const uri = result.assets[0].uri;
            setLocalPreviews((prev) => ({ ...prev, [field]: uri }));
            uploadImage(uri, field);
          }
        },
      },
      {
        text: "Gallery",
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: "images",
            quality: 0.8,
          });
          if (!result.canceled) {
            const uri = result.assets[0].uri;
            setLocalPreviews((prev) => ({ ...prev, [field]: uri }));
            uploadImage(uri, field);
          }
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const uploadImage = async (uri: string, field: string) => {
    try {
      setUploading(field);
      const url = await uploadToSupabase(uri);
      console.log(`✅ Uploaded ${field} to Supabase:`, url);
      setForm((f) => ({ ...f, [field]: url }));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error(`❌ Upload error for ${field}:`, err);
      Alert.alert("Upload Failed", "Could not upload image to Supabase.");
    } finally {
      setUploading(null);
    }
  };

  const { mutate: requestBusinessUpdate, isPending: saving } = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Business name is required");
      if (!form.address.trim()) throw new Error("Address is required");
      if (!form.cnic_front_image)
        throw new Error("CNIC front image is required");
      if (!form.cnic_back_image) throw new Error("CNIC back image is required");
      if (!form.opening_time) throw new Error("Opening time is required");
      if (!form.closing_time) throw new Error("Closing time is required");

      const [oH, oM] = form.opening_time.split(":").map(Number);
      const [cH, cM] = form.closing_time.split(":").map(Number);
      if (cH < oH || (cH === oH && cM <= oM)) {
        throw new Error("Closing time must be later than opening time");
      }

      const { error } = await supabase.from("business_update_requests").insert({
        business_id: business?.id,
        requested_by: user!.id,
        proposed_name: form.name.trim(),
        proposed_category: form.category.trim(),
        proposed_bio: form.bio.trim(),
        proposed_address: form.address.trim(),
        proposed_cnic_front_image: form.cnic_front_image,
        proposed_cnic_back_image: form.cnic_back_image,
        proposed_opening_time: form.opening_time,
        proposed_closing_time: form.closing_time,
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

  const { mutate: acknowledgeRejection, isPending: acknowledging } =
    useMutation({
      mutationFn: async () => {
        if (!latestUpdateRequest) return;
        const { error } = await supabase
          .from("business_update_requests")
          .update({ status: "acknowledged" })
          .eq("id", latestUpdateRequest.id);
        if (error) throw error;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["owner-business-update-request"],
        });
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
          {
            paddingTop: topPad + rs(12),
            paddingBottom: insets.bottom + rs(60),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={[
            styles.title,
            {
              color: colors.text,
              fontFamily: "Inter_700Bold",
              fontSize: normalize(24),
            },
          ]}
        >
          {t("myBusiness")}
        </Text>

        <View style={styles.ownerCard}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text
              style={[
                styles.initials,
                { fontFamily: "Inter_700Bold", fontSize: normalize(18) },
              ]}
            >
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
                {
                  color: colors.text,
                  fontFamily: "Inter_600SemiBold",
                  fontSize: normalize(16),
                },
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
                  {
                    color: colors.accent,
                    fontFamily: "Inter_500Medium",
                    fontSize: normalize(12),
                  },
                ]}
              >
                {t("owner")}
              </Text>
            </View>
            <Text
              style={[
                styles.ownerEmail,
                {
                  color: colors.mutedForeground,
                  fontFamily: "Inter_400Regular",
                  fontSize: normalize(14),
                },
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
              {
                color: colors.text,
                fontFamily: "Inter_700Bold",
                fontSize: normalize(18),
              },
            ]}
          >
            {business ? "Business Profile" : "Business Registration"}
          </Text>

          {latestUpdateRequest?.status === "pending" ? (
            <View style={{ gap: rs(16) }}>
              <View
                style={[
                  styles.detailBox,
                  {
                    backgroundColor: colors.primary + "08",
                    borderColor: colors.primary + "30",
                    borderWidth: 1,
                  },
                ]}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: rs(8),
                  }}
                >
                  <Feather name="clock" size={rs(18)} color={colors.primary} />
                  <Text
                    style={{
                      color: colors.primary,
                      fontFamily: "Inter_600SemiBold",
                      fontSize: normalize(14),
                    }}
                  >
                    Submitted for Approval
                  </Text>
                </View>
                <Text
                  style={{
                    color: colors.mutedForeground,
                    marginTop: rs(4),
                    fontSize: normalize(14),
                  }}
                >
                  Your request is being reviewed by an admin. You cannot make
                  changes until it is approved or rejected.
                </Text>
              </View>

              <View style={styles.detailBox}>
                <Text style={[styles.detailLabel, { fontSize: normalize(12) }]}>
                  Proposed Name
                </Text>
                <Text
                  style={[
                    styles.detailText,
                    { color: colors.text, fontSize: normalize(14) },
                  ]}
                >
                  {latestUpdateRequest.proposed_name}
                </Text>

                <Text style={[styles.detailLabel, { fontSize: normalize(12) }]}>
                  Proposed Category
                </Text>
                <Text
                  style={[
                    styles.detailText,
                    { color: colors.text, fontSize: normalize(14) },
                  ]}
                >
                  {latestUpdateRequest.proposed_category}
                </Text>

                <Text style={[styles.detailLabel, { fontSize: normalize(12) }]}>
                  Proposed Address
                </Text>
                <Text
                  style={[
                    styles.detailText,
                    { color: colors.text, fontSize: normalize(14) },
                  ]}
                >
                  {latestUpdateRequest.proposed_address}
                </Text>

                <Text style={[styles.detailLabel, { fontSize: normalize(12) }]}>
                  Operating Hours
                </Text>
                <Text
                  style={[
                    styles.detailText,
                    { color: colors.text, fontSize: normalize(14) },
                  ]}
                >
                  {latestUpdateRequest.proposed_opening_time?.slice(0, 5)} -{" "}
                  {latestUpdateRequest.proposed_closing_time?.slice(0, 5)}
                </Text>
              </View>
            </View>
          ) : latestUpdateRequest?.status === "rejected" ? (
            <View style={{ gap: rs(16) }}>
              <View
                style={[
                  styles.detailBox,
                  {
                    backgroundColor: colors.destructive + "08",
                    borderColor: colors.destructive + "30",
                    borderWidth: 1,
                  },
                ]}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: rs(8),
                  }}
                >
                  <Feather
                    name="alert-circle"
                    size={rs(18)}
                    color={colors.destructive}
                  />
                  <Text
                    style={{
                      color: colors.destructive,
                      fontFamily: "Inter_600SemiBold",
                      fontSize: normalize(14),
                    }}
                  >
                    Request Rejected
                  </Text>
                </View>
                <Text
                  style={{
                    color: colors.text,
                    marginTop: rs(8),
                    fontFamily: "Inter_500Medium",
                    fontSize: normalize(14),
                  }}
                >
                  Reason: {latestUpdateRequest.rejection_reason}
                </Text>
                <Text
                  style={{
                    color: colors.mutedForeground,
                    marginTop: rs(4),
                    fontSize: normalize(14),
                  }}
                >
                  Please correct the issues and submit a new request.
                </Text>

                <Pressable
                  style={[
                    styles.saveBtn,
                    { backgroundColor: colors.destructive, marginTop: rs(12) },
                  ]}
                  onPress={() => acknowledgeRejection()}
                  disabled={acknowledging}
                >
                  {acknowledging ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveBtnText}>Acknowledge & Edit</Text>
                  )}
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              {!business && (
                <Text
                  style={{
                    color: colors.mutedForeground,
                    fontSize: normalize(14),
                  }}
                >
                  Fill in the details below to register your business.
                </Text>
              )}

              <View style={styles.field}>
                <Text
                  style={[
                    styles.label,
                    {
                      color: colors.text,
                      fontFamily: "Inter_500Medium",
                      fontSize: normalize(14),
                    },
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
                    size={rs(16)}
                    color={colors.mutedForeground}
                  />
                  <TextInput
                    style={[
                      styles.input,
                      {
                        color: colors.text,
                        fontFamily: "Inter_400Regular",
                        fontSize: normalize(14),
                      },
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
                    {
                      color: colors.text,
                      fontFamily: "Inter_500Medium",
                      fontSize: normalize(14),
                    },
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
                            form.category === cat
                              ? colors.primary
                              : colors.muted,
                          borderColor:
                            form.category === cat
                              ? colors.primary
                              : colors.border,
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
                            fontSize: normalize(14),
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
                    {
                      color: colors.text,
                      fontFamily: "Inter_500Medium",
                      fontSize: normalize(14),
                    },
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
                      {
                        color: colors.text,
                        fontFamily: "Inter_400Regular",
                        fontSize: normalize(14),
                      },
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

              <View style={styles.field}>
                <Text
                  style={[
                    styles.label,
                    {
                      color: colors.text,
                      fontFamily: "Inter_500Medium",
                      fontSize: normalize(14),
                    },
                  ]}
                >
                  {"Business Address"}
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
                    name="map-pin"
                    size={rs(16)}
                    color={colors.mutedForeground}
                  />
                  <TextInput
                    style={[
                      styles.input,
                      {
                        color: colors.text,
                        fontFamily: "Inter_400Regular",
                        fontSize: normalize(14),
                      },
                    ]}
                    value={form.address}
                    onChangeText={(v) => setForm((f) => ({ ...f, address: v }))}
                    placeholder="e.g. 123 Main St, City"
                    placeholderTextColor={colors.mutedForeground}
                  />
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: rs(12) }}>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text
                    style={[
                      styles.label,
                      {
                        color: colors.text,
                        fontFamily: "Inter_500Medium",
                        fontSize: normalize(14),
                      },
                    ]}
                  >
                    {"CNIC Front"}
                  </Text>
                  <Pressable
                    style={[
                      styles.imageUpload,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.background,
                      },
                    ]}
                    onPress={() => handleImagePick("cnic_front_image")}
                  >
                    {form.cnic_front_image || localPreviews.cnic_front_image ? (
                      <Image
                        source={{
                          uri:
                            localPreviews.cnic_front_image ||
                            form.cnic_front_image,
                        }}
                        style={styles.uploadPreview}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={styles.uploadPlaceholder}>
                        <Feather
                          name="camera"
                          size={rs(24)}
                          color={colors.mutedForeground}
                        />
                        <Text
                          style={[
                            styles.uploadPlaceholderText,
                            {
                              color: colors.mutedForeground,
                              fontSize: normalize(12),
                            },
                          ]}
                        >
                          {"Upload Front"}
                        </Text>
                      </View>
                    )}
                    {uploading === "cnic_front_image" && (
                      <View style={styles.uploadingOverlay}>
                        <ActivityIndicator size="small" color="#fff" />
                      </View>
                    )}
                  </Pressable>
                </View>

                <View style={[styles.field, { flex: 1 }]}>
                  <Text
                    style={[
                      styles.label,
                      {
                        color: colors.text,
                        fontFamily: "Inter_500Medium",
                        fontSize: normalize(14),
                      },
                    ]}
                  >
                    {"CNIC Back"}
                  </Text>
                  <Pressable
                    style={[
                      styles.imageUpload,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.background,
                      },
                    ]}
                    onPress={() => handleImagePick("cnic_back_image")}
                  >
                    {form.cnic_back_image || localPreviews.cnic_back_image ? (
                      <Image
                        source={{
                          uri:
                            localPreviews.cnic_back_image ||
                            form.cnic_back_image,
                        }}
                        style={styles.uploadPreview}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={styles.uploadPlaceholder}>
                        <Feather
                          name="camera"
                          size={rs(24)}
                          color={colors.mutedForeground}
                        />
                        <Text
                          style={[
                            styles.uploadPlaceholderText,
                            {
                              color: colors.mutedForeground,
                              fontSize: normalize(12),
                            },
                          ]}
                        >
                          {"Upload Back"}
                        </Text>
                      </View>
                    )}
                    {uploading === "cnic_back_image" && (
                      <View style={styles.uploadingOverlay}>
                        <ActivityIndicator size="small" color="#fff" />
                      </View>
                    )}
                  </Pressable>
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: rs(12) }}>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text
                    style={[
                      styles.label,
                      {
                        color: colors.text,
                        fontFamily: "Inter_500Medium",
                        fontSize: normalize(14),
                      },
                    ]}
                  >
                    {"Opening Time"}
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
                      name="clock"
                      size={rs(16)}
                      color={colors.mutedForeground}
                    />
                    <TextInput
                      style={[
                        styles.input,
                        {
                          color: colors.text,
                          fontFamily: "Inter_400Regular",
                          fontSize: normalize(14),
                        },
                      ]}
                      value={form.opening_time}
                      onChangeText={(v) =>
                        setForm((f) => ({ ...f, opening_time: v }))
                      }
                      placeholder="09:00"
                      placeholderTextColor={colors.mutedForeground}
                    />
                  </View>
                </View>

                <View style={[styles.field, { flex: 1 }]}>
                  <Text
                    style={[
                      styles.label,
                      {
                        color: colors.text,
                        fontFamily: "Inter_500Medium",
                        fontSize: normalize(14),
                      },
                    ]}
                  >
                    {"Closing Time"}
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
                      name="clock"
                      size={rs(16)}
                      color={colors.mutedForeground}
                    />
                    <TextInput
                      style={[
                        styles.input,
                        {
                          color: colors.text,
                          fontFamily: "Inter_400Regular",
                          fontSize: normalize(14),
                        },
                      ]}
                      value={form.closing_time}
                      onChangeText={(v) =>
                        setForm((f) => ({ ...f, closing_time: v }))
                      }
                      placeholder="21:00"
                      placeholderTextColor={colors.mutedForeground}
                    />
                  </View>
                </View>
              </View>

              <Pressable
                style={[
                  styles.saveBtn,
                  {
                    backgroundColor: colors.primary,
                    opacity: saving ? 0.8 : 1,
                  },
                ]}
                onPress={() => requestBusinessUpdate()}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text
                    style={[
                      styles.saveBtnText,
                      { fontFamily: "Inter_700Bold", fontSize: normalize(14) },
                    ]}
                  >
                    {business ? "Request Updates" : "Submit Registration"}
                  </Text>
                )}
              </Pressable>
            </>
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
              {
                color: colors.text,
                fontFamily: "Inter_700Bold",
                fontSize: normalize(18),
              },
            ]}
          >
            {t("settings")}
          </Text>

          <View style={styles.field}>
            <Text
              style={[
                styles.label,
                {
                  color: colors.text,
                  fontFamily: "Inter_500Medium",
                  fontSize: normalize(14),
                },
              ]}
            >
              {t("language")}
            </Text>
            <View style={styles.langRow}>
              <Pressable
                style={[
                  styles.langBtn,
                  {
                    backgroundColor:
                      language === "en" ? colors.primary : colors.muted,
                  },
                ]}
                onPress={() => setLanguage("en")}
              >
                <Text
                  style={[
                    styles.langText,
                    {
                      color: language === "en" ? "#fff" : colors.text,
                      fontFamily: "Inter_600SemiBold",
                      fontSize: normalize(14),
                    },
                  ]}
                >
                  English
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.langBtn,
                  {
                    backgroundColor:
                      language === "ur" ? colors.primary : colors.muted,
                  },
                ]}
                onPress={() => setLanguage("ur")}
              >
                <Text
                  style={[
                    styles.langText,
                    {
                      color: language === "ur" ? "#fff" : colors.text,
                      fontFamily: "Inter_600SemiBold",
                      fontSize: normalize(14),
                    },
                  ]}
                >
                  اردو
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        <Pressable
          style={[
            styles.signOutBtn,
            { backgroundColor: colors.destructive + "14" },
          ]}
          onPress={() => {
            Alert.alert(t("signOut"), t("signOutConfirm"), [
              { text: t("cancel"), style: "cancel" },
              { text: t("signOut"), style: "destructive", onPress: signOut },
            ]);
          }}
        >
          <Feather name="log-out" size={rs(18)} color={colors.destructive} />
          <Text
            style={[
              styles.signOutText,
              {
                color: colors.destructive,
                fontFamily: "Inter_600SemiBold",
                fontSize: normalize(14),
              },
            ]}
          >
            {t("signOut")}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: rs(20), gap: rs(20) },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: normalize(26) },
  ownerCard: { flexDirection: "row", alignItems: "center", gap: rs(14) },
  avatar: {
    width: rs(60),
    height: rs(60),
    borderRadius: rs(30),
    alignItems: "center",
    justifyContent: "center",
  },
  initials: { color: "#fff", fontSize: normalize(22) },
  ownerName: { fontSize: normalize(18) },
  ownerEmail: { fontSize: normalize(13), marginTop: rs(2) },
  roleBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: rs(10),
    paddingVertical: rs(4),
    borderRadius: rs(20),
    marginTop: rs(4),
  },
  roleText: { fontSize: normalize(12) },
  card: { borderRadius: rs(16), borderWidth: 1, padding: rs(18), gap: rs(16) },
  cardTitle: { fontSize: normalize(17) },
  field: { gap: rs(8) },
  label: { fontSize: normalize(14) },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: rs(10),
    paddingHorizontal: rs(12),
    paddingVertical: rs(12),
    gap: rs(10),
  },
  input: { flex: 1, fontSize: normalize(15) },
  catRow: { gap: rs(8) },
  catChip: {
    paddingHorizontal: rs(14),
    paddingVertical: rs(8),
    borderRadius: rs(20),
    borderWidth: 1,
  },
  catText: { fontSize: normalize(14) },
  textAreaWrap: { borderWidth: 1, borderRadius: rs(10), padding: rs(12) },
  textArea: {
    fontSize: normalize(15),
    minHeight: rs(80),
    textAlignVertical: "top",
  },
  saveBtn: {
    paddingVertical: rs(15),
    borderRadius: rs(12),
    alignItems: "center",
    marginTop: rs(4),
  },
  saveBtnText: { color: "#fff", fontSize: normalize(16) },
  langRow: { flexDirection: "row", gap: rs(10) },
  langBtn: {
    flex: 1,
    paddingVertical: rs(10),
    alignItems: "center",
    borderRadius: rs(10),
    // borderWidth: 1,
  },
  langText: { fontSize: normalize(15) },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: rs(10),
    paddingVertical: rs(15),
    borderRadius: rs(14),
    // borderWidth: 1,
  },
  signOutText: { fontSize: normalize(16) },
  imageUpload: {
    height: rs(120),
    borderRadius: rs(12),
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  uploadPlaceholder: { alignItems: "center", gap: rs(8) },
  uploadPlaceholderText: { fontSize: normalize(13) },
  uploadPreview: { width: "100%", height: "100%" },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  detailBox: {
    padding: rs(12),
    borderRadius: rs(10),
    backgroundColor: "rgba(0,0,0,0.02)",
    gap: rs(4),
  },
  detailLabel: { fontSize: normalize(12), opacity: 0.6, marginTop: rs(8) },
  detailText: { fontSize: normalize(15) },
});
