import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const LoginScreen = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/(tabs)");
    }
  }, [isAuthenticated]);

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }
    setIsLoading(true);
    setError("");

    try {
      const success = await login(email.trim().toLowerCase(), password);
      if (!success) {
        setError("Invalid email or password");
      } else {
        router.push("/(tabs)");
      }
    } catch (err) {
      setError("An error occurred during login");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-900">
      <ScrollView className="flex-1 p-4">
        <View className="items-center my-8">
          <View className="w-16 h-16 rounded-full bg-[#FF6B35] justify-center items-center mb-4">
            <MaterialCommunityIcons name="truck-delivery" size={32} color="white" />
          </View>
          <Text className="text-2xl font-bold text-white">BFM Driver</Text>
          <Text className="text-gray-400 mt-1">BestFoodMarket Delivery</Text>
        </View>

        <View className="p-4 rounded-lg bg-gray-700 mb-4">
          <Text className="text-lg font-bold text-white mb-1">
            Driver Login
          </Text>
          <Text className="text-gray-400 mb-4">
            Sign in with your BestFoodMarket account
          </Text>

          <View className="space-y-4">
            <View>
              <Text className="text-white mb-1">Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="driver@bestfoodmarket.com"
                className="bg-gray-800 rounded-md px-3 py-2.5 text-white"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View>
              <Text className="text-white mb-2">Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="Your password"
                className="bg-gray-800 rounded-md px-3 py-2.5 text-white"
                placeholderTextColor="#9CA3AF"
                returnKeyType="go"
                onSubmitEditing={handleLogin}
              />
            </View>

            {error ? <Text className="text-red-400">{error}</Text> : null}

            <TouchableOpacity
              onPress={handleLogin}
              disabled={isLoading}
              className="bg-[#FF6B35] rounded-md py-3 items-center mt-2"
            >
              {isLoading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text className="text-white font-bold text-base">Sign In</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View className="mt-6 items-center">
          <Text className="text-gray-400 text-xs">
            BestFoodMarket Delivery
          </Text>
          <Text className="text-gray-500 text-xs mt-1">
            www.bestfoodmarket.com
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default LoginScreen;
