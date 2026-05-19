import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Appointment } from '@/features/booking/types';

/**
 * Subscribe to appointment changes for a specific business and day.
 * Returns the up‑to‑date list of appointments for that day.
 */
export const useBusinessAppointments = (
  businessId: string,
  day: Date,
): Appointment[] => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  // Compute UTC start and end of the selected day
  const dayStart = new Date(day);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(day);
  dayEnd.setUTCHours(23, 59, 59, 999);

  // Initial fetch of appointments for the business on the selected day
  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('business_id', businessId)
        .gte('start_time', dayStart.toISOString())
        .lt('start_time', dayEnd.toISOString());

      if (!error && data) {
        setAppointments(data as Appointment[]);
      }
    };
    if (businessId) fetch();
  }, [businessId, dayStart.toISOString(), dayEnd.toISOString()]);

  // Real‑time subscription for changes to this business's appointments
  useEffect(() => {
    if (!businessId) return;

    const channel = supabase
      .channel(`appointments-${businessId}-${dayStart.toISOString()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `business_id=eq.${businessId}`,
        },
        (payload) => {
          const newAppt = payload.new as Appointment;
          const oldAppt = payload.old as Appointment;

          setAppointments((prev) => {
            switch (payload.eventType) {
              case 'INSERT':
                // Only keep appointments that fall on the selected day
                if (
                  new Date(newAppt.start_time) >= dayStart &&
                  new Date(newAppt.start_time) <= dayEnd
                ) {
                  return [...prev, newAppt];
                }
                return prev;
              case 'UPDATE':
                // Replace the matching appointment (if still on same day)
                return prev.map((a) => (a.id === oldAppt.id ? newAppt : a));
              case 'DELETE':
                return prev.filter((a) => a.id !== oldAppt.id);
              default:
                return prev;
            }
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId, dayStart.toISOString(), dayEnd.toISOString()]);

  return appointments;
};
