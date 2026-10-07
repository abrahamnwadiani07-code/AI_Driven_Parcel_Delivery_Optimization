import { DeliveryDetailsFetcher, AcceptDelivery, DeclineDelivery, CompleteDelivery } from "@/Lib/fetchDataServices";
import AntDesign from "@expo/vector-icons/AntDesign";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { Link, useLocalSearchParams } from "expo-router";
import { useState, useCallback, useEffect } from "react";
import { Text, View, ScrollView, ActivityIndicator, Alert, TouchableOpacity, Linking, Platform } from "react-native";
import { Button } from "react-native-paper";
import Toast from "react-native-toast-message";

function addressToString(addr: any) {
  if (!addr) return "Address not available";
  if (typeof addr === "string") return addr;
  return [addr.line1, addr.line2, addr.city, addr.postcode].filter(Boolean).join(", ");
}

function EmbeddedMap({ pickup, dropoff }: { pickup: string; dropoff: string }) {
  if (Platform.OS !== "web") return null;
  const origin = encodeURIComponent(pickup);
  const destination = encodeURIComponent(dropoff);
  // Use Google Maps Embed API (free, no key needed for basic embed)
  const src = `https://www.google.com/maps/embed/v1/directions?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&origin=${origin}&destination=${destination}&mode=driving`;

  return (
    <View style={{ height: 300, borderRadius: 12, overflow: "hidden", marginBottom: 12 }}>
      <iframe
        src={src}
        style={{ border: 0, width: "100%", height: "100%" } as any}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </View>
  );
}

