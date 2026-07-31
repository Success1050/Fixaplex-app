import React, { useState } from "react";
import { View, Text, StyleSheet, SafeAreaView, Platform, ScrollView, TouchableOpacity, Switch, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useAuthStore } from "../../store/useAuthStore";
import { IMAGE_BASE_URL } from "../../config/api";

export default function TechnicianProfile() {
  const router = useRouter();
  const setRole = useAuthStore(state => state.setRole);
  const userData = useAuthStore(state => state.userData);
  const [isAvailable, setIsAvailable] = useState(true);

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('userToken');
    setRole('user' as any);
    router.replace("/login");
  };

  const getImageUrl = (url: string) => {
    if (!url) return '';
    return url.startsWith('http') ? url : `${IMAGE_BASE_URL}/${url}`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        <View style={styles.header}>
          {userData?.pic ? (
            <Image source={{ uri: getImageUrl(userData.pic) }} style={styles.profileImage} />
          ) : (
            <View style={styles.profileImagePlaceholder}>
              <Text style={{fontSize: 32, fontFamily: 'DemoOsbert-Bold', color: '#ffffff'}}>
                {userData?.full_name ? userData.full_name.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
          )}
          <Text style={styles.profileName}>{userData?.full_name || 'User'}</Text>
          <Text style={styles.profileTitle}>Technician</Text>
        </View>

        <View style={styles.availabilityRow}>
          <Switch 
            value={isAvailable}
            onValueChange={setIsAvailable}
            trackColor={{ false: "#d1d5db", true: "#1A6B6B" }}
            thumbColor="#ffffff"
          />
          <View style={styles.availabilityTextContainer}>
            <Text style={styles.availabilityTitle}>You're Available</Text>
            <Text style={styles.availabilitySubtitle}>Jobs can be assigned to you now</Text>
          </View>
        </View>

        <View style={styles.menuCard}>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push("/edit-tech-profile" as any)}>
            <Ionicons name="person-outline" size={20} color="#6b7280" style={styles.menuIcon} />
            <Text style={styles.menuItemText}>Edit Profile Information</Text>
            <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
          </TouchableOpacity>
          <View style={styles.divider} />

          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="document-text-outline" size={20} color="#6b7280" style={styles.menuIcon} />
            <Text style={styles.menuItemText}>Documents & Verification</Text>
            <View style={styles.badgeGreenLight}>
              <Text style={styles.badgeTextGreen}>All Verified</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
          </TouchableOpacity>
          <View style={styles.divider} />

          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="business-outline" size={20} color="#6b7280" style={styles.menuIcon} />
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuItemText}>Bank & Payout Details</Text>
              <Text style={styles.menuItemSubtitle}>Bank of Ireland ********345</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
          </TouchableOpacity>
          <View style={styles.divider} />

          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="notifications-outline" size={20} color="#6b7280" style={styles.menuIcon} />
            <Text style={styles.menuItemText}>Notifications</Text>
            <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
          </TouchableOpacity>
          <View style={styles.divider} />

          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="settings-outline" size={20} color="#6b7280" style={styles.menuIcon} />
            <Text style={styles.menuItemText}>Settings</Text>
            <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
          </TouchableOpacity>
          <View style={styles.divider} />

          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="alert-circle-outline" size={20} color="#6b7280" style={styles.menuIcon} />
            <Text style={styles.menuItemText}>Support</Text>
            <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#DC2626" style={styles.menuIcon} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
    paddingTop: Platform.OS === 'android' ? 40 : 0,
  },
  container: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#374151",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  profileName: {
    fontSize: 20,
    fontFamily: "DemoOsbert-Bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  profileTitle: {
    fontSize: 14,
    fontFamily: "Lato",
    color: "#9ca3af",
  },
  availabilityRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 32,
  },
  availabilityTextContainer: {
    marginLeft: 12,
  },
  availabilityTitle: {
    fontSize: 14,
    fontFamily: "Lato-Bold",
    color: "#1f2937",
    marginBottom: 2,
  },
  availabilitySubtitle: {
    fontSize: 12,
    fontFamily: "Lato",
    color: "#9ca3af",
  },
  menuCard: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    backgroundColor: "#ffffff",
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  menuIcon: {
    marginRight: 16,
  },
  menuItemText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Lato-Bold",
    color: "#1f2937",
  },
  menuTextContainer: {
    flex: 1,
  },
  menuItemSubtitle: {
    fontSize: 10,
    fontFamily: "Lato",
    color: "#9ca3af",
    marginTop: 2,
  },
  badgeGreenLight: {
    backgroundColor: "#E8F5F5",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 8,
  },
  badgeTextGreen: {
    color: "#1A6B6B",
    fontSize: 10,
    fontFamily: "Lato-Bold",
  },
  divider: {
    height: 1,
    backgroundColor: "#f3f4f6",
    marginHorizontal: 16,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    backgroundColor: "#ffffff",
    justifyContent: "center",
  },
  logoutText: {
    fontSize: 14,
    fontFamily: "Lato-Bold",
    color: "#DC2626",
  }
});
