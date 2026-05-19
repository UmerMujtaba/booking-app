import Constants from "expo-constants";
import * as Device from "expo-device";
// import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { supabase } from "./supabase";

// Check if we are running in Expo Go
const isExpoGo = Constants.appOwnership === "expo";

// export async function registerForPushNotificationsAsync() {
//   // 1. Skip if on Web
//   if (Platform.OS === "web") return null;

//   // 2. IMPORTANT: Skip remote notifications on Android if using Expo Go (SDK 53+)
//   if (Platform.OS === "android" && isExpoGo) {
//     console.warn(
//       "Push Notifications are disabled in Expo Go on Android. Use a Development Build to test.",
//     );
//     return null;
//   }

//   let token;

//   if (Device.isDevice) {
//     const { status: existingStatus } =
//       await Notifications.getPermissionsAsync();
//     let finalStatus = existingStatus;
//     if (existingStatus !== "granted") {
//       const { status } = await Notifications.requestPermissionsAsync();
//       finalStatus = status;
//     }
//     if (finalStatus !== "granted") {
//       console.warn("Failed to get push token for push notification!");
//       return null;
//     }
//     const projectId =
//       Constants.expoConfig?.extra?.eas?.projectId ??
//       Constants.easConfig?.projectId;
//     if (!projectId) {
//       console.warn("Project ID not found in expo config");
//       return null;
//     }

//     try {
//       token = (
//         await Notifications.getExpoPushTokenAsync({
//           projectId,
//         })
//       ).data;
//     } catch (e) {
//       console.warn("Error fetching Expo Push Token:", e);
//       return null;
//     }
//   } else {
//     console.warn("Must use physical device for Push Notifications");
//     return null;
//   }

//   if (Platform.OS === "android") {
//     Notifications.setNotificationChannelAsync("default", {
//       name: "default",
//       importance: Notifications.AndroidImportance.MAX,
//       vibrationPattern: [0, 250, 250, 250],
//       lightColor: "#FF231F7C",
//     });
//   }

//   return token;
// }

export async function savePushToken(userId: string, token: string | null) {
  if (!token) return; // Don't try to save if token is null

  const { error } = await supabase
    .from("profiles")
    .update({ push_token: token })
    .eq("id", userId);

  if (error) {
    console.error("Error saving push token:", error.message);
  }
}
