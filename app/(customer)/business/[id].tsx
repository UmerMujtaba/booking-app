import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ServiceCard } from "@/components/ServiceCard";
import { Business, Service } from "@/features/booking/types";
// import { useFocusEffect } from "@react-navigation/native";
import { useColors } from "@/hooks/useColors";
import { useTranslation } from "@/hooks/useTranslation";
import { normalize, rs } from "@/lib/responsive";
import { supabase } from "@/lib/supabase";
import { StyleSheet } from "react-native";

async function fetchBusiness(id: string): Promise<Business> {
  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as Business;
}

async function fetchServices(businessId: string): Promise<Service[]> {
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("business_id", businessId)
    .order("price");
  if (error) throw error;
  return (data ?? []) as Service[];
}

export default function BusinessDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  // useFocusEffect(() => {
  //   setSelectedService(null);
  // });

  const { data: business, isLoading: bizLoading } = useQuery({
    queryKey: ["business", id],
    queryFn: () => fetchBusiness(id!),
    enabled: !!id,
  });

  const { data: services = [], isLoading: svcLoading } = useQuery({
    queryKey: ["services", id],
    queryFn: () => fetchServices(id!),
    enabled: !!id,
  });

  if (bizLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!business) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {business.image_url ? (
          <Image
            source={{ uri: business.image_url }}
            style={styles.heroImage}
          />
        ) : (
          <View
            style={[
              styles.heroPlaceholder,
              { backgroundColor: colors.primary + "18" },
            ]}
          >
            <Feather name="scissors" size={48} color={colors.primary} />
          </View>
        )}

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.businessName,
                  { color: colors.text, fontFamily: "Inter_700Bold" },
                ]}
              >
                {business.name}
              </Text>
              <View
                style={[
                  styles.catBadge,
                  { backgroundColor: colors.primary + "14" },
                ]}
              >
                <Text
                  style={[
                    styles.catText,
                    { color: colors.primary, fontFamily: "Inter_500Medium" },
                  ]}
                >
                  {business.category}
                </Text>
              </View>
            </View>
          </View>

          {business.bio ? (
            <View style={styles.section}>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: colors.text, fontFamily: "Inter_600SemiBold" },
                ]}
              >
                {t("about")}
              </Text>
              <Text
                style={[
                  styles.bio,
                  {
                    color: colors.mutedForeground,
                    fontFamily: "Inter_400Regular",
                  },
                ]}
              >
                {business.bio}
              </Text>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text
              style={[
                styles.sectionTitle,
                { color: colors.text, fontFamily: "Inter_600SemiBold" },
              ]}
            >
              {t("services")}
            </Text>
            {svcLoading ? (
              <ActivityIndicator
                color={colors.primary}
                style={{ marginVertical: 16 }}
              />
            ) : services.length === 0 ? (
              <View style={styles.emptyServices}>
                <Feather name="info" size={24} color={colors.mutedForeground} />
                <Text
                  style={[
                    styles.emptyText,
                    {
                      color: colors.mutedForeground,
                      fontFamily: "Inter_400Regular",
                    },
                  ]}
                >
                  No services listed yet
                </Text>
              </View>
            ) : (
              services.map((svc) => (
                <ServiceCard
                  key={svc.id}
                  service={svc}
                  onSelect={(s) =>
                    setSelectedService(selectedService?.id === s.id ? null : s)
                  }
                  selected={selectedService?.id === svc.id}
                />
              ))
            )}
          </View>
        </View>
      </ScrollView>

      <Pressable
        style={[
          styles.backBtn,
          { top: insets.top + 12, backgroundColor: colors.card + "E0" },
        ]}
        onPress={() => router.back()}
      >
        <Feather name="arrow-left" size={22} color={colors.text} />
      </Pressable>

      {selectedService && (
        <View
          style={[
            styles.bookBar,
            {
              backgroundColor: colors.card,
              borderTopColor: colors.border,
              paddingBottom: insets.bottom + 60,
            },
          ]}
        >
          <View style={styles.bookBarLeft}>
            <Text
              style={[
                styles.bookBarService,
                { color: colors.text, fontFamily: "Inter_600SemiBold" },
              ]}
              numberOfLines={1}
            >
              {selectedService.name}
            </Text>
            <Text
              style={[
                styles.bookBarPrice,
                { color: colors.primary, fontFamily: "Inter_700Bold" },
              ]}
            >
              ${Number(selectedService.price).toFixed(0)} ·{" "}
              {selectedService.duration_minutes} {t("duration")}
            </Text>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.bookBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1 },
            ]}
            onPress={() =>
              router.push(
                `/(customer)/book/${business.id}?serviceId=${selectedService.id}`,
              )
            }
          >
            <Text style={[styles.bookBtnText, { fontFamily: "Inter_700Bold" }]}>
              {t("bookNow")}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  heroImage: { width: "100%", height: rs(260), resizeMode: "cover" },
  heroPlaceholder: {
    width: "100%",
    height: rs(260),
    alignItems: "center",
    justifyContent: "center",
  },
  content: { padding: rs(20) },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: rs(16),
  },
  businessName: { fontSize: normalize(22), marginBottom: rs(8) },
  catBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: rs(12),
    paddingVertical: rs(5),
    borderRadius: rs(20),
  },
  catText: { fontSize: normalize(10) },
  section: { marginBottom: rs(24), gap: rs(12) },
  sectionTitle: { fontSize: normalize(15) },
  bio: { fontSize: normalize(12), lineHeight: rs(18) },
  emptyServices: { alignItems: "center", gap: rs(8), paddingVertical: rs(24) },
  emptyText: { fontSize: normalize(14) },
  backBtn: {
    position: "absolute",
    left: rs(16),
    width: rs(40),
    height: rs(40),
    borderRadius: rs(20),
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: rs(4),
    elevation: 4,
  },
  bookBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: rs(20),
    paddingTop: rs(14),
    borderTopWidth: 1,
    gap: rs(12),
  },
  bookBarLeft: { flex: 1, gap: rs(2) },
  bookBarService: { fontSize: normalize(15) },
  bookBarPrice: { fontSize: normalize(13) },
  bookBtn: {
    paddingHorizontal: rs(24),
    paddingVertical: rs(14),
    borderRadius: rs(12),
  },
  bookBtnText: { color: "#fff", fontSize: normalize(13) },
});
