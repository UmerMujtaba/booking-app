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
  available: boolean;
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

function isSlotAvailable(
  slot: Date,
  durationMins: number,
  appointments: Appointment[],
): boolean {
  const slotStart = slot.getTime();
  const slotEnd = slotStart + durationMins * 60 * 1000;
  const now = Date.now();
  if (slotStart < now) return false;

  for (const appt of appointments) {
    if (appt.status === "cancelled") continue;
    const apptStart = new Date(appt.start_time).getTime();
    // Get duration from service if available, else default 30 min
    const apptDur = (appt.service?.duration_minutes ?? 30) * 60 * 1000;
    const apptEnd = apptStart + apptDur;
    if (slotStart < apptEnd && slotEnd > apptStart) return false;
  }
  return true;
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
      label: time.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      available: isSlotAvailable(time, durationMinutes, existingAppointments),
    }));
  }, [selectedDate, durationMinutes, existingAppointments]);

  const availableSlots = slots.filter((s) => s.available);

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
    <FlatList
      data={slots}
      keyExtractor={(item) => item.time.toISOString()}
      numColumns={3}
      scrollEnabled={false}
      contentContainerStyle={styles.grid}
      renderItem={({ item }) => {
        const isSelected = selectedSlot?.getTime() === item.time.getTime();
        return (
          <Pressable
            disabled={!item.available}
            style={[
              styles.slot,
              {
                backgroundColor: isSelected
                  ? colors.primary
                  : item.available
                    ? colors.card
                    : colors.muted,
                borderColor: isSelected
                  ? colors.primary
                  : item.available
                    ? colors.border
                    : colors.muted,
                opacity: item.available ? 1 : 0.45,
              },
            ]}
            onPress={() => onSelectSlot(item.time)}
          >
            <Text
              style={[
                styles.slotText,
                {
                  color: isSelected
                    ? "#fff"
                    : item.available
                      ? colors.text
                      : colors.mutedForeground,
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
  );
}

const styles = StyleSheet.create({
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


