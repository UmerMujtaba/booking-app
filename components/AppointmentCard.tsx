import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { rs, normalize } from '@/lib/responsive';

import { Appointment, AppointmentStatus } from '@/features/booking/types';
import { useColors } from '@/hooks/useColors';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  appointment: Appointment;
  showCustomer?: boolean;
  onCancel?: () => void;
  onConfirm?: () => void;
  onComplete?: () => void;
}

function StatusBadge({ status }: { status: AppointmentStatus }) {
  const colors = useColors();
  const { t } = useTranslation();

  const config: Record<AppointmentStatus, { bg: string; text: string; icon: string }> = {
    pending: { bg: colors.warning + '20', text: colors.warning, icon: 'clock' },
    confirmed: { bg: colors.primary + '18', text: colors.primary, icon: 'check-circle' },
    completed: { bg: colors.success + '18', text: colors.success, icon: 'check-square' },
    cancelled: { bg: colors.destructive + '18', text: colors.destructive, icon: 'x-circle' },
  };

  const c = config[status];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Feather name={c.icon as keyof typeof Feather.glyphMap} size={rs(11)} color={c.text} />
      <Text style={[styles.badgeText, { color: c.text, fontFamily: 'Inter_500Medium' }]}>
        {t(status)}
      </Text>
    </View>
  );
}

export function AppointmentCard({ appointment, showCustomer, onCancel, onConfirm, onComplete }: Props) {
  const colors = useColors();
  const { t } = useTranslation();

  const startTime = new Date(appointment.start_time);
  const timeStr = startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = startTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.timeBar}>
        <View style={[styles.timeDot, { backgroundColor: colors.primary }]} />
        <View style={styles.timeLabels}>
          <Text style={[styles.time, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>{timeStr}</Text>
          <Text style={[styles.date, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{dateStr}</Text>
        </View>
        <StatusBadge status={appointment.status} />
      </View>

      <View style={styles.body}>
        {appointment.business && (
          <Text style={[styles.businessName, { color: colors.text, fontFamily: 'Inter_600SemiBold' }]}>
            {appointment.business.name}
          </Text>
        )}
        {appointment.service && (
          <View style={styles.serviceRow}>
            <Feather name="scissors" size={rs(13)} color={colors.mutedForeground} />
            <Text style={[styles.serviceName, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              {appointment.service.name} · {appointment.service.duration_minutes} {t('duration')}
            </Text>
          </View>
        )}
        {showCustomer && appointment.customer_profile && (
          <View style={styles.serviceRow}>
            <Feather name="user" size={rs(13)} color={colors.mutedForeground} />
            <Text style={[styles.serviceName, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              {appointment.customer_profile.full_name}
            </Text>
          </View>
        )}
      </View>

      {(onCancel || onConfirm || onComplete) && (
        <View style={[styles.actions, { borderTopColor: colors.border }]}>
          {onConfirm && appointment.status === 'pending' && (
            <Pressable
              style={[styles.actionBtn, { backgroundColor: colors.primary }]}
              onPress={onConfirm}
            >
              <Text style={[styles.actionText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>
                {t('markConfirmed')}
              </Text>
            </Pressable>
          )}
          {onComplete && appointment.status === 'confirmed' && (
            <Pressable
              style={[styles.actionBtn, { backgroundColor: colors.success }]}
              onPress={onComplete}
            >
              <Text style={[styles.actionText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>
                {t('markCompleted')}
              </Text>
            </Pressable>
          )}
          {onCancel && (appointment.status === 'pending' || appointment.status === 'confirmed') && (
            <Pressable
              style={[styles.actionBtn, { backgroundColor: colors.destructive + '14' }]}
              onPress={onCancel}
            >
              <Text style={[styles.actionText, { color: colors.destructive, fontFamily: 'Inter_600SemiBold' }]}>
                {t('cancel')}
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: rs(14),
    borderWidth: 1,
    marginBottom: rs(12),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: rs(4),
    elevation: 2,
  },
  timeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: rs(14),
    gap: rs(10),
  },
  timeDot: { width: rs(8), height: rs(8), borderRadius: rs(4) },
  timeLabels: { flex: 1 },
  time: { fontSize: normalize(18) },
  date: { fontSize: normalize(13), marginTop: rs(1) },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(4),
    paddingHorizontal: rs(8),
    paddingVertical: rs(4),
    borderRadius: rs(20),
  },
  badgeText: { fontSize: normalize(12) },
  body: { paddingHorizontal: rs(14), paddingBottom: rs(14), gap: rs(5) },
  businessName: { fontSize: normalize(16) },
  serviceRow: { flexDirection: 'row', alignItems: 'center', gap: rs(6) },
  serviceName: { fontSize: normalize(14) },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    padding: rs(12),
    gap: rs(8),
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: rs(9),
    borderRadius: rs(8),
  },
  actionText: { fontSize: normalize(14) },
});


