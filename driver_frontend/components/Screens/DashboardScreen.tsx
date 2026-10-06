import { useState, useEffect, useCallback } from "react";
import { ScrollView, View, Text, Switch, TouchableOpacity, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ActivityIndicator } from "react-native-paper";
import Toast from "react-native-toast-message";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import DeliveryQueue from "../ui/DeliveryQueue";
import { DashboardDataFetcher, AgentRequestsFetcher, SetAgentStatus } from "@/Lib/fetchDataServices";

const DashboardScreen = () => {
  const { driver } = useAuth();
  const [isAvailable, setIsAvailable] = useState(false);
  const [dashData, setDashData] = useState<any>(null);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboard = useCallback(async (showToast = false) => {
    try {
      setError(null);
      setIsLoading(true);

      const [dashboard, requests] = await Promise.all([
        DashboardDataFetcher().catch(() => null),
        AgentRequestsFetcher().catch(() => []),
      ]);

      if (dashboard) setDashData(dashboard);
      setDeliveries(Array.isArray(requests) ? requests : []);

      if (showToast) {
        Toast.show({
          type: "success",
          text1: "Refreshed",
          text2: `${(requests || []).length} deliveries loaded`,
          position: "top",
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch deliveries";
      setError(message);
      if (showToast) {
        Toast.show({ type: "error", text1: "Error", text2: message, position: "top" });
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(false); }, [fetchDashboard]);

  // Auto-refresh every 30s when available
  useEffect(() => {
    if (!isAvailable) return;
    const interval = setInterval(() => fetchDashboard(false), 30000);
    return () => clearInterval(interval);
  }, [isAvailable, fetchDashboard]);

  const handleAvailabilityToggle = async (value: boolean) => {
    setIsAvailable(value);
    try {
      await SetAgentStatus(value);
      Toast.show({
        type: value ? "success" : "info",
        text1: value ? "You're Online" : "You're Offline",
        text2: value ? "You can now receive deliveries" : "You won't receive new deliveries",
        position: "top",
      });
    } catch {
      setIsAvailable(!value); // revert
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
          <Text className="text-gray-500 mt-4">Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView
        className="p-4"
        contentContainerStyle={{ paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={() => fetchDashboard(true)} />
        }
      >
        {/* Header */}
        <View className="flex-row justify-between items-center mb-6">
          <View className="flex-1">
            <Text className="text-2xl font-bold text-gray-900">Dashboard</Text>
            <Text className="text-black mt-1">
              Welcome back, {driver?.full_name || "Driver"}
            </Text>
          </View>
          <View className="flex-row items-center ml-4">
            <Switch
              value={isAvailable}
              onValueChange={handleAvailabilityToggle}
              trackColor={{ false: "#d1d5db", true: "#3b82f6" }}
              thumbColor={isAvailable ? "#2563eb" : "#f3f4f6"}
            />
            <Text className={`ml-2 font-medium ${isAvailable ? "text-blue-600" : "text-gray-500"}`}>
              {isAvailable ? "Online" : "Offline"}
            </Text>
          </View>
        </View>

        {/* Error */}
        {error && (
          <View className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <Text className="text-red-800 font-medium">Error</Text>
            <Text className="text-red-600 mt-1">{error}</Text>
          </View>
        )}

        {/* Daily Summary */}
        <View className="bg-gray-900 p-4 rounded-lg mb-4">
          <Text className="text-xl text-white text-center font-bold mb-4">
            Today's Summary
          </Text>
          <View className="space-y-3">
            <View className="flex-row gap-2">
              <SummaryCard
                icon="package-variant"
                label="Deliveries"
                value={String(dashData?.today_count ?? 0)}
              />
              <SummaryCard
                icon="currency-usd"
                label="Earned"
                value={dashData?.today_earnings ? parseFloat(dashData.today_earnings).toFixed(2) : "0.00"}
              />
            </View>
            <View className="flex-row gap-2">
              <SummaryCard
                icon="truck-delivery"
                label="Active"
                value={String(dashData?.active_count ?? 0)}
              />
              <SummaryCard
                icon="trending-up"
                label="Accept Rate"
                value={`${dashData?.acceptance_rate ?? 0}%`}
              />
            </View>
          </View>
        </View>

        {/* Delivery Queue */}
        <View className="bg-gray-900 p-4 rounded-lg mb-4">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-base font-bold text-gray-100">
              Available Deliveries
            </Text>
            <View className="bg-gray-100 px-3 py-1 rounded-full">
              <Text className="text-gray-800 text-sm font-semibold">
                {deliveries.length}{" "}
                {deliveries.length === 1 ? "Order" : "Orders"}
              </Text>
            </View>
          </View>

          <DeliveryQueue
            deliveryQueue={deliveries}
            onRefresh={() => fetchDashboard(true)}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const SummaryCard = ({
  icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) => (
  <View className="flex-1 items-center border border-white justify-center bg-gray-700 rounded-lg p-4 mb-2">
    <MaterialCommunityIcons name={icon} size={28} color="white" />
    <Text className="text-xl text-white font-bold mt-2">{value}</Text>
    <Text className="text-white text-sm">{label}</Text>
  </View>
);

export default DashboardScreen;
