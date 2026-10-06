import { View, ScrollView, TouchableOpacity, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AntDesign, MaterialCommunityIcons } from "@expo/vector-icons";
import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { Link } from "expo-router";
import { ActivityIndicator } from "react-native-paper";
import { GetAgentProfile, GetEarnings } from "@/Lib/fetchDataServices";

const AccountScreen = () => {
  const { logout, driver, isMainLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [agent, setAgent] = useState<any>(null);
  const [earnings, setEarnings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [agentData, earningsData] = await Promise.all([
          GetAgentProfile().catch(() => null),
          GetEarnings("30d").catch(() => null),
        ]);
        if (agentData) setAgent(agentData);
        if (earningsData) setEarnings(earningsData);
      } catch {} finally { setLoading(false); }
    };
    load();
  }, []);

  if (isMainLoading || loading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#FF6B35" />
      </SafeAreaView>
    );
  }

  const kycStatus = agent?.kyc_status || agent?.status || "pending";

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="p-4" contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="flex-row justify-between items-center mb-4">
          <View className="flex-row items-center">
            <Link href="/(tabs)">
              <View className="rounded-lg p-2 mr-3">
                <AntDesign name="back" size={28} color="#111827" />
              </View>
            </Link>
            <View>
              <Text className="text-2xl font-bold text-black">Account</Text>
              <Text className="text-gray-500">Manage your profile</Text>
            </View>
          </View>
          <TouchableOpacity
            className="flex-row items-center border border-red-500 rounded-lg px-4 py-2"
            onPress={() => logout()}
          >
            <MaterialCommunityIcons name="logout" size={20} color="#ef4444" />
            <Text className="ml-2 text-red-500 font-medium">Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Profile header */}
        <View className="flex-row items-center p-4 bg-gray-800 rounded-lg mb-4">
          <View className="w-16 h-16 rounded-full bg-[#FF6B35] justify-center items-center">
            <Text className="text-white text-2xl font-bold">
              {(driver?.full_name || "D").charAt(0).toUpperCase()}
            </Text>
          </View>
          <View className="ml-4 flex-1">
            <Text className="text-xl font-bold text-white">{driver?.full_name || "Driver"}</Text>
            <Text className="text-gray-400 text-sm">{driver?.email}</Text>
            <View className="flex-row items-center mt-1 gap-2">
              <View className={`px-2 py-0.5 rounded-full ${kycStatus === "approved" ? "bg-green-900" : "bg-yellow-900"}`}>
                <Text className={`text-xs font-bold ${kycStatus === "approved" ? "text-green-400" : "text-yellow-400"}`}>
                  {kycStatus.toUpperCase()}
                </Text>
              </View>
              <View className="px-2 py-0.5 rounded-full bg-gray-700">
                <Text className="text-xs text-gray-300 font-medium">
                  {(driver?.role || "").replace(/_/g, " ").toUpperCase()}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Tab bar */}
        <View className="flex-row bg-gray-800 rounded-lg overflow-hidden mb-4">
          {["profile", "earnings", "vehicle"].map((tab) => (
            <TouchableOpacity
              key={tab}
              className={`flex-1 py-3 items-center ${activeTab === tab ? "bg-gray-700" : ""}`}
              onPress={() => setActiveTab(tab)}
            >
              <MaterialCommunityIcons
                name={tab === "profile" ? "account" : tab === "earnings" ? "currency-usd" : "car"}
                size={20}
                color={activeTab === tab ? "#FF6B35" : "white"}
              />
              <Text className={`text-xs mt-1 ${activeTab === tab ? "text-[#FF6B35] font-medium" : "text-gray-300"}`}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Profile tab */}
        {activeTab === "profile" && (
          <View className="bg-gray-100 p-4 rounded-lg gap-3">
            <InfoRow label="Full Name" value={driver?.full_name} />
            <InfoRow label="Email" value={driver?.email} />
            <InfoRow label="Phone" value={driver?.phone || agent?.phone} />
            <InfoRow label="Country" value={driver?.country_code || agent?.country_code} />
            <InfoRow label="Vehicle Type" value={agent?.vehicle_type} />
            <InfoRow label="License Plate" value={agent?.license_plate} />
            {agent?.vehicle_model && <InfoRow label="Vehicle Model" value={agent.vehicle_model} />}
          </View>
        )}

        {/* Earnings tab */}
        {activeTab === "earnings" && (
          <View className="gap-3">
            <View className="bg-[#FF6B35] p-6 rounded-lg items-center">
              <Text className="text-white/70 text-sm uppercase font-semibold">Total Earnings (30d)</Text>
              <Text className="text-white text-4xl font-bold mt-1">
                {earnings?.total ? parseFloat(earnings.total).toFixed(2) : "0.00"}
              </Text>
              <Text className="text-white/60 text-sm mt-1">
                {earnings?.deliveries || 0} deliveries
              </Text>
            </View>
            {(earnings?.by_day || []).length > 0 && (
              <View className="bg-gray-100 p-4 rounded-lg">
                <Text className="text-gray-900 font-bold mb-2">Daily Breakdown</Text>
                {earnings.by_day.slice(-7).map((d: any, i: number) => (
                  <View key={i} className="flex-row justify-between py-2 border-b border-gray-200">
                    <Text className="text-gray-600">{d.date}</Text>
                    <Text className="text-gray-900 font-semibold">{parseFloat(d.revenue || 0).toFixed(2)}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Vehicle tab */}
        {activeTab === "vehicle" && (
          <View className="bg-gray-100 p-4 rounded-lg gap-3">
            <InfoRow label="Vehicle Type" value={agent?.vehicle_type || "Not set"} />
            <InfoRow label="License Plate" value={agent?.license_plate || "Not set"} />
            <InfoRow label="Vehicle Model" value={agent?.vehicle_model || "Not set"} />
            <InfoRow label="Vehicle Color" value={agent?.vehicle_color || "Not set"} />
            <InfoRow label="Status" value={agent?.status || "pending"} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <View className="flex-row justify-between py-2 border-b border-gray-200">
      <Text className="text-gray-500 text-sm">{label}</Text>
      <Text className="text-gray-900 font-medium text-sm">{value || "--"}</Text>
    </View>
  );
}

export default AccountScreen;
