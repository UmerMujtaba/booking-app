import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
import {
  ActivityLog,
  Business,
  BusinessUpdateRequest,
} from "@/features/booking/types";
import { logActivity } from "@/features/audit/logging";
import { useColors } from "@/hooks/useColors";
import { supabase } from "@/lib/supabase";
import { useTranslation } from "@/hooks/useTranslation";

interface BusinessWithOwner extends Business {
  owner?: { full_name: string };
}

interface BusinessRequestWithBusiness extends BusinessUpdateRequest {
  business?: { name: string };
}

interface OwnerProfile {
  id: string;
  full_name: string;
}

async function fetchBusinessesForAdmin(): Promise<BusinessWithOwner[]> {
  const { data, error } = await supabase
    .from("businesses")
    .select("*, owner:profiles!businesses_owner_id_fkey(full_name)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as BusinessWithOwner[];
}

async function fetchPendingRequests(): Promise<BusinessRequestWithBusiness[]> {
  const { data, error } = await supabase
    .from("business_update_requests")
    .select("*, business:businesses(name)")
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as BusinessRequestWithBusiness[];
}

async function fetchRecentLogs(): Promise<ActivityLog[]> {
  const { data, error } = await supabase
    .from("activity_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data ?? []) as ActivityLog[];
}

async function fetchOwners(): Promise<OwnerProfile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "owner")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as OwnerProfile[];
}

