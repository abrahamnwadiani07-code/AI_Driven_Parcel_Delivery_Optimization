import { formatTime } from "@/Lib/utils";
import { DeliveryStatus } from "@/types";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";

interface RouteListProps {
  deliveries?: any[];
  onStatusUpdate?: (deliveryId: string, newStatus: DeliveryStatus) => void;
}

export function RouteList({ deliveries, onStatusUpdate }: RouteListProps) {
  const [menuVisible, setMenuVisible] = useState<string | null>(null);
  const router = useRouter();

  const handleNavigation = (id: string) => {
    router.push({
      pathname: "/(tabs)/active/[id]",
      params: { id },
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
      case "delivered":
        return "check-circle";
      case "in_progress":
      case "accepted":
      case "collected":
      case "on_delivery":
        return "map-marker";
      case "cancelled":
      case "failed":
        return "close-circle";
      default:
        return "map-marker";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
      case "delivered":
        return "Completed";
      case "in_progress":
      case "accepted":
        return "In Progress";
      case "collected":
        return "Collected";
      case "on_delivery":
        return "On Delivery";
      case "cancelled":
        return "Cancelled";
      default:
        return "Pending";
    }
  };

  const getAddress = (item: any) => {
    const addr = item.delivery_address || item.dropoff_address;
    if (!addr) return "Address not available";
    if (typeof addr === "string") return addr;
    return [addr.line1, addr.city, addr.postcode].filter(Boolean).join(", ");
  };

  const handleViewDetails = (deliveryId: string) => {
    setMenuVisible(null);
    handleNavigation(deliveryId);
  };

  if (!deliveries || deliveries.length === 0) {
    return (
      <View className="flex-1 items-center justify-center py-8">
        <MaterialCommunityIcons
          name="truck-outline"
          size={48}
          color="#9CA3AF"
        />
        <Text className="text-gray-400 text-center mt-4 text-base">
          No deliveries scheduled for today
        </Text>
      </View>
    );
  }

  return (
    <View className="gap-2">
      {deliveries.map((delivery) => {
        const id = delivery.id || delivery.delivery_id;
        const status = (delivery.status || "pending").toLowerCase();
        const isActive = ["in_progress", "accepted", "collected", "on_delivery"].includes(status);

        return (
          <TouchableOpacity
            key={id}
            onPress={() => handleViewDetails(id)}
            className={`p-4 rounded-lg ${
              isActive
                ? "border-2 border-yellow-400 bg-gray-800"
                : "bg-gray-800"
            }`}
          >
            <View className="flex-row justify-between items-center">
              <View className="flex-row items-center flex-1">
                <View className="w-10 h-10 rounded-full bg-gray-600 justify-center items-center mr-3">
                  <MaterialCommunityIcons
                    name={getStatusIcon(status)}
                    size={20}
                    color={
                      status === "completed" || status === "delivered"
                        ? "#10B981"
                        : "white"
                    }
                  />
                </View>

                <View className="flex-1">
                  <Text className="font-semibold text-white text-base" numberOfLines={1}>
                    {getAddress(delivery)}
                  </Text>
                  <View className="flex-row items-center mt-1">
                    <MaterialCommunityIcons
                      name="clock-outline"
                      size={12}
                      color="#9CA3AF"
                    />
                    <Text className="text-sm text-gray-400 ml-1">
                      {delivery.created_at
                        ? formatTime(delivery.created_at)
                        : delivery.scheduled_for
                        ? formatTime(delivery.scheduled_for)
                        : "--:--"}
                    </Text>
                  </View>
                </View>
              </View>

              <View className="flex-row items-center space-x-3">
                <View className="bg-gray-700 px-3 py-1 rounded-full">
                  <Text className="text-xs font-medium text-white">
                    {getStatusText(status)}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => setMenuVisible(menuVisible === id ? null : id)}
                  className="w-8 h-8 justify-center items-center"
                >
                  <MaterialCommunityIcons
                    name="dots-vertical"
                    size={20}
                    color="white"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Simple Dropdown Menu */}
            {menuVisible === id && (
              <View className="mt-3 bg-gray-700 rounded-lg overflow-hidden">
                <TouchableOpacity
                  onPress={() => handleViewDetails(id)}
                  className="px-4 py-3 border-b border-gray-600"
                >
                  <Text className="text-white font-medium">View Details</Text>
                </TouchableOpacity>

                {status !== "completed" && status !== "delivered" && (
                  <TouchableOpacity
                    onPress={() => {
                      onStatusUpdate?.(id, DeliveryStatus.cancelled);
                      setMenuVisible(null);
                    }}
                    className="px-4 py-3 border-b border-gray-600"
                  >
                    <Text className="text-yellow-500 font-medium">
                      Skip Delivery
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={() => setMenuVisible(null)}
                  className="px-4 py-3"
                >
                  <Text className="text-red-400 font-medium">Report Issue</Text>
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
