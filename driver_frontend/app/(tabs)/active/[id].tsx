import { DeliveryDetailsFetcher, AcceptDelivery, DeclineDelivery, CompleteDelivery } from "@/Lib/fetchDataServices";
import AntDesign from "@expo/vector-icons/AntDesign";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Link, useLocalSearchParams } from "expo-router";
import { useState, useCallback, useEffect } from "react";
import { Text, View, ScrollView, ActivityIndicator, Alert, TouchableOpacity, Linking } from "react-native";
import { Button } from "react-native-paper";
import Toast from "react-native-toast-message";

function addressToString(addr: any) {
  if (!addr) return "Address not available";
  if (typeof addr === "string") return addr;
  return [addr.line1, addr.line2, addr.city, addr.postcode].filter(Boolean).join(", ");
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

  const navigateTo = (lat: number, lng: number) => {
    if (!lat || !lng) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
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
      <View className="flex-row items-center p-4 mt-2">
        <Link href="/(tabs)">
          <View className="rounded-lg p-2 mr-3">
            <AntDesign name="back" size={28} color="#111827" />
          </View>
        </Link>
        <View className="flex-1">
          <Text className="text-gray-900 font-bold text-xl">Active Delivery</Text>
          <Text className="text-sm text-gray-500">#{requestId.slice(0, 8).toUpperCase()}</Text>
        </View>
        {fee && (
          <View className="bg-green-100 px-3 py-1 rounded-full">
            <Text className="text-green-800 font-bold">{fee}</Text>
          </View>
        )}
      </View>

      <View className="px-4 gap-3">
        {/* Status banner */}
        <View className={`p-3 rounded-lg ${isDone ? "bg-green-100" : isCancelled ? "bg-red-100" : isActive ? "bg-blue-100" : "bg-yellow-100"}`}>
          <Text className={`font-bold text-center text-base ${isDone ? "text-green-800" : isCancelled ? "text-red-800" : isActive ? "text-blue-800" : "text-yellow-800"}`}>
            {status.replace(/_/g, " ").toUpperCase()}
          </Text>
        </View>

        {/* Pickup */}
        <View className="bg-white p-4 rounded-lg border border-gray-200">
          <View className="flex-row items-center mb-2">
            <View className="w-3 h-3 rounded-full bg-green-500 mr-2" />
            <Text className="text-xs font-bold text-gray-400 uppercase">Pickup</Text>
          </View>
          <Text className="text-base font-semibold text-gray-900">{vendorName}</Text>
          <Text className="text-sm text-gray-500 mt-1">{pickupAddr}</Text>
          {(delivery.pickup_lat && delivery.pickup_lng) && (
            <TouchableOpacity className="mt-2 bg-blue-50 p-2 rounded items-center" onPress={() => navigateTo(delivery.pickup_lat, delivery.pickup_lng)}>
              <Text className="text-blue-600 font-semibold text-sm">Navigate to Pickup</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Dropoff */}
        <View className="bg-white p-4 rounded-lg border border-gray-200">
          <View className="flex-row items-center mb-2">
            <View className="w-3 h-3 rounded-full bg-orange-500 mr-2" />
            <Text className="text-xs font-bold text-gray-400 uppercase">Dropoff</Text>
          </View>
          <Text className="text-base font-semibold text-gray-900">{customerName}</Text>
          <Text className="text-sm text-gray-500 mt-1">{dropoffAddr}</Text>
          {delivery.customer_phone && (
            <TouchableOpacity className="mt-2" onPress={() => Linking.openURL(`tel:${delivery.customer_phone}`)}>
              <Text className="text-blue-600 text-sm">Call: {delivery.customer_phone}</Text>
            </TouchableOpacity>
          )}
          {(delivery.delivery_lat && delivery.delivery_lng) && (
            <TouchableOpacity className="mt-2 bg-orange-50 p-2 rounded items-center" onPress={() => navigateTo(delivery.delivery_lat, delivery.delivery_lng)}>
              <Text className="text-orange-600 font-semibold text-sm">Navigate to Customer</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Notes */}
        {(delivery.notes || delivery.special_instructions) && (
          <View className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <Text className="text-xs font-bold text-yellow-700 uppercase mb-1">Special Instructions</Text>
            <Text className="text-sm text-gray-800">{delivery.notes || delivery.special_instructions}</Text>
          </View>
        )}

        {/* Action buttons */}
        {isPending && (
          <View className="gap-2 mt-2 mb-6">
            <Button mode="elevated" onPress={handleAccept} disabled={actionLoading} buttonColor="#FF6B35" contentStyle={{ paddingVertical: 8 }} className="rounded-lg">
              <View className="flex-row items-center">
                <AntDesign name="checkcircleo" size={20} color="white" />
                <Text className="text-white font-semibold text-base ml-2">Accept Delivery</Text>
              </View>
            </Button>
            <Button mode="outlined" onPress={handleDecline} disabled={actionLoading} textColor="#DC2626" contentStyle={{ paddingVertical: 8 }} className="rounded-lg border-red-400">
              <View className="flex-row items-center">
                <AntDesign name="closecircleo" size={20} color="#DC2626" />
                <Text className="text-red-600 font-semibold text-base ml-2">Decline</Text>
              </View>
            </Button>
          </View>
        )}

        {isActive && (
          <View className="gap-2 mt-2 mb-6">
            <Button mode="elevated" onPress={handleComplete} disabled={actionLoading} buttonColor="#10B981" contentStyle={{ paddingVertical: 8 }} className="rounded-lg">
              <View className="flex-row items-center">
                <AntDesign name="checkcircleo" size={20} color="white" />
                <Text className="text-white font-semibold text-base ml-2">Complete Delivery</Text>
              </View>
            </Button>
            <Button mode="outlined" onPress={handleDecline} disabled={actionLoading} textColor="#DC2626" contentStyle={{ paddingVertical: 8 }} className="rounded-lg border-red-400">
              <View className="flex-row items-center">
                <AntDesign name="closecircleo" size={20} color="#DC2626" />
                <Text className="text-red-600 font-semibold text-base ml-2">Cancel Delivery</Text>
              </View>
            </Button>
          </View>
        )}

        {isDone && (
          <View className="mt-2 mb-6">
            <Button mode="elevated" disabled buttonColor="#10B981" contentStyle={{ paddingVertical: 8 }} className="rounded-lg">
              <View className="flex-row items-center">
                <AntDesign name="checkcircle" size={20} color="white" />
                <Text className="text-white font-semibold text-base ml-2">Delivery Completed</Text>
              </View>
            </Button>
          </View>
        )}

        {isCancelled && (
          <View className="mt-2 mb-6">
            <Button mode="elevated" disabled buttonColor="#DC2626" contentStyle={{ paddingVertical: 8 }} className="rounded-lg">
              <View className="flex-row items-center">
                <AntDesign name="closecircle" size={20} color="white" />
                <Text className="text-white font-semibold text-base ml-2">Delivery Cancelled</Text>
              </View>
            </Button>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
