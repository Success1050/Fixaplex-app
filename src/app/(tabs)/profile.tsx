import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, SafeAreaView, Platform, TouchableOpacity, ScrollView, Image, Linking, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import axios from "axios";
import { useAuthStore } from "../../store/useAuthStore";
import { BASE_URL, IMAGE_BASE_URL } from "../../config/api";

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
  const guestId = useAuthStore(state => state.guestId);
  const setRole = useAuthStore(state => state.setRole);

  const [contacts, setContacts] = useState<{ whatsapp?: string; phone?: string } | null>(null);

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/technicians/accounts/get_contacts.php`);
        console.log("Contact details response:", res.data);
        if (res.data?.success && res.data?.data) {
          setContacts(res.data.data);
        }
      } catch (err) {
        console.error("Failed to fetch contact details:", err);
      }
    };

    fetchContacts();
  }, []);

  const handleWhatsApp = (number?: string) => {
    const phoneNum = number || contacts?.whatsapp;
    if (!phoneNum) {
      Alert.alert("Contact Unavailable", "WhatsApp support number is currently not configured.");
      return;
    }
    const clean = phoneNum.replace(/[^0-9]/g, "");
    const intlNumber = clean.startsWith("0") ? "353" + clean.slice(1) : clean;
    const url = `https://wa.me/${intlNumber}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://api.whatsapp.com/send?phone=${clean}`);
    });
  };

  const handlePhoneCall = (number?: string) => {
    const phoneNum = number || contacts?.phone;
    if (!phoneNum) {
      Alert.alert("Contact Unavailable", "Support phone number is currently not configured.");
      return;
    }
    Linking.openURL(`tel:${phoneNum}`);
  };

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('userToken');
    await SecureStore.deleteItemAsync('userData');
    useAuthStore.getState().setUserData(null);
    setRole('user' as any);
    router.replace('/login');
  };

  const isGuest = !userData;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{isGuest ? "Account" : "Profile"}</Text>
        </View>

        <View style={styles.profileCard}>
          <TouchableOpacity 
            style={styles.avatarContainer} 
            onPress={() => isGuest ? router.push("/login") : router.push("/edit-profile")}
          >
            {userData?.pic ? (
              <Image 
                source={{ uri: userData.pic.startsWith('http') ? userData.pic : `${IMAGE_BASE_URL}/${userData.pic}` }} 
                style={styles.avatarImage} 
              />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarFallbackText}>
                  {userData?.full_name ? userData.full_name.charAt(0).toUpperCase() : (isGuest ? 'G' : 'U')}
                </Text>
              </View>
            )}
            {!isGuest && (
              <View style={styles.editBadge}>
                <Ionicons name="pencil" size={12} color="#ffffff" />
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {userData?.full_name || guestId || 'Guest User'}
            </Text>
            <Text style={styles.profileEmail}>
              {userData?.email || (isGuest ? 'Login to access full features' : '')}
            </Text>
            {isGuest && (
              <TouchableOpacity 
                style={styles.guestLoginButton} 
                onPress={() => router.push("/login")}
              >
                <Text style={styles.guestLoginButtonText}>Log In / Register</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.sectionGroup}>
          <ProfileOption 
            icon="person-outline" 
            title="Personal Details" 
            subtitle="Name, email, phone number" 
            color="#3b82f6" 
            onPress={() => isGuest ? router.push("/login") : router.push("/edit-profile")}
          />
          <ProfileOption 
            icon="location-outline" 
            title="Address" 
            subtitle="Manage your address" 
            color="#10b981" 
            onPress={() => isGuest ? router.push("/login") : router.push("/manage-address" as any)}
          />
          <ProfileOption 
            icon="card-outline" 
            title="Payment Methods" 
            subtitle={
              userData?.bank_details?.iban_formatted
                ? `${userData.bank_details.iban_formatted.slice(0, 4)} •••• ${userData.bank_details.iban_formatted.slice(-4)}`
                : userData?.bank_details?.iban || userData?.iban
                ? `IBAN •••• ${(userData?.bank_details?.iban || userData?.iban).slice(-4)}`
                : "Cards & refund bank details"
            } 
            color="#8b5cf6" 
            hideBorder
            onPress={() => (isGuest ? router.push("/login") : router.push("/payment-methods" as any))}
          />
        </View>

        <Text style={styles.sectionTitle}>Support & Contact</Text>
        <View style={styles.sectionGroup}>
          <ProfileOption 
            icon="logo-whatsapp" 
            title="WhatsApp Support" 
            subtitle={contacts?.whatsapp ? `Chat on ${contacts.whatsapp}` : "Chat with Fixaplex support"} 
            color="#25D366" 
            onPress={() => handleWhatsApp(contacts?.whatsapp)}
          />
          <ProfileOption 
            icon="call-outline" 
            title="Phone Support" 
            subtitle={contacts?.phone ? `Call ${contacts.phone}` : "Speak with an agent"} 
            color="#1A6B6B" 
            onPress={() => handlePhoneCall(contacts?.phone)}
          />
          <ProfileOption 
            icon="help-circle-outline" 
            title="Frequently Asked Questions" 
            subtitle="Quick answers to common questions" 
            color="#f59e0b" 
            onPress={() => router.push("/faq")}
          />
          <ProfileOption 
            icon="chatbubble-ellipses-outline" 
            title="Feedback" 
            subtitle="Tell us how you feel" 
            color="#0d9488" 
            hideBorder
            onPress={() => router.push("/job/feedback")}
          />
        </View>

        <Text style={styles.sectionTitle}>Account Actions</Text>
        <View style={styles.sectionGroup}>
          {!isGuest ? (
            <ProfileOption 
              icon="log-out-outline" 
              title="Log Out" 
              color="#ef4444" 
              hideBorder
              onPress={handleLogout}
            />
          ) : (
            <ProfileOption 
              icon="log-in-outline" 
              title="Log In" 
              color="#1A6B6B" 
              hideBorder
              onPress={() => router.push("/login")}
            />
          )}
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
  guestLoginButton: {
    marginTop: 10,
    backgroundColor: "#1A6B6B",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  guestLoginButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontFamily: "Lato-Bold",
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
