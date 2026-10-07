import { DeliveryDetailsFetcher, AcceptDelivery, DeclineDelivery, CompleteDelivery, DeliveryStatusChange } from "@/Lib/fetchDataServices";
import AntDesign from "@expo/vector-icons/AntDesign";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useState, useCallback, useEffect } from "react";
import { Text, View, ScrollView, ActivityIndicator, Alert, TouchableOpacity, Linking, Platform } from "react-native";
import Toast from "react-native-toast-message";

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN || "";

function addressToString(addr: any) {
  if (!addr) return "Address not available";
  if (typeof addr === "string") return addr;
  return [addr.line1, addr.line2, addr.city, addr.postcode].filter(Boolean).join(", ");
}

function StaticMap({ pickup, dropoff }: { pickup: string; dropoff: string }) {
  if (Platform.OS !== "web") return null;
  // Use OpenStreetMap embed — free, no key needed, works everywhere
  const q = encodeURIComponent(`${pickup} to ${dropoff}`);
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=-180,-90,180,90&layer=mapnik`;

  // Better: use Mapbox static image with both points
  // We'll geocode on render — for now use a simple directions link
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(pickup)}&destination=${encodeURIComponent(dropoff)}&travelmode=driving`;

  return (
    <TouchableOpacity
      style={{ height: 250, borderRadius: 12, overflow: "hidden", marginBottom: 12, backgroundColor: "#1f2937" }}
      onPress={() => Linking.openURL(directionsUrl)}
    >
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <MaterialCommunityIcons name="map-marker-path" size={48} color="#FFD86B" />
        <Text style={{ color: "white", fontWeight: "bold", fontSize: 16, marginTop: 12 }}>
          Tap to Open Route in Google Maps
        </Text>
        <Text style={{ color: "#9CA3AF", fontSize: 12, marginTop: 4, textAlign: "center", paddingHorizontal: 20 }}>
          {pickup.substring(0, 40)}... → {dropoff.substring(0, 40)}...
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12, backgroundColor: "#374151", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}>
          <Ionicons name="navigate" size={16} color="#60a5fa" />
          <Text style={{ color: "#60a5fa", fontWeight: "600", marginLeft: 6 }}>Open Directions</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

/*
 * DELIVERY FLOW:
 * 1. pending/offered   → Driver sees: [Accept] [Decline]
 * 2. accepted          → Driver sees: [Navigate to Pickup] [Confirm Pickup]
 * 3. collected         → Driver sees: [Navigate to Customer] [Complete Delivery]
 * 4. delivered/completed → Done banner
 */

export default function Active() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const requestId = Array.isArray(id) ? id[0] : (id || "");

  const [delivery, setDelivery] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDelivery = useCallback(async (showToast = false) => {
    if (!requestId) { setError("No delivery ID"); setIsLoading(false); return; }
    try {
      setError(null);
      setIsLoading(true);
      const data = await DeliveryDetailsFetcher(requestId);
      setDelivery(data || null);
      if (showToast) {
        Toast.show({ type: data ? "success" : "info", text1: data ? "Loaded" : "Not Found", position: "top" });
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load delivery");
    } finally {
      setIsLoading(false);
    }
  }, [requestId]);

  useEffect(() => { fetchDelivery(false); }, [fetchDelivery]);

  useEffect(() => {
    if (!requestId) return;
    const interval = setInterval(() => fetchDelivery(false), 15000);
    return () => clearInterval(interval);
  }, [requestId, fetchDelivery]);

  const handleAccept = async () => {
    setActionLoading(true);
    try {
      await AcceptDelivery(requestId);
      Toast.show({ type: "success", text1: "Accepted!", text2: "Head to the pickup location", position: "top" });
      fetchDelivery();
    } catch (err: any) {
      Toast.show({ type: "error", text1: "Error", text2: err?.response?.data?.error || "Failed to accept", position: "top" });
    } finally { setActionLoading(false); }
  };

  const handleConfirmPickup = async () => {
    Alert.alert("Confirm Pickup", "Have you collected the order from the vendor?", [
      { text: "Not yet", style: "cancel" },
      { text: "Yes, Picked Up", onPress: async () => {
        setActionLoading(true);
        try {
          await DeliveryStatusChange(requestId, "collected");
          Toast.show({ type: "success", text1: "Pickup Confirmed!", text2: "Now head to the customer", position: "top" });
          fetchDelivery();
        } catch (err: any) {
          Toast.show({ type: "error", text1: "Error", text2: err?.response?.data?.error || "Failed", position: "top" });
        } finally { setActionLoading(false); }
      }},
    ]);
  };

  const handleComplete = async () => {
    Alert.alert("Complete Delivery", "Has the customer received the order?", [
      { text: "Cancel", style: "cancel" },
      { text: "Yes, Delivered", onPress: async () => {
        setActionLoading(true);
        try {
          await CompleteDelivery(requestId);
          Toast.show({ type: "success", text1: "Delivery Complete!", text2: "Great job!", position: "top" });
          fetchDelivery();
        } catch (err: any) {
          Toast.show({ type: "error", text1: "Error", text2: err?.response?.data?.error || "Failed", position: "top" });
        } finally { setActionLoading(false); }
      }},
    ]);
  };

  const handleDecline = async () => {
    Alert.alert("Decline Delivery", "Are you sure you want to decline?", [
      { text: "Cancel", style: "cancel" },
      { text: "Decline", style: "destructive", onPress: async () => {
        setActionLoading(true);
        try {
          await DeclineDelivery(requestId);
          Toast.show({ type: "info", text1: "Declined", position: "top" });
          router.back();
        } catch (err: any) {
          Toast.show({ type: "error", text1: "Error", text2: err?.response?.data?.error || "Failed", position: "top" });
        } finally { setActionLoading(false); }
      }},
    ]);
  };

  const navigateTo = (address: string) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}&travelmode=driving`;
    Linking.openURL(url);
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text className="text-gray-500 mt-4">Loading delivery...</Text>
      </View>
    );
  }

  if (error && !delivery) {
    return (
      <View className="flex-1 items-center justify-center p-4 bg-gray-50">
        <AntDesign name="exclamationcircleo" size={48} color="#EF4444" />
        <Text className="text-red-600 font-bold text-xl mt-4">Error</Text>
        <Text className="text-gray-600 text-center mt-2">{error}</Text>
        <TouchableOpacity className="mt-4 bg-gray-200 px-6 py-3 rounded-lg" onPress={() => fetchDelivery(true)}>
          <Text className="font-semibold">Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!delivery) {
    return (
      <View className="flex-1 items-center justify-center p-4 bg-gray-50">
        <AntDesign name="inbox" size={48} color="#9CA3AF" />
        <Text className="text-gray-900 font-bold text-xl mt-4">Not Found</Text>
        <Link href="/(tabs)" asChild>
          <TouchableOpacity className="mt-4 bg-gray-200 px-6 py-3 rounded-lg">
            <Text className="font-semibold">Back to Dashboard</Text>
          </TouchableOpacity>
        </Link>
      </View>
    );
  }

  const status = (delivery.status || "pending").toLowerCase();
  const isPending = ["pending", "offered", "assigned"].includes(status);
  const isAccepted = status === "accepted";
  const isCollected = ["collected", "on_delivery", "in_progress"].includes(status);
  const isDone = ["delivered", "completed", "fulfilled"].includes(status);
  const isCancelled = status === "cancelled";
  const customerName = delivery.customer_name || delivery.dropoff_contact_name || "Customer";
  const vendorName = delivery.vendor_name || delivery.pickup_contact_name || "Vendor";
  const pickupAddr = addressToString(delivery.pickup_address || delivery.vendor_address);
  const dropoffAddr = addressToString(delivery.delivery_address || delivery.dropoff_address || delivery.customer_address);
  const fee = delivery.fee ? parseFloat(delivery.fee).toFixed(2) : null;

  // Step indicator
  const steps = [
    { label: "Assigned", done: !isPending },
    { label: "Picked Up", done: isCollected || isDone },
    { label: "Delivered", done: isDone },
  ];

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View className="flex-row items-center p-4 bg-white border-b border-gray-200">
        <Link href="/(tabs)">
          <View className="rounded-lg p-2 mr-3 bg-gray-100">
            <AntDesign name="arrowleft" size={24} color="#111827" />
          </View>
        </Link>
        <View className="flex-1">
          <Text className="text-gray-900 font-bold text-xl">Active Delivery</Text>
          <Text className="text-sm text-gray-500">ID: {requestId.slice(0, 8).toUpperCase()}</Text>
        </View>
        {fee && (
          <View className="bg-green-100 px-3 py-1.5 rounded-full">
            <Text className="text-green-800 font-bold text-base">{fee}</Text>
          </View>
        )}
      </View>

      {/* Progress Steps */}
      <View className="bg-white px-4 py-3 flex-row items-center justify-center gap-1 border-b border-gray-200">
        {steps.map((step, i) => (
          <View key={i} className="flex-row items-center">
            <View className={`w-7 h-7 rounded-full items-center justify-center ${step.done ? "bg-green-500" : "bg-gray-300"}`}>
              {step.done ? (
                <AntDesign name="check" size={14} color="white" />
              ) : (
                <Text className="text-white font-bold text-xs">{i + 1}</Text>
              )}
            </View>
            <Text className={`ml-1 text-xs font-medium ${step.done ? "text-green-700" : "text-gray-400"}`}>
              {step.label}
            </Text>
            {i < steps.length - 1 && (
              <View className={`w-8 h-0.5 mx-1 ${step.done ? "bg-green-500" : "bg-gray-300"}`} />
            )}
          </View>
        ))}
      </View>

      {/* Map */}
      <View className="px-4 mt-3">
        <StaticMap
          pickup={isCollected ? dropoffAddr : pickupAddr}
          dropoff={isCollected ? dropoffAddr : pickupAddr}
        />
      </View>

      <View className="px-4 gap-3">
        {/* ── STEP 1: PENDING — Accept or Decline ────────────────── */}
        {isPending && (
          <>
            <View className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
              <Text className="text-yellow-800 font-bold text-center text-lg">New Delivery Request</Text>
              <Text className="text-yellow-700 text-center text-sm mt-1">
                From {vendorName} to {customerName}
              </Text>
            </View>

            {/* Pickup */}
            <LocationCard icon="store" iconColor="#10B981" label="PICKUP" title={vendorName} address={pickupAddr} />
            {/* Dropoff */}
            <LocationCard icon="map-marker" iconColor="#FF6B35" label="DROPOFF" title={customerName} address={dropoffAddr} />

            <View className="gap-2 mt-2">
              <ActionButton color="#FF6B35" icon="checkcircleo" label="Accept Delivery" onPress={handleAccept} loading={actionLoading} />
              <ActionButton color="transparent" icon="closecircleo" label="Decline" onPress={handleDecline} loading={actionLoading} outline textColor="#DC2626" />
            </View>
          </>
        )}

        {/* ── STEP 2: ACCEPTED — Navigate to Pickup, Confirm Pickup ── */}
        {isAccepted && (
          <>
            <View className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <Text className="text-blue-800 font-bold text-center text-lg">Head to Pickup</Text>
              <Text className="text-blue-700 text-center text-sm mt-1">
                Collect the order from {vendorName}
              </Text>
            </View>

            <LocationCard icon="store" iconColor="#10B981" label="PICKUP LOCATION" title={vendorName} address={pickupAddr}
              actionLabel="Navigate to Pickup" onAction={() => navigateTo(pickupAddr)} />

            <LocationCard icon="map-marker" iconColor="#9CA3AF" label="THEN DELIVER TO" title={customerName} address={dropoffAddr} />

            <View className="gap-2 mt-2">
              <ActionButton color="#10B981" icon="checkcircleo" label="Confirm Pickup — Order Collected" onPress={handleConfirmPickup} loading={actionLoading} />
              <ActionButton color="transparent" icon="closecircleo" label="Cancel Delivery" onPress={handleDecline} loading={actionLoading} outline textColor="#DC2626" />
            </View>
          </>
        )}

        {/* ── STEP 3: COLLECTED — Navigate to Customer, Complete ──── */}
        {isCollected && (
          <>
            <View className="bg-indigo-50 border border-indigo-200 p-4 rounded-lg">
              <Text className="text-indigo-800 font-bold text-center text-lg">Deliver to Customer</Text>
              <Text className="text-indigo-700 text-center text-sm mt-1">
                Order picked up from {vendorName}
              </Text>
            </View>

            <LocationCard icon="check-circle" iconColor="#10B981" label="PICKED UP FROM" title={vendorName} address={pickupAddr} done />

            <LocationCard icon="map-marker" iconColor="#FF6B35" label="DELIVER TO" title={customerName} address={dropoffAddr}
              actionLabel="Navigate to Customer" onAction={() => navigateTo(dropoffAddr)}
              phone={delivery.customer_phone} />

            {/* Package Details */}
            <View className="bg-gray-900 p-4 rounded-lg">
              <View className="flex-row items-center mb-3">
                <MaterialCommunityIcons name="package-variant" size={22} color="white" />
                <Text className="text-white font-bold text-base ml-2">Package Details</Text>
              </View>
              <View className="flex-row gap-3">
                <View className="flex-1 bg-gray-700 p-3 rounded-lg">
                  <Text className="text-gray-400 text-xs">Vendor</Text>
                  <Text className="text-white font-medium">{vendorName}</Text>
                </View>
                <View className="flex-1 bg-gray-700 p-3 rounded-lg">
                  <Text className="text-gray-400 text-xs">Order Total</Text>
                  <Text className="text-white font-bold text-lg">
                    {delivery.order_total ? parseFloat(delivery.order_total).toFixed(2) : "--"}
                  </Text>
                </View>
              </View>
              {(delivery.notes || delivery.special_instructions) && (
                <View className="mt-3 bg-yellow-900/30 p-3 rounded-lg">
                  <Text className="text-yellow-400 text-xs font-bold">SPECIAL HANDLING</Text>
                  <Text className="text-gray-300 text-sm mt-1">{delivery.notes || delivery.special_instructions}</Text>
                </View>
              )}
            </View>

            {/* Customer Info */}
            <View className="bg-gray-900 p-4 rounded-lg">
              <Text className="text-white font-bold text-base mb-2">Customer Information</Text>
              <Text className="text-white text-lg font-semibold">{customerName}</Text>
              <Text className="text-gray-400 text-sm mt-1">{dropoffAddr}</Text>

              {delivery.customer_phone && (
                <View className="flex-row gap-3 mt-3">
                  <TouchableOpacity
                    className="flex-1 bg-gray-700 p-3 rounded-lg flex-row items-center justify-center"
                    onPress={() => Linking.openURL(`tel:${delivery.customer_phone}`)}
                  >
                    <MaterialCommunityIcons name="phone" size={20} color="#4ade80" />
                    <Text className="text-white ml-2 font-medium">Call</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-1 bg-gray-700 p-3 rounded-lg flex-row items-center justify-center"
                    onPress={() => Linking.openURL(`sms:${delivery.customer_phone}`)}
                  >
                    <MaterialCommunityIcons name="message-text" size={20} color="#60a5fa" />
                    <Text className="text-white ml-2 font-medium">Message</Text>
                  </TouchableOpacity>
                </View>
              )}

              {delivery.delivery_instructions && (
                <View className="mt-3 bg-orange-900/30 p-3 rounded-lg flex-row items-start">
                  <MaterialCommunityIcons name="alert-circle" size={18} color="#fb923c" />
                  <View className="ml-2 flex-1">
                    <Text className="text-orange-400 text-xs font-bold">DELIVERY INSTRUCTIONS</Text>
                    <Text className="text-gray-300 text-sm mt-1">{delivery.delivery_instructions}</Text>
                  </View>
                </View>
              )}
            </View>

            <View className="gap-2 mt-2">
              <ActionButton color="#FFD86B" icon="checkcircleo" label="Complete Delivery" onPress={handleComplete} loading={actionLoading} dark />
            </View>
          </>
        )}

        {/* ── STEP 4: DONE ──────────────────────────────────────── */}
        {isDone && (
          <View className="mt-2">
            <View className="bg-green-100 rounded-lg py-5 items-center">
              <AntDesign name="checkcircle" size={36} color="#166534" />
              <Text className="text-green-800 font-bold text-xl mt-2">Delivery Completed!</Text>
              <Text className="text-green-700 text-sm mt-1">
                {vendorName} → {customerName}
              </Text>
            </View>
            <Link href="/(tabs)" asChild>
              <TouchableOpacity className="mt-4 bg-gray-900 rounded-lg py-4 items-center">
                <Text className="text-white font-bold text-base">Back to Dashboard</Text>
              </TouchableOpacity>
            </Link>
          </View>
        )}

        {isCancelled && (
          <View className="mt-2">
            <View className="bg-red-100 rounded-lg py-5 items-center">
              <AntDesign name="closecircle" size={36} color="#b91c1c" />
              <Text className="text-red-800 font-bold text-xl mt-2">Delivery Cancelled</Text>
            </View>
            <Link href="/(tabs)" asChild>
              <TouchableOpacity className="mt-4 bg-gray-900 rounded-lg py-4 items-center">
                <Text className="text-white font-bold text-base">Back to Dashboard</Text>
              </TouchableOpacity>
            </Link>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

/* ── Reusable sub-components ──────────────────────────────────────── */

function LocationCard({ icon, iconColor, label, title, address, actionLabel, onAction, phone, done }: any) {
  return (
    <View className={`bg-white p-4 rounded-lg border ${done ? "border-green-200" : "border-gray-200"}`}>
      <View className="flex-row items-center mb-2">
        <View className={`w-3 h-3 rounded-full mr-2`} style={{ backgroundColor: iconColor }} />
        <Text className="text-xs font-bold text-gray-400 uppercase">{label}</Text>
      </View>
      <Text className="text-base font-semibold text-gray-900">{title}</Text>
      <Text className="text-sm text-gray-500 mt-1">{address}</Text>

      {phone && (
        <TouchableOpacity className="mt-2 flex-row items-center" onPress={() => Linking.openURL(`tel:${phone}`)}>
          <MaterialCommunityIcons name="phone" size={16} color="#3b82f6" />
          <Text className="text-blue-600 text-sm ml-1">{phone}</Text>
        </TouchableOpacity>
      )}

      {actionLabel && onAction && (
        <TouchableOpacity
          className="mt-3 bg-blue-50 p-3 rounded-lg flex-row items-center justify-center"
          onPress={onAction}
        >
          <Ionicons name="navigate" size={16} color="#2563eb" />
          <Text className="text-blue-600 font-semibold text-sm ml-2">{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function ActionButton({ color, icon, label, onPress, loading, outline, textColor, dark }: any) {
  const bg = outline ? "transparent" : color;
  const border = outline ? `border border-red-400` : "";
  const tc = textColor || (dark ? "black" : "white");

  return (
    <TouchableOpacity
      className={`rounded-lg py-4 flex-row items-center justify-center ${border}`}
      style={{ backgroundColor: bg }}
      onPress={onPress}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color={tc} />
      ) : (
        <>
          <AntDesign name={icon} size={20} color={tc} />
          <Text style={{ color: tc }} className="font-bold text-base ml-2">{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}
