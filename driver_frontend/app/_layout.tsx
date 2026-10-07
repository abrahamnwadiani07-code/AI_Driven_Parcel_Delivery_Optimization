import { Stack } from "expo-router";
import { Platform } from "react-native";
import { useEffect, useRef } from "react";
import Toast from "react-native-toast-message";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { io } from "socket.io-client";

// Location tracking is native-only — skip on web
if (Platform.OS !== "web") {
  require("@/Lib/location/location-task");
}

function LocationTracker() {
  if (Platform.OS === "web") {
    // Web: use browser Geolocation API + Socket.IO
    return <WebLocationTracker />;
  }
  const { useLocationTracking } = require("@/Lib/location/useLocationTracking");
  useLocationTracking();
  return null;
}

function WebLocationTracker() {
  const socketRef = useRef<any>(null);
  const watchRef = useRef<number | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;

    const socket = io("https://bestfoodmarket.onrender.com", {
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => console.log("[Web GPS] Socket connected"));

    // Ask for permission and start watching
    navigator.geolocation.getCurrentPosition(
      () => {
        // Permission granted — start watching
        watchRef.current = navigator.geolocation.watchPosition(
          async (pos) => {
            const { latitude, longitude } = pos.coords;
            try {
              const driverStr = await AsyncStorage.getItem("driver");
              const driver = driverStr ? JSON.parse(driverStr) : null;
              const driverId = driver?.driver_id || driver?.id;
              if (!driverId) return;

              if (socket.connected) {
                socket.emit("driver_location", { driverId, latitude, longitude });
                console.log(`[Web GPS] Sent: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
              }
            } catch {}
          },
          (err) => console.warn("[Web GPS] Watch error:", err.message),
          { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
        );
      },
      (err) => console.warn("[Web GPS] Permission denied:", err.message),
      { enableHighAccuracy: true }
    );

    return () => {
      if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
      socket.disconnect();
    };
  }, []);

  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <LocationTracker />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth" />
      </Stack>
      <Toast swipeable={true} />
    </AuthProvider>
  );
}
