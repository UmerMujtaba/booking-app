import { supabase } from '@/lib/supabase';

interface LogActivityInput {
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}

export async function logActivity({
  action,
  entityType,
  entityId = null,
  metadata = {},
}: LogActivityInput): Promise<void> {
  const { error } = await supabase.rpc('log_activity', {
    p_action: action,
    p_entity_type: entityType,
    p_entity_id: entityId,
    p_metadata: metadata,
  });

  if (error) {
    console.warn('Activity log failed:', error.message);
  }
}
