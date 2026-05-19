import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import {
  Alert,
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TimeSlotPicker } from "@/components/TimeSlotPicker";
import { Appointment, Service } from "@/features/booking/types";
import { useAuth } from "@/features/auth/AuthContext";
import { supabase } from "@/lib/supabase";
import { useColors } from "@/hooks/useColors";
import { useTranslation } from "@/hooks/useTranslation";
import { rs, normalize } from "@/lib/responsive";

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function getDateOptions(count = 14): Date[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });
}

async function fetchService(serviceId: string): Promise<Service> {
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("id", serviceId)
    .single();
  if (error) throw error;
  return data as Service;
}

async function fetchAppointmentsForDate(
  businessId: string,
  date: Date,
): Promise<Appointment[]> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const { data, error } = await supabase
    .from("appointments")
    .select("*, service:services(duration_minutes)")
    .eq("business_id", businessId)
    .gte("start_time", startOfDay.toISOString())
    .lte("start_time", endOfDay.toISOString())
    .neq("status", "cancelled");

  if (error) throw error;
  return (data ?? []) as unknown as Appointment[];
}

export default function BookingScreen() {
  const { id: businessId, serviceId } = useLocalSearchParams<{
    id: string;
    serviceId: string;
  }>();
  const colors = useColors();
  const { t } = useTranslation();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const dateOptions = getDateOptions();
  const [selectedDate, setSelectedDate] = useState<Date>(dateOptions[0]);
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const { data: service, isLoading: svcLoading } = useQuery({
    queryKey: ["service", serviceId],
    queryFn: () => fetchService(serviceId!),
    enabled: !!serviceId,
  });

  const { data: appointments = [], isLoading: apptLoading } = useQuery({
    queryKey: [
      "appointments-for-date",
      businessId,
      selectedDate.toDateString(),
    ],
    queryFn: () => fetchAppointmentsForDate(businessId!, selectedDate),
    enabled: !!businessId,
  });

  const { mutate: createBooking, isPending: booking } = useMutation({
    mutationFn: async () => {
      if (!selectedSlot || !service || !user) throw new Error("Missing data");

      // Verify slot availability again
      const startOfDay = new Date(selectedSlot);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedSlot);
      endOfDay.setHours(23, 59, 59, 999);

      const { data: existingAppts } = await supabase
        .from("appointments")
        .select("*, service:services(duration_minutes)")
        .eq("business_id", businessId)
        .gte("start_time", startOfDay.toISOString())
        .lte("start_time", endOfDay.toISOString())
        .neq("status", "cancelled");

      if (existingAppts) {
        const slotStart = selectedSlot.getTime();
        const durationMins = service.duration_minutes ?? 30;
        const slotEnd = slotStart + durationMins * 60 * 1000;
        
        for (const appt of existingAppts) {
           // eslint-disable-next-line @typescript-eslint/no-explicit-any
           const apptDur = ((appt.service as any)?.duration_minutes ?? 30) * 60 * 1000;
           const apptStart = new Date(appt.start_time).getTime();
           const apptEnd = apptStart + apptDur;
           if (slotStart < apptEnd && slotEnd > apptStart) {
               throw new Error("This time slot has just been booked by someone else.");
           }
        }
      }

      const { error } = await supabase.from("appointments").insert({
        business_id: businessId,
        customer_id: user.id,
        service_id: service.id,
        start_time: selectedSlot.toISOString(),
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["appointments-for-date"] });
      setShowConfirm(false);
      Alert.alert(
        t("bookingConfirmed"),
        `Your booking for ${service?.name} at ${selectedSlot?.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })} is confirmed!`,
        [
          {
            text: "OK",
            onPress: () => router.replace("/(customer)/appointments"),
          },
        ],
      );
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Booking failed";
      Alert.alert(t("bookingFailed"), message);
      // Also refresh the data to update available slots
      queryClient.invalidateQueries({ queryKey: ["appointments-for-date"] });
    },
  });

  if (svcLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + rs(12), borderBottomColor: colors.border },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={rs(22)} color={colors.text} />
        </Pressable>
        <Text
          style={[
            styles.headerTitle,
            { color: colors.text, fontFamily: "Inter_700Bold" },
          ]}
        >
          {t("confirmBooking")}
        </Text>
        <View style={{ width: rs(36) }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {service && (
          <View
            style={[
              styles.serviceInfo,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View
              style={[
                styles.serviceIcon,
                { backgroundColor: colors.accent + "18" },
              ]}
            >
              <Feather name="scissors" size={rs(22)} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.serviceName,
                  { color: colors.text, fontFamily: "Inter_600SemiBold" },
                ]}
              >
                {service.name}
              </Text>
              <Text
                style={[
                  styles.serviceMeta,
                  {
                    color: colors.mutedForeground,
                    fontFamily: "Inter_400Regular",
                  },
                ]}
              >
                ${Number(service.price).toFixed(0)} · {service.duration_minutes}{" "}
                {t("duration")}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.text, fontFamily: "Inter_600SemiBold" },
            ]}
          >
            {t("selectDate")}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateRow}
          >
            {dateOptions.map((date, i) => {
              const isSelected =
                date.toDateString() === selectedDate.toDateString();
              const isToday = i === 0;
              return (
                <Pressable
                  key={date.toISOString()}
                  style={[
                    styles.dateBtn,
                    {
                      backgroundColor: isSelected
                        ? colors.primary
                        : colors.card,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => {
                    setSelectedDate(date);
                    setSelectedSlot(null);
                  }}
                >
                  <Text
                    style={[
                      styles.dateDayName,
                      {
                        color: isSelected
                          ? "#ffffffAA"
                          : colors.mutedForeground,
                        fontFamily: "Inter_400Regular",
                      },
                    ]}
                  >
                    {isToday ? "Today" : WEEK_DAYS[date.getDay()]}
                  </Text>
                  <Text
                    style={[
                      styles.dateNum,
                      {
                        color: isSelected ? "#fff" : colors.text,
                        fontFamily: "Inter_700Bold",
                      },
                    ]}
                  >
                    {date.getDate()}
                  </Text>
                  <Text
                    style={[
                      styles.dateMonth,
                      {
                        color: isSelected
                          ? "#ffffffAA"
                          : colors.mutedForeground,
                        fontFamily: "Inter_400Regular",
                      },
                    ]}
                  >
                    {MONTHS[date.getMonth()]}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.text, fontFamily: "Inter_600SemiBold" },
            ]}
          >
            {t("selectTime")}
          </Text>
          {apptLoading ? (
            <ActivityIndicator
              color={colors.primary}
              style={{ marginVertical: rs(16) }}
            />
          ) : (
            <TimeSlotPicker
              selectedDate={selectedDate}
              durationMinutes={service?.duration_minutes ?? 30}
              existingAppointments={appointments}
              selectedSlot={selectedSlot}
              onSelectSlot={setSelectedSlot}
            />
          )}
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + rs(55),
            backgroundColor: colors.background,
          },
        ]}
      >
        <Pressable
          style={({ pressed }) => [
            styles.confirmBtn,
            {
              backgroundColor: selectedSlot ? colors.primary : colors.muted,
              opacity: pressed ? 0.88 : 1,
            },
          ]}
          disabled={!selectedSlot}
          onPress={() => setShowConfirm(true)}
        >
          <Text
            style={[
              styles.confirmText,
              {
                color: selectedSlot ? "#fff" : colors.mutedForeground,
                fontFamily: "Inter_700Bold",
              },
            ]}
          >
            {selectedSlot
              ? `${t("confirmBooking")} at ${selectedSlot.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}`
              : t("selectTime")}
          </Text>
        </Pressable>
      </View>

      <Modal
        visible={showConfirm}
        transparent
        animationType="slide"
        onRequestClose={() => setShowConfirm(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowConfirm(false)}
        >
          <Pressable
            style={[styles.modalSheet, { backgroundColor: colors.card }]}
            onPress={() => {}}
          >
            <View
              style={[styles.modalHandle, { backgroundColor: colors.border }]}
            />
            <Text
              style={[
                styles.modalTitle,
                { color: colors.text, fontFamily: "Inter_700Bold" },
              ]}
            >
              {t("confirmYourBooking")}
            </Text>
            {service && selectedSlot && (
              <View
                style={[
                  styles.modalInfo,
                  { backgroundColor: colors.background, borderRadius: rs(12) },
                ]}
              >
                <Row
                  icon="scissors"
                  label="Service"
                  value={service.name}
                  colors={colors}
                />
                <Row
                  icon="calendar"
                  label="Date"
                  value={selectedDate.toLocaleDateString([], {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                  colors={colors}
                />
                <Row
                  icon="clock"
                  label="Time"
                  value={selectedSlot.toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  })}
                  colors={colors}
                />
                <Row
                  icon="tag"
                  label="Price"
                  value={`$${Number(service.price).toFixed(2)}`}
                  colors={colors}
                />
              </View>
            )}
            <View style={styles.modalBtns}>
              <Pressable
                style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                onPress={() => setShowConfirm(false)}
              >
                <Text
                  style={[
                    styles.modalCancelText,
                    { color: colors.text, fontFamily: "Inter_600SemiBold" },
                  ]}
                >
                  {t("cancel")}
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalConfirmBtn,
                  {
                    backgroundColor: colors.primary,
                    opacity: booking ? 0.8 : 1,
                  },
                ]}
                onPress={() => createBooking()}
                disabled={booking}
              >
                {booking ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text
                    style={[
                      styles.modalConfirmText,
                      { fontFamily: "Inter_700Bold" },
                    ]}
                  >
                    {t("confirm")}
                  </Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function Row({
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
    <View style={styles.infoRow}>
      <Feather
        name={icon as keyof typeof Feather.glyphMap}
        size={rs(16)}
        color={colors.mutedForeground}
      />
      <Text
        style={[
          styles.infoLabel,
          { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.infoValue,
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
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: rs(16),
    paddingBottom: rs(14),
    borderBottomWidth: 1,
  },
  backBtn: { width: rs(36) },
  headerTitle: { fontSize: normalize(16) },
  scroll: { padding: rs(16), paddingBottom: rs(32), gap: rs(24) },
  serviceInfo: {
    flexDirection: "row",
    alignItems: "center",
    padding: rs(16),
    borderRadius: rs(14),
    borderWidth: 1,
    gap: rs(14),
  },
  serviceIcon: {
    width: rs(48),
    height: rs(48),
    borderRadius: rs(12),
    alignItems: "center",
    justifyContent: "center",
  },
  serviceName: { fontSize: normalize(14) },
  serviceMeta: { fontSize: normalize(12), marginTop: rs(3) },
  section: { gap: rs(14) },
  sectionTitle: { fontSize: normalize(14) },
  dateRow: { gap: rs(8) },
  dateBtn: {
    width: rs(64),
    alignItems: "center",
    paddingVertical: rs(12),
    borderRadius: rs(12),
    borderWidth: 1,
    gap: rs(2),
  },
  dateDayName: { fontSize: normalize(11) },
  dateNum: { fontSize: normalize(16) },
  dateMonth: { fontSize: normalize(11) },
  footer: { padding: rs(16), borderTopWidth: 1 },
  confirmBtn: {
    paddingVertical: rs(16),
    borderRadius: rs(14),
    alignItems: "center",
  },
  confirmText: { fontSize: normalize(13) },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: rs(24),
    borderTopRightRadius: rs(24),
    padding: rs(24),
    gap: rs(20),
  },
  modalHandle: {
    width: rs(40),
    height: rs(4),
    borderRadius: rs(2),
    alignSelf: "center",
  },
  modalTitle: { fontSize: normalize(22), textAlign: "center" },
  modalInfo: { padding: rs(16), gap: rs(14) },
  infoRow: { flexDirection: "row", alignItems: "center", gap: rs(10) },
  infoLabel: { fontSize: normalize(14), width: rs(60) },
  infoValue: { fontSize: normalize(15), flex: 1, textAlign: "right" },
  modalBtns: { flexDirection: "row", gap: rs(12) },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: rs(15),
    borderRadius: rs(12),
    alignItems: "center",
    borderWidth: 1,
  },
  modalCancelText: { fontSize: normalize(16) },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: rs(15),
    borderRadius: rs(12),
    alignItems: "center",
  },
  modalConfirmText: { color: "#fff", fontSize: normalize(16) },
});