export default function AdminPanelScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user, profile, signOut } = useAuth();
  const { t, language, setLanguage } = useTranslation();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [businessCategory, setBusinessCategory] = useState("Barber");
  const [businessBio, setBusinessBio] = useState("");

  const { data: businesses = [], isLoading: loadingBusinesses } = useQuery({
    queryKey: ["admin-businesses"],
    queryFn: fetchBusinessesForAdmin,
  });
  console.log(
    "🚀 ~ AdminPanelScreen ~ businesses:",
    JSON.stringify(businesses, null, 2),
  );

  const { data: requests = [], isLoading: loadingRequests } = useQuery({
    queryKey: ["admin-business-update-requests"],
    queryFn: fetchPendingRequests,
  });
  // console.log("🚀 ~ AdminPanelScreen ~ requests:", requests);
  console.log(
    "🚀 ~ AdminPanelScreen ~ requests:",
    JSON.stringify(requests, null, 2),
  );

  const { data: logs = [] } = useQuery({
    queryKey: ["admin-activity-logs"],
    queryFn: fetchRecentLogs,
  });
  // console.log("🚀 ~ AdminPanelScreen ~ logs:", logs);
  // console.log("🚀 ~ AdminPanelScreen ~ logs:", JSON.stringify(logs, null, 2));

  const { data: owners = [] } = useQuery({
    queryKey: ["admin-owner-profiles"],
    queryFn: fetchOwners,
  });

  const ownerOptions = useMemo(() => owners.slice(0, 8), [owners]);

  const { mutate: registerBusiness, isPending: registeringBusiness } =
    useMutation({
      mutationFn: async () => {
        if (!selectedOwnerId) throw new Error("Select an owner");
        if (!businessName.trim()) throw new Error("Business name is required");
        const { data, error } = await supabase
          .from("businesses")
          .insert({
            owner_id: selectedOwnerId,
            name: businessName.trim(),
            category: businessCategory.trim() || "Barber",
            bio: businessBio.trim(),
            created_by: profile?.id,
            approved: false,
          })
          .select("id")
          .single();
        if (error) throw error;

        await logActivity({
          action: "business_registered_by_admin",
          entityType: "business",
          entityId: data.id,
          metadata: { owner_id: selectedOwnerId },
        });
      },
      onSuccess: () => {
        setBusinessName("");
        setBusinessCategory("Barber");
        setBusinessBio("");
        setSelectedOwnerId(null);
        queryClient.invalidateQueries({ queryKey: ["admin-businesses"] });
        queryClient.invalidateQueries({ queryKey: ["admin-activity-logs"] });
      },
      onError: (err: unknown) =>
        Alert.alert(
          "Error",
          err instanceof Error ? err.message : "Failed to register business",
        ),
    });

  const { mutate: approveBusiness } = useMutation({
    mutationFn: async (businessId: string) => {
      const { error } = await supabase
        .from("businesses")
        .update({
          approved: true,
          approved_at: new Date().toISOString(),
          approved_by: profile?.id,
        })
        .eq("id", businessId);
      if (error) throw error;
      await logActivity({
        action: "business_approved",
        entityType: "business",
        entityId: businessId,
      });
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin-businesses"] }),
    onError: (err: unknown) =>
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Approval failed",
      ),
  });

  const { mutate: reviewRequest } = useMutation({
    mutationFn: async ({
      req,
      approve,
    }: {
      req: BusinessRequestWithBusiness;
      approve: boolean;
    }) => {
      let createdBusinessId: string | null = null;

      // 🟢 APPROVE → CREATE BUSINESS
      if (approve) {
        const { data: newBusiness, error: createError } = await supabase
          .from("businesses")
          .insert({
            name: req.proposed_name,
            category: req.proposed_category,
            bio: req.proposed_bio,
            owner_id: req.requested_by,
          })
          .select()
          .single();

        if (createError) throw createError;

        createdBusinessId = newBusiness.id;
      }

      // 🔵 UPDATE REQUEST STATUS (always runs)
      const { error: updateError } = await supabase
        .from("business_update_requests")
        .update({
          status: approve ? "approved" : "rejected",
          reviewed_by: profile?.id,
          reviewed_at: new Date().toISOString(),
          business_id: createdBusinessId, // optional link after creation
        })
        .eq("id", req.id);

      if (updateError) throw updateError;

      // 🟣 LOG ACTIVITY
      await logActivity({
        action: approve
          ? "business_request_approved"
          : "business_request_rejected",
        entityType: "business_request",
        entityId: req.id,
        metadata: {
          business_id: createdBusinessId,
        },
      });
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin-business-update-requests"],
      });
      queryClient.invalidateQueries({ queryKey: ["admin-businesses"] });
      queryClient.invalidateQueries({ queryKey: ["admin-activity-logs"] });
    },

    onError: (err: unknown) => {
      console.log("🚀 ~ AdminPanelScreen ~ err:", err);
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Review failed",
      );
    },
  });

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: topPad + 12,
        paddingBottom: insets.bottom + 24,
      }}
    >
      <View style={styles.header}>
        <Text
          style={[
            styles.title,
            { color: colors.text, fontFamily: "Inter_700Bold" },
          ]}
        >
          Admin Panel
        </Text>
        <Text
          style={[
            styles.subtitle,
            { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
          ]}
        >
          Register, approve, and audit business operations.
        </Text>
      </View>

      {/* <View
        style={[
          styles.section,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text
          style={[
            styles.sectionTitle,
            { color: colors.text, fontFamily: "Inter_600SemiBold" },
          ]}
        >
          Register Business
        </Text>
        <Text style={{ color: colors.mutedForeground }}>Owner account</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.ownerRow}
        >
          {ownerOptions.map((owner) => (
            <Pressable
              key={owner.id}
              style={[
                styles.ownerChip,
                {
                  borderColor:
                    selectedOwnerId === owner.id
                      ? colors.primary
                      : colors.border,
                  backgroundColor:
                    selectedOwnerId === owner.id
                      ? colors.primary + "14"
                      : colors.background,
                },
              ]}
              onPress={() => setSelectedOwnerId(owner.id)}
            >
              <Text
                style={{
                  color:
                    selectedOwnerId === owner.id ? colors.primary : colors.text,
                }}
              >
                {owner.full_name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <TextInput
          style={[
            styles.input,
            {
              borderColor: colors.border,
              color: colors.text,
              backgroundColor: colors.background,
            },
          ]}
          value={businessName}
          onChangeText={setBusinessName}
          placeholder="Business name"
          placeholderTextColor={colors.mutedForeground}
        />
        <TextInput
          style={[
            styles.input,
            {
              borderColor: colors.border,
              color: colors.text,
              backgroundColor: colors.background,
            },
          ]}
          value={businessCategory}
          onChangeText={setBusinessCategory}
          placeholder="Category"
          placeholderTextColor={colors.mutedForeground}
        />
        <TextInput
          style={[
            styles.input,
            styles.bioInput,
            {
              borderColor: colors.border,
              color: colors.text,
              backgroundColor: colors.background,
            },
          ]}
          value={businessBio}
          onChangeText={setBusinessBio}
          placeholder="Business bio"
          placeholderTextColor={colors.mutedForeground}
          multiline
        />
        <Pressable
          style={[styles.actionBtn, { backgroundColor: colors.primary }]}
          onPress={() => registerBusiness()}
          disabled={registeringBusiness}
        >
          {registeringBusiness ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.actionText}>Create Business</Text>
          )}
        </Pressable>
      </View> */}

      <View
        style={[
          styles.section,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text
          style={[
            styles.sectionTitle,
            { color: colors.text, fontFamily: "Inter_600SemiBold" },
          ]}
        >
          Pending Approvals
        </Text>
        {loadingBusinesses ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <FlatList
            data={businesses.filter((b) => !b.approved)}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ListEmptyComponent={
              <Text style={{ color: colors.mutedForeground }}>
                No pending business approvals.
              </Text>
            }
            renderItem={({ item }) => (
              <View style={[styles.row, { borderColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.rowTitle,
                      { color: colors.text, fontFamily: "Inter_600SemiBold" },
                    ]}
                  >
                    {item.name}
                  </Text>
                  <Text style={{ color: colors.mutedForeground }}>
                    {item.owner?.full_name ?? "Unknown owner"}
                  </Text>
                </View>
                <Pressable
                  style={[
                    styles.actionBtn,
                    { backgroundColor: colors.primary },
                  ]}
                  onPress={() => approveBusiness(item.id)}
                >
                  <Text style={styles.actionText}>Approve</Text>
                </Pressable>
              </View>
            )}
          />
        )}
      </View>

      <View
        style={[
          styles.section,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text
          style={[
            styles.sectionTitle,
            { color: colors.text, fontFamily: "Inter_600SemiBold" },
          ]}
        >
          Owner Critical Updates
        </Text>
        {loadingRequests ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <FlatList
            data={requests}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ListEmptyComponent={
              <Text style={{ color: colors.mutedForeground }}>
                No pending update requests.
              </Text>
            }
            renderItem={({ item }) => (
              <View style={[styles.row, { borderColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.rowTitle,
                      { color: colors.text, fontFamily: "Inter_600SemiBold" },
                    ]}
                  >
                    {item.business?.name ?? "Business"}
                  </Text>
                  <Text style={{ color: colors.mutedForeground }}>
                    Requested name: {item.proposed_name}
                  </Text>
                </View>
                <View style={styles.inlineActions}>
                  <Pressable
                    style={[styles.smallBtn, { borderColor: colors.border }]}
                    onPress={() => reviewRequest({ req: item, approve: false })}
                  >
                    <Text style={{ color: colors.text }}>Reject</Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.smallBtn,
                      { backgroundColor: colors.primary },
                    ]}
                    onPress={() => reviewRequest({ req: item, approve: true })}
                  >
                    <Text style={styles.actionText}>Approve</Text>
                  </Pressable>
                </View>
              </View>
            )}
          />
        )}
      </View>

      <View
        style={[
          styles.section,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text
          style={[
            styles.sectionTitle,
            { color: colors.text, fontFamily: "Inter_600SemiBold" },
          ]}
        >
          Recent Activity
        </Text>
        {logs.map((log) => (
          <View key={log.id} style={styles.logRow}>
            <Feather name="activity" size={14} color={colors.mutedForeground} />
            <Text style={{ color: colors.mutedForeground, flex: 1 }}>
              {log.actor_role ?? "user"} - {log.action} (
              {new Date(log.created_at).toLocaleString()})
            </Text>
          </View>
        ))}
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
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, marginBottom: 12 },
  title: { fontSize: 26 },
  subtitle: { marginTop: 4, fontSize: 14 },
  section: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: 1,
  },
  signOutText: { fontSize: 16 },
  sectionTitle: { fontSize: 17 },
  ownerRow: { gap: 8 },
  ownerChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  bioInput: { minHeight: 70, textAlignVertical: "top" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  rowTitle: { fontSize: 15 },
  actionBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  actionText: { color: "#fff", fontFamily: "Inter_600SemiBold" },
  inlineActions: { flexDirection: "row", gap: 8 },
  smallBtn: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
  },
  logRow: { flexDirection: "row", gap: 8, alignItems: "center" },
});
