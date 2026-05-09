import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { Business } from "@/features/booking/types";
import { useColors } from "@/hooks/useColors";

interface Props {
  business: Business;
}

const CATEGORY_ICONS: Record<string, string> = {
  Barber: "scissors",
  Salon: "star",
  Spa: "heart",
  Nails: "feather",
  Massage: "activity",
  Skincare: "droplet",
};

export function BusinessCard({ business }: Props) {
  const colors = useColors();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.92 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
      ]}
      onPress={() => router.push(`/(customer)/business/${business.id}`)}
    >
      {business.image_url ? (
        <Image source={{ uri: business.image_url }} style={styles.image} />
      ) : (
        <View
          style={[
            styles.imagePlaceholder,
            { backgroundColor: colors.primary + "18" },
          ]}
        >
          <Feather
            name={
              (CATEGORY_ICONS[business.category] ??
                "briefcase") as keyof typeof Feather.glyphMap
            }
            size={36}
            color={colors.primary}
          />
        </View>
      )}

      <View style={styles.info}>
        <View style={styles.topRow}>
          <Text
            style={[
              styles.name,
              { color: colors.text, fontFamily: "Inter_600SemiBold" },
            ]}
            numberOfLines={1}
          >
            {business.name}
          </Text>
          <View
            style={[
              styles.categoryBadge,
              { backgroundColor: colors.primary + "14" },
            ]}
          >
            <Text
              style={[
                styles.categoryText,
                { color: colors.primary, fontFamily: "Inter_500Medium" },
              ]}
            >
              {business.category}
            </Text>
          </View>
        </View>

        {business.bio ? (
          <Text
            style={[
              styles.bio,
              { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
            ]}
            numberOfLines={2}
          >
            {business.bio}
          </Text>
        ) : null}

        <View style={styles.footer}>
          <Feather name="map-pin" size={12} color={colors.mutedForeground} />
          <Text
            style={[
              styles.footerText,
              { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
            ]}
            numberOfLines={1}
          >
            {business.address || "No address"}
          </Text>
          <View style={styles.dot} />
          <Feather name="clock" size={12} color={colors.accent} />
          <Text
            style={[
              styles.footerText,
              { color: colors.accent, fontFamily: "Inter_500Medium" },
            ]}
          >
            Available
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  image: {
    width: "100%",
    height: 160,
    resizeMode: "cover",
  },
  imagePlaceholder: {
    width: "100%",
    height: 160,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    padding: 16,
    gap: 6,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  name: {
    fontSize: 17,
    flex: 1,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  categoryText: {
    fontSize: 12,
  },
  bio: {
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  footerText: {
    fontSize: 12,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#9CA3AF",
    marginHorizontal: 4,
  },
});
