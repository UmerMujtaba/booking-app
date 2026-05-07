import { StyleSheet } from "react-native";


export const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, marginBottom: 12 },
  title: { fontSize: 26 },
  subtitle: { marginTop: 4, fontSize: 14 },
  section: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: 1,
  },
  signOutText: { fontSize: 16 },
  sectionTitle: { fontSize: 17 },
  ownerRow: { gap: 8 },
  ownerChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  bioInput: { minHeight: 70, textAlignVertical: "top" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  rowTitle: { fontSize: 15 },
  actionBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  actionText: { color: "#fff", fontFamily: "Inter_600SemiBold" },
  inlineActions: { flexDirection: "row", gap: 8 },
  smallBtn: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
  },
  logRow: { flexDirection: "row", gap: 8, alignItems: "center" },
});
  