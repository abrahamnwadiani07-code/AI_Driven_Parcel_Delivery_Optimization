"use client";

import type React from "react";
import { createContext, useState, useContext, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";
import { api } from "@/Lib/api";

interface BFMUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  phone?: string;
  country_code?: string;
  is_verified?: boolean;
  delivery_agent_id?: string;
}

type AuthContextType = {
  isAuthenticated: boolean;
  isMainLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  driver: BFMUser | null;
  token: string | null;
};

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isMainLoading: true,
  login: async () => false,
  logout: () => {},
  driver: null,
  token: null,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isMainLoading, setisMainLoading] = useState(true);
  const [driver, setDriver] = useState<BFMUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const driverString = await AsyncStorage.getItem("driver");
        const tokenString = await AsyncStorage.getItem("token");
        if (driverString && tokenString) {
          setDriver(JSON.parse(driverString));
          setToken(tokenString);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error("Failed to get driver data", error);
      } finally {
        setisMainLoading(false);
      }
    };
    checkLoginStatus();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      if (!email || !password) return false;

      const response = await api.post("/auth/login", { email, password });
      const data = response.data;
      const accessToken = data.token || data.data?.token || data.access_token || data.data?.access_token;
      const userData = data.user || data.data?.user;

      if (!accessToken || !userData) {
        throw new Error("Invalid login response");
      }

      // Check role — only delivery agents, admins, delivery managers
      if (!["delivery_agent", "admin", "delivery_manager"].includes(userData.role)) {
        Toast.show({
          type: "error",
          text1: "Access Denied",
          text2: "This app is for delivery drivers only.",
        });
        return false;
      }

      await AsyncStorage.setItem("driver", JSON.stringify(userData));
      await AsyncStorage.setItem("token", accessToken);
      if (userData.country_code) {
        await AsyncStorage.setItem("country", userData.country_code);
      }
      setDriver(userData);
      setToken(accessToken);
      setIsAuthenticated(true);

      Toast.show({
        type: "success",
        text1: "Welcome!",
        text2: `Signed in as ${userData.full_name}`,
      });

      return true;
    } catch (error: any) {
      const msg = error?.response?.data?.error || error?.message || "Login failed";
      Toast.show({
        type: "error",
        text1: "Login Failed",
        text2: msg,
      });
      console.error("Login failed", error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem("driver");
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("country");
      setDriver(null);
      setToken(null);
      setIsAuthenticated(false);
      Toast.show({
        type: "success",
        text1: "Signed Out",
        text2: "You have been logged out.",
      });
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, isMainLoading, login, logout, driver, token }}
    >
      {children}
    </AuthContext.Provider>
  );
};
