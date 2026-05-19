import { Feather } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { rs, normalize } from "@/lib/responsive";

import { Appointment } from "@/features/booking/types";
import { useColors } from "@/hooks/useColors";
import { useTranslation } from "@/hooks/useTranslation";

interface TimeSlot {
  time: Date;
  label: string;
  status: "available" | "occupied" | "not_available";
}

interface Props {
  selectedDate: Date;
  durationMinutes: number;
  existingAppointments: Appointment[];
  selectedSlot: Date | null;
  onSelectSlot: (slot: Date) => void;
}

function generateSlots(date: Date, durationMins: number): Date[] {
  const slots: Date[] = [];
  const start = new Date(date);
  start.setHours(9, 0, 0, 0);
  const end = new Date(date);
  end.setHours(18, 0, 0, 0);

  const current = new Date(start);
  while (current < end) {
    slots.push(new Date(current));
    current.setMinutes(current.getMinutes() + durationMins);
  }
  return slots;
}

function getSlotStatus(
  slot: Date,
  durationMins: number,
  appointments: Appointment[],
): "available" | "occupied" | "not_available" {
  const slotStart = slot.getTime();
  const slotEnd = slotStart + durationMins * 60 * 1000;
  const now = Date.now();
  if (slotStart < now) return "not_available";

  for (const appt of appointments) {
    if (appt.status === "cancelled") continue;
    const apptStart = new Date(appt.start_time).getTime();
    // Get duration from service if available, else default 30 min
    const apptDur = (appt.service?.duration_minutes ?? 30) * 60 * 1000;
    const apptEnd = apptStart + apptDur;
    if (slotStart < apptEnd && slotEnd > apptStart) return "occupied";
  }
  return "available";
}

export function TimeSlotPicker({
  selectedDate,
  durationMinutes,
  existingAppointments,
  selectedSlot,
  onSelectSlot,
}: Props) {
  const colors = useColors();
  const { t } = useTranslation();

  const slots: TimeSlot[] = useMemo(() => {
    return generateSlots(selectedDate, durationMinutes).map((time) => ({
      time,
      label: time.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
      status: getSlotStatus(time, durationMinutes, existingAppointments),
    }));
  }, [selectedDate, durationMinutes, existingAppointments]);
  console.log("🚀 ~ TimeSlotPicker ~ slots:", slots);

  const availableSlots = slots.filter((s) => s.status !== "not_available");

  if (availableSlots.length === 0) {
    return (
      <View style={styles.empty}>
        <Feather name="calendar" size={rs(32)} color={colors.mutedForeground} />
        <Text
          style={[
            styles.emptyText,
            { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
          ]}
        >
          {t("noSlotsAvailable")}
        </Text>
      </View>
    );
  }

  return (
    <View>
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendColor,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          />
          <Text style={[styles.legendText, { color: colors.text }]}>
            Available
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendColor,
              {
                backgroundColor: colors.card,
                borderColor: colors.destructive || "#ef4444",
              },
            ]}
          />
          <Text style={[styles.legendText, { color: colors.text }]}>
            Occupied
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendColor,
              { backgroundColor: colors.muted, borderColor: colors.muted },
            ]}
          />
          <Text style={[styles.legendText, { color: colors.text }]}>
            Not Available
          </Text>
        </View>
      </View>

      <FlatList
        data={slots}
        keyExtractor={(item) => item.time.toISOString()}
        numColumns={3}
        scrollEnabled={false}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => {
          // console.log("🚀 ~ TimeSlotPicker ~ item:", item);
          const isSelected = selectedSlot?.getTime() === item.time.getTime();
          const isAvailable = item.status === "available";
          const isOccupied = item.status === "occupied";

          let bgColor = colors.muted;
          let textColor = colors.mutedForeground;
          let borderColor = colors.muted;

          if (isSelected) {
            bgColor = colors.primary;
            borderColor = colors.primary;
            textColor = "#fff";
          } else if (isAvailable) {
            bgColor = colors.card;
            borderColor = colors.border;
            textColor = colors.text;
          } else if (isOccupied) {
            bgColor = colors.card;
            borderColor = colors.destructive || "#ef4444";
            textColor = colors.destructive || "#ef4444";
          }

          return (
            <Pressable
              disabled={!isAvailable}
              style={[
                styles.slot,
                {
                  backgroundColor: bgColor,
                  borderColor: borderColor,
                  opacity: item.status === "not_available" ? 0.45 : 1,
                },
              ]}
              onPress={() => onSelectSlot(item.time)}
            >
              <Text
                style={[
                  styles.slotText,
                  {
                    color: textColor,
                    fontFamily: isSelected
                      ? "Inter_600SemiBold"
                      : "Inter_400Regular",
                  },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  legendContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: rs(12),
    paddingHorizontal: rs(8),
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(6),
  },
  legendColor: {
    width: rs(12),
    height: rs(12),
    borderRadius: rs(4),
    borderWidth: 1,
  },
  legendText: {
    fontSize: normalize(11),
    fontFamily: "Inter_400Regular",
  },
  grid: { paddingVertical: rs(4) },
  slot: {
    flex: 1,
    margin: rs(3),
    paddingVertical: rs(10),
    borderRadius: rs(10),
    borderWidth: 1,
    alignItems: "center",
  },
  slotText: { fontSize: normalize(13) },
  empty: { alignItems: "center", padding: rs(24), gap: rs(8) },
  emptyText: { fontSize: normalize(14), textAlign: "center" },
});