export default function Active() {
  const { id } = useLocalSearchParams();
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

  // Auto-refresh every 15s
  useEffect(() => {
    if (!requestId) return;
    const interval = setInterval(() => fetchDelivery(false), 15000);
    return () => clearInterval(interval);
  }, [requestId, fetchDelivery]);

  const handleAccept = async () => {
    setActionLoading(true);
    try {
      await AcceptDelivery(requestId);
      Toast.show({ type: "success", text1: "Accepted!", text2: "Delivery assigned to you", position: "top" });
      fetchDelivery();
    } catch (err: any) {
      Toast.show({ type: "error", text1: "Error", text2: err?.response?.data?.error || "Failed to accept", position: "top" });
    } finally { setActionLoading(false); }
  };

  const handleDecline = async () => {
    Alert.alert("Decline Delivery", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Decline", style: "destructive", onPress: async () => {
        setActionLoading(true);
        try {
          await DeclineDelivery(requestId);
          Toast.show({ type: "info", text1: "Declined", position: "top" });
          fetchDelivery();
        } catch (err: any) {
          Toast.show({ type: "error", text1: "Error", text2: err?.response?.data?.error || "Failed", position: "top" });
        } finally { setActionLoading(false); }
      }},
    ]);
  };

  const handleComplete = async () => {
    Alert.alert("Complete Delivery", "Confirm this delivery is complete?", [
      { text: "Cancel", style: "cancel" },
      { text: "Complete", onPress: async () => {
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

  const navigateTo = (address: string) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
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
        <Button mode="outlined" onPress={() => fetchDelivery(true)} className="mt-4">Try Again</Button>
      </View>
    );
  }

  if (!delivery) {
    return (
      <View className="flex-1 items-center justify-center p-4 bg-gray-50">
        <AntDesign name="inbox" size={48} color="#9CA3AF" />
        <Text className="text-gray-900 font-bold text-xl mt-4">Not Found</Text>
        <Link href="/(tabs)" asChild>
          <Button mode="outlined" className="mt-4">Back to Dashboard</Button>
        </Link>
      </View>
    );
  }

  const status = (delivery.status || "pending").toLowerCase();
  const isPending = ["pending", "offered", "assigned"].includes(status);
  const isActive = ["accepted", "collected", "on_delivery", "in_progress"].includes(status);
  const isDone = ["delivered", "completed", "fulfilled"].includes(status);
  const isCancelled = status === "cancelled";
  const customerName = delivery.customer_name || delivery.dropoff_contact_name || "Customer";
  const vendorName = delivery.vendor_name || delivery.pickup_contact_name || "Vendor";
  const pickupAddr = addressToString(delivery.pickup_address || delivery.vendor_address);
  const dropoffAddr = addressToString(delivery.delivery_address || delivery.dropoff_address || delivery.customer_address);
  const fee = delivery.fee ? parseFloat(delivery.fee).toFixed(2) : null;

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center p-4 mt-2 bg-white">
        <Link href="/(tabs)">
          <View className="rounded-lg p-2 mr-3 bg-gray-100">
            <AntDesign name="arrowleft" size={24} color="#111827" />
          </View>
        </Link>
        <View className="flex-1">
          <Text className="text-gray-900 font-bold text-xl">Active Delivery</Text>
          <Text className="text-sm text-gray-500">Delivery ID: {requestId.slice(0, 8).toUpperCase()}</Text>
        </View>
        {fee && (
          <View className="bg-green-100 px-3 py-1 rounded-full">
            <Text className="text-green-800 font-bold">{fee}</Text>
          </View>
        )}
      </View>

      {/* Embedded Map with directions */}
      <View className="px-4 mt-3">
        <EmbeddedMap pickup={pickupAddr} dropoff={dropoffAddr} />
      </View>

      <View className="px-4 gap-3">
        {/* Delivery info bar */}
        <View className="bg-white p-4 rounded-lg border border-gray-200">
          <View className="flex-row items-center mb-2">
            <Ionicons name="location" size={20} color="#2563eb" />
            <View className="ml-2 flex-1">
              <Text className="font-bold text-base text-gray-900" numberOfLines={2}>{dropoffAddr}</Text>
              <Text className="text-xs text-gray-500">Delivery #{requestId.slice(0, 8).toUpperCase()}</Text>
            </View>
          </View>

          <View className="flex-row justify-between items-center mt-2">
            <View className="flex-row items-center">
              <Ionicons name="time" size={18} color="#16a34a" />
              <Text className="ml-1 text-sm font-medium text-gray-700">
                ETA: {delivery.estimated_time || "Calculating..."}
              </Text>
            </View>

            {(isPending || isActive) && (
              <TouchableOpacity
                className="flex-row items-center bg-[#FFD86B] rounded-lg px-4 py-2"
                onPress={() => navigateTo(dropoffAddr)}
              >
                <AntDesign name="enviromento" size={16} color="black" />
                <Text className="text-black font-semibold text-sm ml-2">Start Delivery</Text>
              </TouchableOpacity>
            )}

            {isDone && (
              <View className="flex-row items-center bg-green-100 rounded-lg px-4 py-2">
                <AntDesign name="check" size={16} color="#166534" />
                <Text className="text-green-800 font-semibold text-sm ml-2">Completed</Text>
              </View>
            )}
          </View>

          <View className="mt-3 flex-row justify-between items-center">
            <Text className="text-xs text-gray-500">
              From: <Text className="font-medium text-gray-700">{pickupAddr}</Text>
            </Text>
            <View className={`px-3 py-1 rounded-full ${isDone ? "bg-green-100" : isActive ? "bg-blue-100" : isCancelled ? "bg-red-100" : "bg-yellow-100"}`}>
              <Text className={`text-xs font-medium ${isDone ? "text-green-800" : isActive ? "text-blue-800" : isCancelled ? "text-red-800" : "text-yellow-800"}`}>
                {delivery.source === "meal" ? "Meal" : delivery.source === "grocery" ? "Grocery" : "Delivery"}
                {" "}Priority
              </Text>
            </View>
          </View>
        </View>

        {/* Package Details */}
        <View className="bg-gray-900 p-4 rounded-lg">
          <View className="flex-row items-center mb-3">
            <MaterialCommunityIcons name="package-variant" size={22} color="white" />
            <Text className="text-white font-bold text-base ml-2">Package Details</Text>
          </View>
          <View className="flex-row gap-3 mb-3">
            <View className="flex-1 bg-gray-700 p-3 rounded-lg">
              <View className="flex-row items-center mb-1">
                <MaterialCommunityIcons name="store" size={16} color="#9CA3AF" />
                <Text className="text-gray-400 text-xs ml-1">Vendor</Text>
              </View>
              <Text className="text-white font-medium">{vendorName}</Text>
            </View>
            <View className="flex-1 bg-gray-700 p-3 rounded-lg">
              <View className="flex-row items-center mb-1">
                <MaterialCommunityIcons name="tag" size={16} color="#9CA3AF" />
                <Text className="text-gray-400 text-xs ml-1">Source</Text>
              </View>
              <Text className="text-white font-medium capitalize">{delivery.source || "Order"}</Text>
            </View>
          </View>
          {delivery.order_total && (
            <View className="bg-gray-700 p-3 rounded-lg">
              <Text className="text-gray-400 text-xs">Order Total</Text>
              <Text className="text-white font-bold text-lg">{parseFloat(delivery.order_total).toFixed(2)}</Text>
            </View>
          )}
          {(delivery.notes || delivery.special_instructions) && (
            <View className="mt-3 bg-yellow-900/30 p-3 rounded-lg">
              <Text className="text-yellow-400 text-xs font-bold mb-1">SPECIAL HANDLING</Text>
              <Text className="text-gray-300 text-sm">{delivery.notes || delivery.special_instructions}</Text>
            </View>
          )}
        </View>

        {/* Customer Information */}
        <View className="bg-gray-900 p-4 rounded-lg">
          <Text className="text-white font-bold text-base mb-3">Customer Information</Text>
          <Text className="text-white text-lg font-semibold">{customerName}</Text>
          <Text className="text-gray-400 text-sm mt-1">{dropoffAddr}</Text>

          <View className="flex-row gap-3 mt-3">
            {delivery.customer_phone && (
              <TouchableOpacity
                className="flex-1 bg-gray-700 p-3 rounded-lg flex-row items-center justify-center"
                onPress={() => Linking.openURL(`tel:${delivery.customer_phone}`)}
              >
                <MaterialCommunityIcons name="phone" size={20} color="#4ade80" />
                <Text className="text-white ml-2 font-medium">Call</Text>
              </TouchableOpacity>
            )}
            {delivery.customer_phone && (
              <TouchableOpacity
                className="flex-1 bg-gray-700 p-3 rounded-lg flex-row items-center justify-center"
                onPress={() => Linking.openURL(`sms:${delivery.customer_phone}`)}
              >
                <MaterialCommunityIcons name="message-text" size={20} color="#60a5fa" />
                <Text className="text-white ml-2 font-medium">Message</Text>
              </TouchableOpacity>
            )}
          </View>

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

        {/* Action buttons */}
        {isPending && (
          <View className="gap-2 mt-2 mb-6">
            <TouchableOpacity
              className="bg-[#FF6B35] rounded-lg py-4 flex-row items-center justify-center"
              onPress={handleAccept}
              disabled={actionLoading}
            >
              <AntDesign name="checkcircleo" size={20} color="white" />
              <Text className="text-white font-bold text-base ml-2">Accept Delivery</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="border border-red-400 rounded-lg py-4 flex-row items-center justify-center"
              onPress={handleDecline}
              disabled={actionLoading}
            >
              <AntDesign name="closecircleo" size={20} color="#DC2626" />
              <Text className="text-red-600 font-bold text-base ml-2">Decline</Text>
            </TouchableOpacity>
          </View>
        )}

        {isActive && (
          <View className="gap-2 mt-2 mb-6">
            <TouchableOpacity
              className="bg-[#10B981] rounded-lg py-4 flex-row items-center justify-center"
              onPress={handleComplete}
              disabled={actionLoading}
            >
              <MaterialCommunityIcons name="check-circle-outline" size={22} color="white" />
              <Text className="text-white font-bold text-base ml-2">Complete Delivery</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="border border-red-400 rounded-lg py-4 flex-row items-center justify-center"
              onPress={handleDecline}
              disabled={actionLoading}
            >
              <AntDesign name="closecircleo" size={20} color="#DC2626" />
              <Text className="text-red-600 font-bold text-base ml-2">Cancel Delivery</Text>
            </TouchableOpacity>
          </View>
        )}

        {isDone && (
          <View className="mt-2 mb-6">
            <View className="bg-green-100 rounded-lg py-4 flex-row items-center justify-center">
              <AntDesign name="checkcircle" size={20} color="#166534" />
              <Text className="text-green-800 font-bold text-base ml-2">Delivery Completed</Text>
            </View>
          </View>
        )}

        {isCancelled && (
          <View className="mt-2 mb-6">
            <View className="bg-red-100 rounded-lg py-4 flex-row items-center justify-center">
              <AntDesign name="closecircle" size={20} color="#b91c1c" />
              <Text className="text-red-800 font-bold text-base ml-2">Delivery Cancelled</Text>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
