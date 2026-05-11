import { Feather } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppointmentCard } from '@/components/AppointmentCard';
import { useAuth } from '@/features/auth/AuthContext';
import { Appointment, Business } from '@/features/booking/types';
import { supabase } from '@/lib/supabase';
import { useColors } from '@/hooks/useColors';
import { useTranslation } from '@/hooks/useTranslation';
import { rs, normalize } from '@/lib/responsive';

const WEEK_DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getWeekDates(): Date[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i - 2);
    return d;
  });
}

async function fetchOwnerBusiness(ownerId: string): Promise<Business | null> {
  const { data } = await supabase.from('businesses').select('*').eq('owner_id', ownerId).single();
  return data as Business | null;
}

async function fetchAppointmentsForDay(businessId: string, date: Date): Promise<Appointment[]> {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  const { data, error } = await supabase
    .from('appointments')
    .select('*, service:services(name, duration_minutes, price), customer_profile:profiles!appointments_customer_id_fkey(full_name, phone)')
    .eq('business_id', businessId)
    .gte('start_time', start.toISOString())
    .lte('start_time', end.toISOString())
    .order('start_time');

  if (error) throw error;
  return (data ?? []) as unknown as Appointment[];
}

export default function OwnerAgendaScreen() {
  const { user } = useAuth();
  const colors = useColors();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const weekDates = getWeekDates();
  const todayIndex = weekDates.findIndex((d) => d.toDateString() === new Date().toDateString());
  const [selectedDate, setSelectedDate] = useState<Date>(weekDates[todayIndex >= 0 ? todayIndex : 2]);

  const { data: business } = useQuery({
    queryKey: ['owner-business', user?.id],
    queryFn: () => fetchOwnerBusiness(user!.id),
    enabled: !!user?.id,
  });

  const { data: appointments = [], isLoading, refetch } = useQuery({
    queryKey: ['owner-appointments', business?.id, selectedDate.toDateString()],
    queryFn: () => fetchAppointmentsForDay(business!.id, selectedDate),
    enabled: !!business?.id,
  });

  const { mutate: updateStatus } = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('appointments').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['owner-appointments'] }),
    onError: () => Alert.alert('Error', 'Failed to update status'),
  });

  const totalEarnings = appointments
    .filter((a) => a.status === 'completed')
    .reduce((sum, a) => sum + (a.service ? Number(a.service.price) : 0), 0);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + rs(12), borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.greeting, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              {business?.name ?? 'Your Business'}
            </Text>
            <Text style={[styles.headerTitle, { color: colors.text, fontFamily: 'Inter_700Bold' }]}>
              {t('agenda')}
            </Text>
          </View>
          {totalEarnings > 0 && (
            <View style={[styles.earningsBadge, { backgroundColor: colors.success + '18' }]}>
              <Feather name="trending-up" size={rs(14)} color={colors.success} />
              <Text style={[styles.earningsText, { color: colors.success, fontFamily: 'Inter_600SemiBold' }]}>
                ${totalEarnings.toFixed(0)}
              </Text>
            </View>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weekRow}>
          {weekDates.map((date) => {
            const isSelected = date.toDateString() === selectedDate.toDateString();
            const isToday = date.toDateString() === new Date().toDateString();
            return (
              <Pressable
                key={date.toISOString()}
                style={[
                  styles.dayBtn,
                  {
                    backgroundColor: isSelected ? colors.primary : 'transparent',
                    borderColor: isToday && !isSelected ? colors.primary : 'transparent',
                    borderWidth: 1,
                  },
                ]}
                onPress={() => setSelectedDate(date)}
              >
                <Text style={[styles.dayName, { color: isSelected ? '#ffffffAA' : colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                  {WEEK_DAYS_SHORT[date.getDay()]}
                </Text>
                <Text style={[styles.dayNum, { color: isSelected ? '#fff' : colors.text, fontFamily: 'Inter_700Bold' }]}>
                  {date.getDate()}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {!business ? (
        <View style={styles.center}>
          <Feather name="briefcase" size={rs(40)} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.text, fontFamily: 'Inter_600SemiBold' }]}>
            Business setup pending
          </Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            An admin needs to register and approve your business before you can manage bookings.
          </Text>
        </View>
      ) : isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={appointments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isLoading}
          ListHeaderComponent={
            <Text style={[styles.dayLabel, { color: colors.text, fontFamily: 'Inter_600SemiBold' }]}>
              {selectedDate.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })} · {appointments.length} {appointments.length === 1 ? 'booking' : 'bookings'}
            </Text>
          }
          renderItem={({ item }) => (
            <AppointmentCard
              appointment={item}
              showCustomer
              onConfirm={() => updateStatus({ id: item.id, status: 'confirmed' })}
              onComplete={() => updateStatus({ id: item.id, status: 'completed' })}
              onCancel={() =>
                Alert.alert(t('cancelAppointment'), t('cancelConfirm'), [
                  { text: t('cancel'), style: 'cancel' },
                  { text: t('confirm'), style: 'destructive', onPress: () => updateStatus({ id: item.id, status: 'cancelled' }) },
                ])
              }
            />
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Feather name="coffee" size={rs(36)} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.text, fontFamily: 'Inter_600SemiBold' }]}>
                {t('noAppointmentsToday')}
              </Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                Enjoy the quiet day
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingBottom: rs(8), borderBottomWidth: 1 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: rs(20), marginBottom: rs(14) },
  greeting: { fontSize: normalize(13) },
  headerTitle: { fontSize: normalize(24), marginTop: rs(2) },
  earningsBadge: { flexDirection: 'row', alignItems: 'center', gap: rs(4), paddingHorizontal: rs(12), paddingVertical: rs(7), borderRadius: rs(20) },
  earningsText: { fontSize: normalize(15) },
  weekRow: { paddingHorizontal: rs(16), gap: rs(4) },
  dayBtn: { width: rs(48), alignItems: 'center', paddingVertical: rs(8), borderRadius: rs(12), gap: rs(2) },
  dayName: { fontSize: normalize(11) },
  dayNum: { fontSize: normalize(18) },
  list: { padding: rs(16), paddingBottom: rs(100) },
  dayLabel: { fontSize: normalize(15), marginBottom: rs(14) },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: rs(32), gap: rs(12), marginTop: rs(60) },
  emptyTitle: { fontSize: normalize(18) },
  emptyText: { fontSize: normalize(15), textAlign: 'center' },
});

