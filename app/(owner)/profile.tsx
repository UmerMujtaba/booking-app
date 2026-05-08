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

import * as ImagePicker from "expo-image-picker";

import { logActivity } from "@/features/audit/logging";
import { useAuth } from "@/features/auth/AuthContext";
import { Business, BusinessUpdateRequest } from "@/features/booking/types";
import { useColors } from "@/hooks/useColors";
import { useTranslation } from "@/hooks/useTranslation";
import { supabase } from "@/lib/supabase";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { styles } from "./styles";
import { Image } from "expo-image";

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
          if (!result.canceled) uploadImage(result.assets[0].uri, field);
        },
      },
      {
        text: "Gallery",
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: "images",
            quality: 0.8,
          });
          if (!result.canceled) uploadImage(result.assets[0].uri, field);
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const uploadImage = async (uri: string, field: string) => {
    try {
      setUploading(field);
      const url = await uploadToCloudinary(uri);
      setForm((f) => ({ ...f, [field]: url }));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      Alert.alert("Upload Failed", "Could not upload image to Cloudinary.");
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
        console.log("🚀 ~ OwnerProfileScreen ~ error:", error);
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
                {
                  color: colors.mutedForeground,
                  fontFamily: "Inter_400Regular",
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
              { color: colors.text, fontFamily: "Inter_700Bold" },
            ]}
          >
            {business ? "Business Profile" : "Business Registration"}
          </Text>

          {latestUpdateRequest?.status === "pending" ? (
            <View style={{ gap: 16 }}>
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
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <Feather name="clock" size={18} color={colors.primary} />
                  <Text
                    style={{
                      color: colors.primary,
                      fontFamily: "Inter_600SemiBold",
                    }}
                  >
                    Submitted for Approval
                  </Text>
                </View>
                <Text style={{ color: colors.mutedForeground, marginTop: 4 }}>
                  Your request is being reviewed by an admin. You cannot make
                  changes until it is approved or rejected.
                </Text>
              </View>

              <View style={styles.detailBox}>
                <Text style={styles.detailLabel}>Proposed Name</Text>
                <Text style={[styles.detailText, { color: colors.text }]}>
                  {latestUpdateRequest.proposed_name}
                </Text>

                <Text style={styles.detailLabel}>Proposed Category</Text>
                <Text style={[styles.detailText, { color: colors.text }]}>
                  {latestUpdateRequest.proposed_category}
                </Text>

                <Text style={styles.detailLabel}>Proposed Address</Text>
                <Text style={[styles.detailText, { color: colors.text }]}>
                  {latestUpdateRequest.proposed_address}
                </Text>

                <Text style={styles.detailLabel}>Operating Hours</Text>
                <Text style={[styles.detailText, { color: colors.text }]}>
                  {latestUpdateRequest.proposed_opening_time?.slice(0, 5)} -{" "}
                  {latestUpdateRequest.proposed_closing_time?.slice(0, 5)}
                </Text>
              </View>
            </View>
          ) : latestUpdateRequest?.status === "rejected" ? (
            <View style={{ gap: 16 }}>
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
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <Feather
                    name="alert-circle"
                    size={18}
                    color={colors.destructive}
                  />
                  <Text
                    style={{
                      color: colors.destructive,
                      fontFamily: "Inter_600SemiBold",
                    }}
                  >
                    Request Rejected
                  </Text>
                </View>
                <Text
                  style={{
                    color: colors.text,
                    marginTop: 8,
                    fontFamily: "Inter_500Medium",
                  }}
                >
                  Reason: {latestUpdateRequest.rejection_reason}
                </Text>
                <Text style={{ color: colors.mutedForeground, marginTop: 4 }}>
                  Please correct the issues and submit a new request.
                </Text>

                <Pressable
                  style={[
                    styles.saveBtn,
                    { backgroundColor: colors.destructive, marginTop: 12 },
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
                <Text style={{ color: colors.mutedForeground }}>
                  Fill in the details below to register your business.
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

              <View style={styles.field}>
                <Text
                  style={[
                    styles.label,
                    { color: colors.text, fontFamily: "Inter_500Medium" },
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
                    size={16}
                    color={colors.mutedForeground}
                  />
                  <TextInput
                    style={[
                      styles.input,
                      { color: colors.text, fontFamily: "Inter_400Regular" },
                    ]}
                    value={form.address}
                    onChangeText={(v) => setForm((f) => ({ ...f, address: v }))}
                    placeholder="e.g. 123 Main St, City"
                    placeholderTextColor={colors.mutedForeground}
                  />
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text
                    style={[
                      styles.label,
                      { color: colors.text, fontFamily: "Inter_500Medium" },
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
                    {form.cnic_front_image ? (
                      <Image
                        source={{ uri: form.cnic_front_image }}
                        style={styles.uploadPreview}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={styles.uploadPlaceholder}>
                        <Feather
                          name="camera"
                          size={24}
                          color={colors.mutedForeground}
                        />
                        <Text
                          style={[
                            styles.uploadPlaceholderText,
                            { color: colors.mutedForeground },
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
                      { color: colors.text, fontFamily: "Inter_500Medium" },
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
                    {form.cnic_back_image ? (
                      <Image
                        source={{ uri: form.cnic_back_image }}
                        style={styles.uploadPreview}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={styles.uploadPlaceholder}>
                        <Feather
                          name="camera"
                          size={24}
                          color={colors.mutedForeground}
                        />
                        <Text
                          style={[
                            styles.uploadPlaceholderText,
                            { color: colors.mutedForeground },
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

              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text
                    style={[
                      styles.label,
                      { color: colors.text, fontFamily: "Inter_500Medium" },
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
                      size={16}
                      color={colors.mutedForeground}
                    />
                    <TextInput
                      style={[
                        styles.input,
                        { color: colors.text, fontFamily: "Inter_400Regular" },
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
                      { color: colors.text, fontFamily: "Inter_500Medium" },
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
                      size={16}
                      color={colors.mutedForeground}
                    />
                    <TextInput
                      style={[
                        styles.input,
                        { color: colors.text, fontFamily: "Inter_400Regular" },
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
                style={({ pressed }) => [
                  styles.saveBtn,
                  {
                    backgroundColor: colors.primary,
                    opacity: pressed || saving ? 0.85 : 1,
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
                      { fontFamily: "Inter_700Bold" },
                    ]}
                  >
                    {business ? "Submit Update" : "Register Business"}
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
