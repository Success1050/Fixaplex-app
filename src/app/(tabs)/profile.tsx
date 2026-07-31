import React from "react";
import { View, Text, StyleSheet, SafeAreaView, Platform, TouchableOpacity, ScrollView, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useAuthStore } from "../../store/useAuthStore";
import { IMAGE_BASE_URL } from "../../config/api";

const ProfileOption = ({ icon, title, subtitle, color = "#4b5563", hideBorder = false, onPress }: any) => (
  <TouchableOpacity style={[styles.optionContainer, !hideBorder && styles.optionBorder]} onPress={onPress}>
    <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
      <Ionicons name={icon} size={22} color={color} />
    </View>
    <View style={styles.optionTextContainer}>
      <Text style={styles.optionTitle}>{title}</Text>
      {subtitle && <Text style={styles.optionSubtitle}>{subtitle}</Text>}
    </View>
    <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
  </TouchableOpacity>
);

export default function Profile() {
  const router = useRouter();
  const userData = useAuthStore(state => state.userData);
  const setRole = useAuthStore(state => state.setRole);

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('userToken');
    setRole('user' as any);
    router.replace('/login');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        <View style={styles.profileCard}>
          <TouchableOpacity style={styles.avatarContainer} onPress={() => router.push("/edit-profile")}>
            {userData?.pic ? (
              <Image 
                source={{ uri: userData.pic.startsWith('http') ? userData.pic : `${IMAGE_BASE_URL}/${userData.pic}` }} 
                style={styles.avatarImage} 
              />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarFallbackText}>{userData?.full_name ? userData.full_name.charAt(0).toUpperCase() : 'U'}</Text>
              </View>
            )}
            <View style={styles.editBadge}>
              <Ionicons name="pencil" size={12} color="#ffffff" />
            </View>
          </TouchableOpacity>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{userData?.full_name || 'User'}</Text>
            <Text style={styles.profileEmail}>{userData?.email || ''}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.sectionGroup}>
          <ProfileOption 
            icon="person-outline" 
            title="Personal Details" 
            subtitle="Name, email, phone number" 
            color="#3b82f6" 
            onPress={() => router.push("/edit-profile")}
          />
          <ProfileOption 
            icon="card-outline" 
            title="Payment Methods" 
            subtitle="Manage your saved cards" 
            color="#8b5cf6" 
          />
          <ProfileOption 
            icon="location-outline" 
            title="Saved Addresses" 
            subtitle="Home, work & other locations" 
            color="#10b981" 
            hideBorder
          />
        </View>

        <Text style={styles.sectionTitle}>General</Text>
        <View style={styles.sectionGroup}>
          <ProfileOption 
            icon="settings-outline" 
            title="Settings" 
            subtitle="Notifications, security" 
            color="#64748b" 
          />
          <ProfileOption 
            icon="help-buoy-outline" 
            title="Help & Support" 
            subtitle="FAQ, contact us" 
            color="#f59e0b" 
          />
          <ProfileOption 
            icon="log-out-outline" 
            title="Log Out" 
            color="#ef4444" 
            hideBorder
            onPress={handleLogout}
          />
        </View>

        <Text style={styles.versionText}>Version 1.0.0</Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f9fafb",
    paddingTop: Platform.OS === 'android' ? 40 : 0,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: "DemoOsbert-Bold",
    color: "#1f2937",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 24,
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  avatarContainer: {
    position: "relative",
    marginRight: 20,
  },
  avatarFallback: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#0d9488",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarFallbackText: {
    fontSize: 28,
    fontFamily: "DemoOsbert-Bold",
    color: "#ffffff",
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#1f2937",
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 22,
    fontFamily: "DemoOsbert-Bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    fontFamily: "Lato",
    color: "#6b7280",
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Lato-Bold",
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 1,
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  sectionGroup: {
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#f3f4f6",
    marginBottom: 32,
  },
  optionContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  optionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontFamily: "Lato-Bold",
    color: "#1f2937",
  },
  optionSubtitle: {
    fontSize: 12,
    fontFamily: "Lato",
    color: "#6b7280",
    marginTop: 2,
  },
  versionText: {
    textAlign: "center",
    fontSize: 12,
    fontFamily: "Lato",
    color: "#d1d5db",
    marginTop: 16,
  }
});
