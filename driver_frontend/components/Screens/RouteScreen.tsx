import { AntDesign, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
} from "react-native";
import { ActivityIndicator } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { RouteList } from "../ui/Route/RouteList";
import { Link } from "expo-router";
import { AgentRequestsFetcher, DeliveryStatusChange } from "@/Lib/fetchDataServices";
import { useState, useCallback, useEffect } from "react";
import Toast from "react-native-toast-message";

const RouteScreen = () => {
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDeliveries = useCallback(
    async (showToast = true) => {
      try {
        setError(null);
        if (!refreshing) setIsLoading(true);

        const data = await AgentRequestsFetcher();
        setDeliveries(Array.isArray(data) ? data : []);

        if (showToast) {
          Toast.show({
            type: data.length > 0 ? "success" : "info",
            text1: data.length > 0 ? "Success" : "Info",
            text2:
              data.length > 0
                ? `Loaded ${data.length} deliveries`
                : "No deliveries found",
            position: "top",
            visibilityTime: 3000,
          });
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch deliveries";
        setError(message);
        if (showToast) {
          Toast.show({ type: "error", text1: "Error", text2: message, position: "top" });
        }
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [refreshing]
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDeliveries(true);
  }, [fetchDeliveries]);

  const handleStatusUpdate = useCallback(
    async (deliveryId: string, newStatus: string) => {
      try {
        await DeliveryStatusChange(deliveryId, newStatus);
        setDeliveries((prev) =>
          prev.map((d) =>
            (d.id || d.delivery_id) === deliveryId
              ? { ...d, status: newStatus }
              : d
          )
        );
        Toast.show({ type: "success", text1: "Updated", text2: `Status changed to ${newStatus}`, position: "top" });
      } catch {
        Toast.show({ type: "error", text1: "Failed", text2: "Could not update status", position: "top" });
      }
    },
    []
  );

  useEffect(() => {
    fetchDeliveries(false);
  }, []);

  const getDeliveryStats = () => {
    const completed = deliveries.filter(
      (d) => d.status === "completed" || d.status === "delivered"
    ).length;
    const inProgress = deliveries.filter(
      (d) => ["in_progress", "accepted", "collected", "on_delivery"].includes(d.status)
    ).length;
    const pending = deliveries.filter(
      (d) => d.status === "pending" || d.status === "offered"
    ).length;

    return { completed, inProgress, pending, total: deliveries.length };
  };

  const stats = getDeliveryStats();

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#FFD86B" />
          <Text className="text-gray-600 mt-4 text-lg">
            Loading your route...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !deliveries.length) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center p-6">
          <AntDesign name="exclamationcircleo" size={64} color="#EF4444" />
          <Text className="text-red-600 font-bold text-2xl mt-4">Oops!</Text>
          <Text className="text-gray-600 text-center mt-2 text-lg leading-6">
            {error}
          </Text>
          <TouchableOpacity
            className="mt-6 bg-[#FFD86B] rounded-lg px-6 py-3"
            onPress={() => fetchDeliveries(true)}
          >
            <Text className="text-black font-bold">Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="bg-white px-4 py-6 shadow-sm">
          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center flex-1">
              <Link href="/(tabs)" asChild>
                <TouchableOpacity className="rounded-lg p-2 mr-3 bg-gray-100">
                  <AntDesign name="arrowleft" size={24} color="#111827" />
                </TouchableOpacity>
              </Link>
              <View className="flex-1">
                <Text className="text-2xl font-bold text-gray-900">
                  Route Overview
                </Text>
                <Text className="text-gray-600 mt-1">{currentDate}</Text>
              </View>
            </View>

            <TouchableOpacity
              className="flex-row items-center bg-[#FFD86B] rounded-lg px-4 py-2 shadow"
              onPress={handleRefresh}
              disabled={refreshing}
            >
              <MaterialCommunityIcons
                name={refreshing ? "loading" : "refresh"}
                size={18}
                color="black"
              />
              <Text className="text-black ml-2 font-semibold">
                {refreshing ? "Updating..." : "Refresh"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Cards */}
        <View className="px-4 py-4">
          <View className="flex-row space-x-3">
            <View className="flex-1 bg-white p-4 rounded-lg shadow-sm">
              <Text className="text-2xl font-bold text-gray-900">
                {stats.total}
              </Text>
              <Text className="text-gray-600 text-sm">Total</Text>
            </View>
            <View className="flex-1 bg-white p-4 rounded-lg shadow-sm">
              <Text className="text-2xl font-bold text-green-600">
                {stats.completed}
              </Text>
              <Text className="text-gray-600 text-sm">Completed</Text>
            </View>
            <View className="flex-1 bg-white p-4 rounded-lg shadow-sm">
              <Text className="text-2xl font-bold text-blue-600">
                {stats.inProgress}
              </Text>
              <Text className="text-gray-600 text-sm">Active</Text>
            </View>
            <View className="flex-1 bg-white p-4 rounded-lg shadow-sm">
              <Text className="text-2xl font-bold text-yellow-600">
                {stats.pending}
              </Text>
              <Text className="text-gray-600 text-sm">Pending</Text>
            </View>
          </View>
        </View>

        {/* Deliveries List */}
        <View className="px-4 pb-6">
          <View className="bg-gray-900 rounded-lg p-4 shadow-lg">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-white">
                Today&apos;s Deliveries
              </Text>
              <View className="bg-gray-700 rounded-full px-3 py-1">
                <Text className="text-[#FFD86B] text-sm font-semibold">
                  {stats.total} Total
                </Text>
              </View>
            </View>

            <RouteList
              deliveries={deliveries}
              onStatusUpdate={handleStatusUpdate}
            />
          </View>
        </View>

        {/* Action Button */}
        <View className="px-4 pb-8">
          <TouchableOpacity
            className="bg-[#FFD86B] rounded-lg px-6 py-4 shadow-lg"
            onPress={() => {
              Toast.show({ type: "info", text1: "Route Change", text2: "Request sent to dispatch", position: "top" });
            }}
          >
            <Text className="text-black text-center text-lg font-bold">
              Request Route Change
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default RouteScreen;
