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
          <View
            style={[
              styles.avatarWrap,
              { backgroundColor: colors.primary + "18" },
            ]}
          >
            <Feather name="user" size={22} color={colors.primary} />
          </View>
        </View>

        <View
          style={[
            styles.searchBar,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Feather name="search" size={18} color={colors.mutedForeground} />
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
              <Feather name="x" size={16} color={colors.mutedForeground} />
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
              size={18}
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
                <Feather name="x" size={24} color={colors.text} />
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
                  <Feather name="check" size={18} color={colors.primary} />
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
                    <Feather name="check" size={18} color={colors.primary} />
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
          <Feather name="wifi-off" size={36} color={colors.mutedForeground} />
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
              <Feather
                name="map-pin"
                size={36}
                color={colors.mutedForeground}
              />
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
  header: { paddingBottom: 12, borderBottomWidth: 0.5 },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  greeting: { fontSize: 14 },
  name: { fontSize: 22, marginTop: 2 },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 2,
    gap: 10,
    marginBottom: 14,
  },
  searchInput: { flex: 1, fontSize: 15 },
  categoryRowContainer: {
    flexDirection: "row",
    alignItems: "center",
    // paddingLeft: 0,
    // paddingRight: 16,
    // marginTop: 4,
    paddingHorizontal: 20,
  },

  categoryScroll: { flexGrow: 0 },
  categoryContent: { paddingHorizontal: 16, gap: 8, flexDirection: "row" },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  categoryText: { fontSize: 14 },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    maxHeight: "70%",
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  modalTitle: { fontSize: 18 },
  locationList: { padding: 10 },
  locationItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  locationText: { fontSize: 16 },
  list: { paddingTop: 16, paddingBottom: 100 },
  sectionTitle: { fontSize: 16, marginHorizontal: 16, marginBottom: 12 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
    marginTop: 60,
  },
  emptyTitle: { fontSize: 18 },
  emptyText: { fontSize: 15, textAlign: "center" },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  retryText: { color: "#fff", fontSize: 15 },
});
