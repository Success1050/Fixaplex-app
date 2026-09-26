import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform } from "react-native";
import { useAuthStore } from "../../store/useAuthStore";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const userData = useAuthStore(state => state.userData);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopWidth: 0,
          elevation: 10,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 10,
          height: Platform.OS === 'ios' ? 85 : 60 + insets.bottom,
          paddingBottom: Platform.OS === 'ios' ? 20 : insets.bottom + 5,
          paddingTop: 10,
        },
        tabBarActiveTintColor: "#115e59",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          title: "Bookings",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="briefcase-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: !userData ? "Login" : "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={!userData ? "log-in-outline" : "person-outline"} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
