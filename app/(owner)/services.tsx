import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ServiceCard } from "@/components/ServiceCard";
import { logActivity } from "@/features/audit/logging";
import { useAuth } from "@/features/auth/AuthContext";
import { Business, Service } from "@/features/booking/types";
import { supabase } from "@/lib/supabase";
import { useColors } from "@/hooks/useColors";
import { useTranslation } from "@/hooks/useTranslation";

async function fetchOwnerBusiness(ownerId: string): Promise<Business | null> {
  const { data } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", ownerId)
    .single();
  return data as Business | null;
}

async function fetchServices(businessId: string): Promise<Service[]> {
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("business_id", businessId)
    .order("price");
  if (error) throw error;
  return (data ?? []) as Service[];
}

interface ServiceForm {
  name: string;
  price: string;
  duration: string;
}
const emptyForm: ServiceForm = { name: "", price: "", duration: "30" };

export default function ServicesScreen() {
  const { user } = useAuth();
  const colors = useColors();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [showModal, setShowModal] = useState(false);
  const [editService, setEditService] = useState<Service | null>(null);
  const [form, setForm] = useState<ServiceForm>(emptyForm);

  const { data: business } = useQuery({
    queryKey: ["owner-business", user?.id],
    queryFn: () => fetchOwnerBusiness(user!.id),
    enabled: !!user?.id,
  });

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["owner-services", business?.id],
    queryFn: () => fetchServices(business!.id),
    enabled: !!business?.id,
  });

  const { mutate: saveService, isPending: saving } = useMutation({
    mutationFn: async () => {
      if (!form.name || !form.price || !form.duration)
        throw new Error("Please fill in all fields");
      const price = parseFloat(form.price);
      const duration = parseInt(form.duration, 10);
      if (isNaN(price) || price <= 0) throw new Error("Invalid price");
      if (isNaN(duration) || duration <= 0) throw new Error("Invalid duration");

      if (editService) {
        const { error } = await supabase
          .from("services")
          .update({ name: form.name, price, duration_minutes: duration })
          .eq("id", editService.id);
        if (error) throw error;
        await logActivity({
          action: "service_updated",
          entityType: "service",
          entityId: editService.id,
          metadata: { business_id: business?.id },
        });
      } else {
        if (!business?.id)
          throw new Error(
            "Business profile not found. Please wait for the admin approval.",
          );
        const { data, error } = await supabase
          .from("services")
          .insert({
            business_id: business.id,
            name: form.name,
            price,
            duration_minutes: duration,
          })
          .select("id")
          .single();
        if (error) throw error;
        await logActivity({
          action: "service_created",
          entityType: "service",
          entityId: data.id,
          metadata: { business_id: business.id },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-services"] });
      setShowModal(false);
      setEditService(null);
      setForm(emptyForm);
    },
    onError: (err: unknown) =>
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to save",
      ),
  });

  const { mutate: deleteService } = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("services").delete().eq("id", id);
      if (error) throw error;
      await logActivity({
        action: "service_deleted",
        entityType: "service",
        entityId: id,
        metadata: { business_id: business?.id },
      });
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["owner-services"] }),
    onError: () => Alert.alert("Error", "Failed to delete service"),
  });

  const openAdd = () => {
    setEditService(null);
    setForm(emptyForm);
    setShowModal(true);
  };
  const openEdit = (svc: Service) => {
    setEditService(svc);
    setForm({
      name: svc.name,
      price: String(svc.price),
      duration: String(svc.duration_minutes),
    });
    setShowModal(true);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 12, borderBottomColor: colors.border },
        ]}
      >
        <Text
          style={[
            styles.title,
            { color: colors.text, fontFamily: "Inter_700Bold" },
          ]}
        >
          {t("manageServices")}
        </Text>
        <Pressable
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={openAdd}
        >
          <Feather name="plus" size={20} color="#fff" />
        </Pressable>
      </View>

      {!business ? (
        <View style={styles.center}>
          <Feather name="briefcase" size={40} color={colors.mutedForeground} />
          <Text
            style={[
              styles.emptyTitle,
              { color: colors.text, fontFamily: "Inter_600SemiBold" },
            ]}
          >
            Business setup pending
          </Text>
          <Text
            style={[
              styles.emptyText,
              { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
            ]}
          >
            An admin must register your business before services can be managed.
          </Text>
        </View>
      ) : isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={services}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <ServiceCard
              service={item}
              showActions
              onEdit={() => openEdit(item)}
              onDelete={() =>
                Alert.alert("Delete Service", `Delete "${item.name}"?`, [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => deleteService(item.id),
                  },
                ])
              }
            />
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Feather
                name="scissors"
                size={40}
                color={colors.mutedForeground}
              />
              <Text
                style={[
                  styles.emptyTitle,
                  { color: colors.text, fontFamily: "Inter_600SemiBold" },
                ]}
              >
                {t("noServices")}
              </Text>
              <Text
                style={[
                  styles.emptyText,
                  {
                    color: colors.mutedForeground,
                    fontFamily: "Inter_400Regular",
                  },
                ]}
              >
                {t("noServicesDesc")}
              </Text>
              <Pressable
                style={[styles.ctaBtn, { backgroundColor: colors.primary }]}
                onPress={openAdd}
              >
                <Text
                  style={[styles.ctaText, { fontFamily: "Inter_600SemiBold" }]}
                >
                  {t("addService")}
                </Text>
              </Pressable>
            </View>
          }
        />
      )}

      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Pressable style={styles.overlay} onPress={() => setShowModal(false)}>
            <Pressable
              style={[styles.sheet, { backgroundColor: colors.card }]}
              onPress={() => {}}
            >
              <View
                style={[styles.handle, { backgroundColor: colors.border }]}
              />
              <Text
                style={[
                  styles.sheetTitle,
                  { color: colors.text, fontFamily: "Inter_700Bold" },
                ]}
              >
                {editService ? t("edit") : t("addService")}
              </Text>

              <FormField
                label={t("serviceName")}
                value={form.name}
                onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                placeholder="e.g. Haircut"
                colors={colors}
              />
              <FormField
                label={`${t("servicePrice")} ($)`}
                value={form.price}
                onChangeText={(v) => setForm((f) => ({ ...f, price: v }))}
                placeholder="25"
                keyboardType="decimal-pad"
                colors={colors}
              />
              <FormField
                label={`${t("serviceDuration")} (min)`}
                value={form.duration}
                onChangeText={(v) => setForm((f) => ({ ...f, duration: v }))}
                placeholder="30"
                keyboardType="number-pad"
                colors={colors}
              />

              <View style={styles.sheetBtns}>
                <Pressable
                  style={[styles.cancelBtn, { borderColor: colors.border }]}
                  onPress={() => setShowModal(false)}
                >
                  <Text
                    style={[
                      styles.cancelText,
                      { color: colors.text, fontFamily: "Inter_500Medium" },
                    ]}
                  >
                    {t("cancel")}
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.saveBtn,
                    {
                      backgroundColor: colors.primary,
                      opacity: saving ? 0.8 : 1,
                    },
                  ]}
                  onPress={() => saveService()}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text
                      style={[styles.saveText, { fontFamily: "Inter_700Bold" }]}
                    >
                      {t("save")}
                    </Text>
                  )}
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  colors,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  keyboardType?: "decimal-pad" | "number-pad";
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  return (
    <View style={styles.field}>
      <Text
        style={[
          styles.fieldLabel,
          { color: colors.text, fontFamily: "Inter_500Medium" },
        ]}
      >
        {label}
      </Text>
      <View
        style={[
          styles.fieldInput,
          { backgroundColor: colors.background, borderColor: colors.border },
        ]}
      >
        <TextInput
          style={[
            styles.textInput,
            { color: colors.text, fontFamily: "Inter_400Regular" },
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          keyboardType={keyboardType ?? "default"}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 26 },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  list: { padding: 16, paddingBottom: 100 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
    marginTop: 60,
  },
  emptyTitle: { fontSize: 18 },
  emptyText: { fontSize: 15, textAlign: "center" },
  ctaBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  ctaText: { color: "#fff", fontSize: 15 },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 16,
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center" },
  sheetTitle: { fontSize: 20 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 14 },
  fieldInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  textInput: { fontSize: 16 },
  sheetBtns: { flexDirection: "row", gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
  },
  cancelText: { fontSize: 15 },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  saveText: { color: "#fff", fontSize: 15 },
});
