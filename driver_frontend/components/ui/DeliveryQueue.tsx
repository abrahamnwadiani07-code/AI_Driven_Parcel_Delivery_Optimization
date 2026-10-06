import { MaterialCommunityIcons } from "@expo/vector-icons";
import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import React from "react";
import { FlatList, RefreshControl, TouchableOpacity, View, Text } from "react-native";

const statusColors: Record<string, { bg: string; text: string }> = {
  pending: { bg: "#fef3c7", text: "#92400e" },
  offered: { bg: "#fef3c7", text: "#92400e" },
  accepted: { bg: "#dbeafe", text: "#1e40af" },
  collected: { bg: "#e0e7ff", text: "#4338ca" },
  on_delivery: { bg: "#fce7f3", text: "#9d174d" },
  delivered: { bg: "#dcfce7", text: "#166534" },
  cancelled: { bg: "#fee2e2", text: "#b91c1c" },
};

interface DeliveryQueueProps {
  deliveryQueue: any[];
  onRefresh?: () => void;
  refreshing?: boolean;
}

const DeliveryQueue: React.FC<DeliveryQueueProps> = ({
  deliveryQueue,
  onRefresh,
  refreshing = false,
}) => {
  const router = useRouter();

  const handleNavigation = (id: string) => {
    router.push({
      pathname: "/(tabs)/active/[id]",
      params: { id },
    });
  };

  const getAddress = (item: any) => {
    const addr = item.delivery_address || item.dropoff_address;
    if (!addr) return "Address not available";
    if (typeof addr === "string") return addr;
    return [addr.line1, addr.city, addr.postcode].filter(Boolean).join(", ");
  };

  const renderItem = ({ item }: { item: any }) => {
    const status = (item.status || "pending").toLowerCase();
    const colors = statusColors[status] || statusColors.pending;
    const name = item.customer_name || item.vendor_name || "Order";
    const id = item.id || item.delivery_id;
    const fee = item.fee ? parseFloat(item.fee).toFixed(2) : null;

    return (
      <TouchableOpacity
        className="bg-gray-600 p-4 rounded-lg mb-3 shadow-sm border-[white] border"
        onPress={() => handleNavigation(id)}
      >
        <View className="flex-row justify-between items-start mb-2">
          <View className="flex-row items-center gap-2">
            <View className="flex-row items-center justify-center bg-gray-800 w-12 h-12 rounded-full">
              <Feather name="package" size={20} color="white" />
            </View>
            <View>
              <Text className="text-lg font-semibold text-white">{name}</Text>
              {item.source && (
                <Text className="text-xs text-gray-400">{item.source}</Text>
              )}
            </View>
          </View>
          <Feather name="chevron-right" size={20} color="white" className="mt-2" />
        </View>

        <Text className="text-md text-white mb-2" numberOfLines={2}>
          {getAddress(item)}
        </Text>

        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center gap-2">
            {fee && (
              <>
                <MaterialCommunityIcons name="cash" size={18} color="#4ade80" />
                <Text className="text-sm text-green-400 font-semibold">{fee}</Text>
              </>
            )}
            {item.order_total && (
              <Text className="text-sm text-gray-300 ml-2">
                Order: {parseFloat(item.order_total).toFixed(2)}
              </Text>
            )}
          </View>

          <View
            style={{
              backgroundColor: colors.bg,
              paddingHorizontal: 10,
              paddingVertical: 2,
              borderRadius: 9999,
            }}
          >
            <Text style={{ color: colors.text, fontSize: 12, fontWeight: "600" }}>
              {status.replace(/_/g, " ").toUpperCase()}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (deliveryQueue.length === 0) {
    return (
      <View className="items-center py-10">
        <MaterialCommunityIcons name="package-variant-closed" size={48} color="#6b7280" />
        <Text className="text-gray-400 mt-4 text-base font-medium">No deliveries yet</Text>
        <Text className="text-gray-500 mt-1 text-sm text-center">
          New deliveries will appear here when assigned.
        </Text>
        {onRefresh && (
          <TouchableOpacity
            className="mt-4 flex-row items-center gap-2 bg-blue-500/10 px-4 py-2 rounded-lg"
            onPress={onRefresh}
          >
            <MaterialCommunityIcons name="refresh" size={16} color="#3b82f6" />
            <Text className="text-blue-500 font-semibold">Refresh</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <FlatList
      data={deliveryQueue}
      keyExtractor={(item) => item.id || item.delivery_id || String(Math.random())}
      renderItem={renderItem}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        ) : undefined
      }
      scrollEnabled={false}
    />
  );
};

export default DeliveryQueue;
