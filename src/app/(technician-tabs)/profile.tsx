import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Switch,
  Image,
  Alert,
  Linking,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import * as SecureStore from "expo-secure-store";
import axios from "axios";
import { useAuthStore } from "../../store/useAuthStore";
import { BASE_URL, IMAGE_BASE_URL } from "../../config/api";

export default function TechnicianProfile() {
  const router = useRouter();
  const setRole = useAuthStore((state) => state.setRole);
  const userData = useAuthStore((state) => state.userData);
  const setUserData = useAuthStore((state) => state.setUserData);

  const [isAvailable, setIsAvailable] = useState<boolean>(() => {
    if (userData?.availability !== undefined && userData?.availability !== null) {
      return Number(userData.availability) === 1;
    }
    return false;
  });
  const [updatingAvailability, setUpdatingAvailability] = useState(false);
  const [contacts, setContacts] = useState<{ whatsapp?: string; phone?: string } | null>(null);

  const [verificationStatus, setVerificationStatus] = useState<string>("All Verified");

  const fetchTechProfile = async () => {
    try {
      const token = await SecureStore.getItemAsync("userToken");
      if (!token) return;
      const res = await axios.post(
        `${BASE_URL}/technicians/accounts/get_technician.php`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.data?.success) {
        if (res.data.status?.status_label) {
          setVerificationStatus(res.data.status.status_label);
        }
        if (res.data.bank_details) {
          const updated = { ...userData, bank_details: res.data.bank_details };
          setUserData(updated);
          await SecureStore.setItemAsync("userData", JSON.stringify(updated));
        }
        const serverAvail = res.data.availability ?? res.data.is_available ?? res.data.technician?.availability ?? res.data.data?.availability;
        if (serverAvail !== undefined && serverAvail !== null) {
          const availBool = Number(serverAvail) === 1;
          setIsAvailable(availBool);
          const updated = { ...userData, availability: availBool ? 1 : 0 };
          setUserData(updated);
          await SecureStore.setItemAsync("userData", JSON.stringify(updated));
        }
      }
    } catch (err) {
      // Keep existing verification status
    }
  };

  // Sync availability state and verification status whenever screen focuses
  useFocusEffect(
    useCallback(() => {
      if (userData?.availability !== undefined && userData?.availability !== null) {
        setIsAvailable(Number(userData.availability) === 1);
      }
      fetchTechProfile();
    }, [userData?.availability])
  );

  // Fetch support contacts
  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/technicians/accounts/get_contacts.php`);
        if (res.data?.success && res.data?.data) {
          setContacts(res.data.data);
        }
      } catch (err) {
        console.error("Failed to fetch contact details:", err);
      }
    };
    fetchContacts();
  }, []);

  const handleToggleAvailability = async (newVal: boolean) => {
    const prev = isAvailable;
    setIsAvailable(newVal);
    setUpdatingAvailability(true);

    try {
      const token = await SecureStore.getItemAsync("userToken");
      if (!token) {
        Alert.alert("Authentication", "User session expired. Please log in again.");
        setIsAvailable(prev);
        return;
      }

      const formData = new FormData();
      formData.append("availability", newVal ? "1" : "0");
      formData.append("is_available", newVal ? "1" : "0");
      formData.append("status", newVal ? "1" : "0");
      formData.append("is_online", newVal ? "1" : "0");

      const res = await axios.post(
        `${BASE_URL}/technicians/accounts/set_availability.php`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (res.data && res.data.success) {
        const serverAvail =
          res.data.availability !== undefined
            ? Number(res.data.availability) === 1
            : newVal;
        setIsAvailable(serverAvail);

        const updated = {
          ...userData,
          availability: serverAvail ? 1 : 0,
        };
        setUserData(updated);
        await SecureStore.setItemAsync("userData", JSON.stringify(updated));
      } else {
        setIsAvailable(prev);
        Alert.alert("Update Failed", res.data?.msg || "Could not update availability.");
      }
    } catch (err: any) {
      console.error("Failed to update availability:", err);
      setIsAvailable(prev);
      Alert.alert("Network Error", "Unable to update availability status. Please check your connection.");
    } finally {
      setUpdatingAvailability(false);
    }
  };

  const handleSupport = () => {
    Alert.alert(
      "Support",
      "How would you like to connect with support?",
      [
        {
          text: "WhatsApp Support",
          onPress: () => {
            const phoneNum = contacts?.whatsapp;
            if (!phoneNum) {
              Alert.alert("Unavailable", "WhatsApp support number is not configured.");
              return;
            }
            const clean = phoneNum.replace(/[^0-9]/g, "");
            const intlNumber = clean.startsWith("0") ? "353" + clean.slice(1) : clean;
            const url = `https://wa.me/${intlNumber}`;
            Linking.openURL(url).catch(() => {
              Linking.openURL(`https://api.whatsapp.com/send?phone=${clean}`);
            });
          },
        },
        {
          text: "Call Support",
          onPress: () => {
            const phoneNum = contacts?.phone;
            if (!phoneNum) {
              Alert.alert("Unavailable", "Support phone number is not configured.");
              return;
            }
            Linking.openURL(`tel:${phoneNum}`);
          },
        },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync("userToken");
    await SecureStore.deleteItemAsync("userData");
    setUserData(null);
    setRole("user" as any);
    router.replace("/login");
  };

  const getImageUrl = (url: string) => {
    if (!url) return "";
    return url.startsWith("http") ? url : `${IMAGE_BASE_URL}/${url}`;
  };

  const initialLetter = userData?.full_name ? userData.full_name.charAt(0).toUpperCase() : "B";

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.header}>
          {userData?.pic ? (
            <Image source={{ uri: getImageUrl(userData.pic) }} style={styles.profileImage} />
          ) : (
            <View style={styles.profileImagePlaceholder}>
              <Text style={styles.avatarLetter}>{initialLetter}</Text>
            </View>
          )}
          <Text style={styles.profileName}>{userData?.full_name || "Technician"}</Text>
          <Text style={styles.profileTitle}>Technician</Text>
        </View>

        {/* Availability Card */}
        <View style={styles.availabilityCard}>
          <View
            style={[
              styles.statusIconCircle,
              isAvailable ? styles.statusIconCircleOnline : styles.statusIconCircleOffline,
            ]}
          >
            <View style={styles.statusIconInnerRing} />
          </View>
          <View style={styles.availabilityTextContainer}>
            <Text style={styles.availabilityTitle}>
              {isAvailable ? "You're Online" : "You're Offline"}
            </Text>
            <Text style={styles.availabilitySubtitle}>
              {isAvailable
                ? "Online • You're available to receive jobs"
                : "Offline • You won't receive job requests"}
            </Text>
          </View>
          {updatingAvailability ? (
            <ActivityIndicator size="small" color="#1A6B6B" style={{ marginRight: 8 }} />
          ) : (
            <Switch
              value={isAvailable}
              onValueChange={handleToggleAvailability}
              trackColor={{ false: "#E5E7EB", true: "#1A6B6B" }}
              thumbColor="#ffffff"
              ios_backgroundColor="#E5E7EB"
            />
          )}
        </View>

        {/* Menu Options Card */}
        <View style={styles.menuCard}>
          {/* Edit Profile Information */}
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => router.push("/edit-tech-profile" as any)}
          >
            <Ionicons name="person-outline" size={20} color="#6b7280" style={styles.menuIcon} />
            <Text style={styles.menuItemText}>Edit Profile Information</Text>
            <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
          </TouchableOpacity>
          <View style={styles.divider} />

          {/* Documents & Verification */}
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => router.push("/documents-verification" as any)}
          >
            <Ionicons name="document-text-outline" size={20} color="#6b7280" style={styles.menuIcon} />
            <Text style={styles.menuItemText}>Documents & Verification</Text>
            <View
              style={
                verificationStatus.toLowerCase().includes("pending") ||
                verificationStatus.toLowerCase().includes("review")
                  ? styles.badgeAmberLight
                  : styles.badgeGreenLight
              }
            >
              <Text
                style={
                  verificationStatus.toLowerCase().includes("pending") ||
                  verificationStatus.toLowerCase().includes("review")
                    ? styles.badgeTextAmber
                    : styles.badgeTextGreen
                }
              >
                {verificationStatus}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
          </TouchableOpacity>
          <View style={styles.divider} />

          {/* Bank & Payout Details */}
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => router.push("/bank-details" as any)}
          >
            <Ionicons name="business-outline" size={20} color="#6b7280" style={styles.menuIcon} />
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuItemText}>Bank & Payout Details</Text>
              <Text style={styles.menuItemSubtitle}>
                {userData?.bank_details?.iban_formatted
                  ? `${userData.bank_details.iban_formatted.slice(0, 4)} •••• ${userData.bank_details.iban_formatted.slice(-4)}`
                  : userData?.bank_details?.iban || userData?.iban
                  ? `IBAN •••• ${(userData?.bank_details?.iban || userData?.iban).slice(-4)}`
                  : "Manage your payout account"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
          </TouchableOpacity>
          <View style={styles.divider} />

          {/* Notifications */}
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => router.push("/(technician-tabs)/notifications" as any)}
          >
            <Ionicons name="notifications-outline" size={20} color="#6b7280" style={styles.menuIcon} />
            <Text style={styles.menuItemText}>Notifications</Text>
            <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
          </TouchableOpacity>
          <View style={styles.divider} />

          {/* Support */}
          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={handleSupport}>
            <Ionicons name="headset-outline" size={20} color="#6b7280" style={styles.menuIcon} />
            <Text style={styles.menuItemText}>Support</Text>
            <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
          </TouchableOpacity>
          <View style={styles.divider} />

          {/* FAQ */}
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => router.push("/faq" as any)}
          >
            <Ionicons name="help-circle-outline" size={20} color="#6b7280" style={styles.menuIcon} />
            <Text style={styles.menuItemText}>FAQ</Text>
            <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} activeOpacity={0.7} onPress={handleLogout}>
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
    paddingTop: Platform.OS === "android" ? 40 : 0,
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
    marginTop: 8,
  },
  profileImage: {
    width: 84,
    height: 84,
    borderRadius: 42,
    marginBottom: 14,
  },
  profileImagePlaceholder: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "#374151",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  avatarLetter: {
    fontSize: 34,
    fontFamily: "DemoOsbert-Bold",
    color: "#ffffff",
  },
  profileName: {
    fontSize: 22,
    fontFamily: "DemoOsbert-Bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  profileTitle: {
    fontSize: 14,
    fontFamily: "Lato",
    color: "#9ca3af",
  },
  availabilityCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  statusIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  statusIconCircleOffline: {
    backgroundColor: "#9ca3af",
  },
  statusIconCircleOnline: {
    backgroundColor: "#10b981",
  },
  statusIconInnerRing: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2.5,
    borderColor: "#ffffff",
    backgroundColor: "transparent",
  },
  availabilityTextContainer: {
    marginLeft: 14,
    flex: 1,
    marginRight: 8,
  },
  availabilityTitle: {
    fontSize: 15,
    fontFamily: "Lato-Bold",
    color: "#1f2937",
    marginBottom: 2,
  },
  availabilitySubtitle: {
    fontSize: 12,
    fontFamily: "Lato",
    color: "#6b7280",
    lineHeight: 16,
  },
  menuCard: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 16,
    backgroundColor: "#ffffff",
    marginBottom: 20,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  menuIcon: {
    marginRight: 14,
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
    fontSize: 11,
    fontFamily: "Lato",
    color: "#9ca3af",
    marginTop: 2,
  },
  badgeGreenLight: {
    backgroundColor: "#E8F5F5",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginRight: 8,
  },
  badgeTextGreen: {
    color: "#1A6B6B",
    fontSize: 11,
    fontFamily: "Lato-Bold",
  },
  badgeAmberLight: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginRight: 8,
  },
  badgeTextAmber: {
    color: "#D97706",
    fontSize: 11,
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
    borderRadius: 14,
    backgroundColor: "#ffffff",
    justifyContent: "center",
  },
  logoutText: {
    fontSize: 14,
    fontFamily: "Lato-Bold",
    color: "#DC2626",
  },
});
