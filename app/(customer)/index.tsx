import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BusinessCard } from "@/components/BusinessCard";
import { Business } from "@/features/booking/types";
import { supabase } from "@/lib/supabase";
import { useColors } from "@/hooks/useColors";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/features/auth/AuthContext";
import { getGreeting } from "@/constants";
import { rs, normalize, isIos } from "@/lib/responsive";
import { router } from "expo-router";

const CATEGORIES = [
  "All",
  "Barber",
  "Salon",
  // "Spa",
  // "Nails",
  // "Massage",
  // "Skincare",
];

async function fetchBusinesses(
  category: string,
  search: string,
  location: string | null,
): Promise<Business[]> {
  let query = supabase
    .from("businesses")
    .select("*")
    .eq("approved", true)
    .order("created_at", { ascending: false });

  if (category !== "All") query = query.eq("category", category);

  if (location) {
    query = query.ilike("address", `%${location}%`);
  }

  if (search.trim()) {
    const s = `%${search.trim()}%`;
    query = query.or(`name.ilike.${s},address.ilike.${s}`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Business[];
}

export default function DiscoverScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);

  const { data: locations = [] } = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const { data } = await supabase
        .from("locations")
        .select("name")
        .order("name");
      return (data || []).map((l) => l.name);
    },
  });
  // console.log("🚀 ~ DiscoverScreen ~ locations:", locations);

  const {
    data: businesses = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["businesses", selectedCategory, search, selectedLocation],
    queryFn: () => fetchBusinesses(selectedCategory, search, selectedLocation),
  });
  // console.log(
  //   "🚀 ~ DiscoverScreen ~ businesses:",
  //   JSON.stringify(businesses, null, 2),
  // );

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 12,
            // marginHorizontal: 20,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.headerTop}>
          <View>
            <Text
              style={[
                styles.greeting,
                {
                  color: colors.mutedForeground,
                  fontFamily: "Inter_400Regular",
                },
              ]}
            >
              {getGreeting()},
            </Text>
            <Text
              style={[
                styles.name,
                { color: colors.text, fontFamily: "Inter_700Bold" },
              ]}
            >
              {profile?.full_name?.split(" ")[0] ?? "Friend"}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push("/profile")}
            style={[
              styles.avatarWrap,
              { backgroundColor: colors.primary + "18" },
            ]}
          >
            <Feather name="user" size={rs(22)} color={colors.primary} />
          </Pressable>
        </View>

        <View
          style={[
            styles.searchBar,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Feather name="search" size={rs(18)} color={colors.mutedForeground} />
          <TextInput
            style={[
              styles.searchInput,
              { color: colors.text, fontFamily: "Inter_400Regular" },
            ]}
            value={search}
            onChangeText={setSearch}
            placeholder={t("searchPlaceholder")}
            placeholderTextColor={colors.mutedForeground}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <Feather name="x" size={rs(16)} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>

        <View style={styles.categoryRowContainer}>
          {/* <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroll}
            contentContainerStyle={styles.categoryContent}
          > */}
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat}
              style={[
                styles.categoryChip,
                {
                  backgroundColor:
                    selectedCategory === cat ? colors.primary : colors.card,
                  borderColor:
                    selectedCategory === cat ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text
                style={[
                  styles.categoryText,
                  {
                    color: selectedCategory === cat ? "#fff" : colors.text,
                    fontFamily:
                      selectedCategory === cat
                        ? "Inter_600SemiBold"
                        : "Inter_400Regular",
                  },
                ]}
              >
                {cat === "All" ? t("allCategories") : cat}
              </Text>
            </Pressable>
          ))}
          <View style={{ flex: 1 }} />
          {/* </ScrollView> */}
          <Pressable
            style={[
              styles.filterBtn,
              {
                backgroundColor: selectedLocation
                  ? colors.primary
                  : colors.card,
                borderColor: selectedLocation ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setIsFilterModalVisible(true)}
          >
            <Feather
              name="map-pin"
              size={rs(18)}
              color={selectedLocation ? "#fff" : colors.text}
            />
          </Pressable>
        </View>
      </View>

      {/* Location Filter Modal */}
      {isFilterModalVisible && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 100 }]}>
          <Pressable
            style={[
              styles.modalOverlay,
              { backgroundColor: "rgba(0,0,0,0.5)" },
            ]}
            onPress={() => setIsFilterModalVisible(false)}
          />
          <View
            style={[
              styles.filterModal,
              {
                backgroundColor: colors.background,
                borderTopColor: colors.border,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text
                style={[
                  styles.modalTitle,
                  { color: colors.text, fontFamily: "Inter_700Bold" },
                ]}
              >
                Select Location
              </Text>
              <Pressable onPress={() => setIsFilterModalVisible(false)}>
                <Feather name="x" size={rs(24)} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.locationList}>
              <Pressable
                style={[
                  styles.locationItem,
                  { borderBottomColor: colors.border },
                ]}
                onPress={() => {
                  setSelectedLocation(null);
                  setIsFilterModalVisible(false);
                }}
              >
                <Text
                  style={[
                    styles.locationText,
                    {
                      color: !selectedLocation ? colors.primary : colors.text,
                      fontFamily: !selectedLocation
                        ? "Inter_600SemiBold"
                        : "Inter_400Regular",
                    },
                  ]}
                >
                  All Locations
                </Text>
                {!selectedLocation && (
                  <Feather name="check" size={rs(18)} color={colors.primary} />
                )}
              </Pressable>

              {locations.map((loc) => (
                <Pressable
                  key={loc}
                  style={[
                    styles.locationItem,
                    { borderBottomColor: colors.border },
                  ]}
                  onPress={() => {
                    setSelectedLocation(loc);
                    setIsFilterModalVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.locationText,
                      {
                        color:
                          selectedLocation === loc
                            ? colors.primary
                            : colors.text,
                        fontFamily:
                          selectedLocation === loc
                            ? "Inter_600SemiBold"
                            : "Inter_400Regular",
                      },
                    ]}
                  >
                    {loc}
                  </Text>
                  {selectedLocation === loc && (
                    <Feather
                      name="check"
                      size={rs(18)}
                      color={colors.primary}
                    />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Feather
            name="wifi-off"
            size={rs(36)}
            color={colors.mutedForeground}
          />
          <Text
            style={[
              styles.emptyText,
              { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
            ]}
          >
            {t("error")}
          </Text>
          <Pressable
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
            onPress={() => refetch()}
          >
            <Text
              style={[styles.retryText, { fontFamily: "Inter_600SemiBold" }]}
            >
              {t("retry")}
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={businesses}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <BusinessCard business={item} />}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Text
              style={[
                styles.sectionTitle,
                { color: colors.text, fontFamily: "Inter_600SemiBold" },
              ]}
            >
              {t("businesses")} ({businesses.length})
            </Text>
          }
          ListEmptyComponent={
            <View style={styles.center}>
              name="map-pin" size={rs(36)}
              color={colors.mutedForeground}
              <Text
                style={[
                  styles.emptyTitle,
                  { color: colors.text, fontFamily: "Inter_600SemiBold" },
                ]}
              >
                {t("noBusinesses")}
              </Text>
              <Text
                style={[
                  styles.emptyText,
                  {
                    color: colors.mutedForeground,
                    fontFamily: "Inter_400Regular",
                  },
                ]}
              >
                {t("noBusinessesDesc")}
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
          scrollEnabled={!!businesses.length}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingBottom: rs(12), borderBottomWidth: 0.5 },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: rs(20),
    marginBottom: rs(14),
  },
  greeting: { fontSize: normalize(14) },
  name: { fontSize: normalize(22), marginTop: rs(2) },
  avatarWrap: {
    width: rs(44),
    height: rs(44),
    borderRadius: rs(22),
    alignItems: "center",
    justifyContent: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: rs(16),
    borderRadius: rs(12),
    borderWidth: 1,
    paddingHorizontal: rs(14),
    paddingVertical: isIos() ? rs(14) : rs(4),

    gap: rs(10),
    marginBottom: rs(14),
  },
  searchInput: { flex: 1, fontSize: normalize(15) },
  categoryRowContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: rs(20),
  },
  categoryScroll: { flexGrow: 0 },
  categoryContent: {
    paddingHorizontal: rs(16),
    gap: rs(8),
    flexDirection: "row",
  },
  categoryChip: {
    paddingHorizontal: rs(14),
    paddingVertical: rs(4),
    borderRadius: rs(20),
    marginRight: rs(8),
    borderWidth: 1,
  },
  categoryText: { fontSize: normalize(14) },
  filterBtn: {
    width: rs(40),
    height: rs(40),
    borderRadius: rs(10),
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  filterModal: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: rs(24),
    borderTopRightRadius: rs(24),
    borderTopWidth: 1,
    maxHeight: "70%",
    paddingBottom: rs(40),
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: rs(20),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  modalTitle: { fontSize: normalize(18) },
  locationList: { padding: rs(10) },
  locationItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: rs(16),
    paddingHorizontal: rs(10),
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  locationText: { fontSize: normalize(16) },
  list: { paddingTop: rs(16), paddingBottom: rs(100) },
  sectionTitle: {
    fontSize: normalize(16),
    marginHorizontal: rs(16),
    marginBottom: rs(12),
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: rs(32),
    gap: rs(12),
    marginTop: rs(60),
  },
  emptyTitle: { fontSize: normalize(18) },
  emptyText: { fontSize: normalize(15), textAlign: "center" },
  retryBtn: {
    paddingHorizontal: rs(24),
    paddingVertical: rs(12),
    borderRadius: rs(10),
  },
  retryText: { color: "#fff", fontSize: normalize(15) },
});
