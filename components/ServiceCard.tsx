import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Service } from '@/features/booking/types';
import { useColors } from '@/hooks/useColors';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  service: Service;
  onSelect?: (service: Service) => void;
  selected?: boolean;
  showActions?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function ServiceCard({ service, onSelect, selected, showActions, onEdit, onDelete }: Props) {
  const colors = useColors();
  const { t } = useTranslation();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: selected ? colors.primary + '12' : colors.card,
          borderColor: selected ? colors.primary : colors.border,
          opacity: pressed && onSelect ? 0.9 : 1,
        },
      ]}
      onPress={() => onSelect?.(service)}
    >
      <View style={styles.left}>
        <View style={[styles.iconWrap, { backgroundColor: colors.accent + '18' }]}>
          <Feather name="scissors" size={18} color={colors.accent} />
        </View>
        <View style={styles.textWrap}>
          <Text style={[styles.name, { color: colors.text, fontFamily: 'Inter_600SemiBold' }]}>
            {service.name}
          </Text>
          <View style={styles.meta}>
            <Feather name="clock" size={12} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              {service.duration_minutes} {t('duration')}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.right}>
        <Text style={[styles.price, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>
          ${Number(service.price).toFixed(0)}
        </Text>
        {showActions && (
          <View style={styles.actions}>
            <Pressable onPress={onEdit} style={styles.actionBtn} hitSlop={8}>
              <Feather name="edit-2" size={16} color={colors.mutedForeground} />
            </Pressable>
            <Pressable onPress={onDelete} style={styles.actionBtn} hitSlop={8}>
              <Feather name="trash-2" size={16} color={colors.destructive} />
            </Pressable>
          </View>
        )}
        {selected && <Feather name="check-circle" size={20} color={colors.primary} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: { flex: 1, gap: 3 },
  name: { fontSize: 15 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13 },
  right: { alignItems: 'flex-end', gap: 6 },
  price: { fontSize: 18 },
  actions: { flexDirection: 'row', gap: 12 },
  actionBtn: { padding: 2 },
});
