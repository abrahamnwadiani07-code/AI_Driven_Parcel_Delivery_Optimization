import { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ActivityIndicator } from "react-native-paper";
import { AgentRequestsFetcher } from "@/Lib/fetchDataServices";
import DeliveryQueue from "@/components/ui/DeliveryQueue";

export default function Route() {
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await AgentRequestsFetcher();
      setDeliveries(Array.isArray(data) ? data : []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#FF6B35" />
      </SafeAreaView>
    );
  }

  const active = deliveries.filter(d => ["accepted", "collected", "on_delivery", "in_progress"].includes((d.status || "").toLowerCase()));
  const pending = deliveries.filter(d => ["pending", "offered"].includes((d.status || "").toLowerCase()));

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView
        className="p-4"
        contentContainerStyle={{ paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text className="text-2xl font-bold text-gray-900 mb-4">My Deliveries</Text>

        {active.length > 0 && (
          <View className="mb-4">
            <View className="bg-gray-900 p-4 rounded-lg">
              <Text className="text-base font-bold text-white mb-3">
                Active ({active.length})
              </Text>
              <DeliveryQueue deliveryQueue={active} onRefresh={onRefresh} />
            </View>
          </View>
        )}

        <View className="bg-gray-900 p-4 rounded-lg">
          <Text className="text-base font-bold text-white mb-3">
            Available ({pending.length})
          </Text>
          <DeliveryQueue deliveryQueue={pending} onRefresh={onRefresh} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
