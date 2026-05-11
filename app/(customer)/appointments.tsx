import { Feather } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppointmentCard } from '@/components/AppointmentCard';
import { useAuth } from '@/features/auth/AuthContext';
import { Appointment } from '@/features/booking/types';
import { supabase } from '@/lib/supabase';
import { useColors } from '@/hooks/useColors';
import { useTranslation } from '@/hooks/useTranslation';
import { rs, normalize } from '@/lib/responsive';

async function fetchMyAppointments(userId: string): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select('*, business:businesses(name, category), service:services(name, duration_minutes, price)')
    .eq('customer_id', userId)
    .order('start_time', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Appointment[];
}

export default function AppointmentsScreen() {
  const { user } = useAuth();
  const colors = useColors();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');

  const { data: appointments = [], isLoading, refetch } = useQuery({
    queryKey: ['appointments', user?.id],
    queryFn: () => fetchMyAppointments(user!.id),
    enabled: !!user?.id,
  });

  const { mutate: cancelAppt } = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments'] }),
    onError: () => Alert.alert('Error', 'Failed to cancel appointment'),
  });

  const now = new Date();
  const upcoming = appointments.filter(
    (a) => new Date(a.start_time) >= now && a.status !== 'cancelled'
  );
  const past = appointments.filter(
    (a) => new Date(a.start_time) < now || a.status === 'cancelled'
  );
  const displayed = tab === 'upcoming' ? upcoming : past;

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + rs(12), borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text, fontFamily: 'Inter_700Bold' }]}>
          {t('myAppointments')}
        </Text>
        <View style={[styles.tabs, { backgroundColor: colors.muted }]}>
          {(['upcoming', 'past'] as const).map((tabKey) => (
            <Pressable
              key={tabKey}
              style={[styles.tabBtn, tab === tabKey && { backgroundColor: colors.card, borderRadius: rs(8), shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 2 }]}
              onPress={() => setTab(tabKey)}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color: tab === tabKey ? colors.text : colors.mutedForeground,
                    fontFamily: tab === tabKey ? 'Inter_600SemiBold' : 'Inter_400Regular',
                  },
                ]}
              >
                {t(tabKey)} {tab === tabKey ? `(${displayed.length})` : ''}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isLoading}
          renderItem={({ item }) => (
            <AppointmentCard
              appointment={item}
              onCancel={
                item.status === 'pending' || item.status === 'confirmed'
                  ? () => {
                      Alert.alert(t('cancelAppointment'), t('cancelConfirm'), [
                        { text: t('cancel'), style: 'cancel' },
                        { text: t('confirm'), style: 'destructive', onPress: () => cancelAppt(item.id) },
                      ]);
                    }
                  : undefined
              }
            />
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Feather name="calendar" size={rs(40)} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.text, fontFamily: 'Inter_600SemiBold' }]}>
                {t('noAppointments')}
              </Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                {t('noAppointmentsDesc')}
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
  header: { paddingHorizontal: rs(20), paddingBottom: rs(12), borderBottomWidth: 1, gap: rs(14) },
  title: { fontSize: normalize(26) },
  tabs: {
    flexDirection: 'row',
    borderRadius: rs(10),
    padding: rs(3),
  },
  tabBtn: {
    flex: 1,
    paddingVertical: rs(8),
    alignItems: 'center',
    borderRadius: rs(8),
  },
  tabText: { fontSize: normalize(14) },
  list: { padding: rs(16), paddingBottom: rs(100), gap: 0 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: rs(32), gap: rs(12), marginTop: rs(40) },
  emptyTitle: { fontSize: normalize(20) },
  emptyText: { fontSize: normalize(15), textAlign: 'center' },
});

