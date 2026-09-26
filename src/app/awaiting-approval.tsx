import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  RefreshControl,
  Platform,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import axios from "axios";
import { BASE_URL } from "../config/api";
import { useAuthStore } from "../store/useAuthStore";

interface TechStatusResponse {
  status_code: number; // 0 = Pending, 1 = Approved, -1 = Rejected
  status_label: string;
  rejection_reason?: string;
  availability?: number;
}

export default function AwaitingApproval() {
  const router = useRouter();
  const userData = useAuthStore((state) => state.userData);
  const setUserData = useAuthStore((state) => state.setUserData);
  const setRole = useAuthStore((state) => state.setRole);

  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [statusData, setStatusData] = useState<TechStatusResponse | null>(null);

  const checkStatus = async (isManual = false) => {
    if (isManual) setChecking(true);
    try {
      const token = await SecureStore.getItemAsync("userToken");
      if (!token) {
        Alert.alert("Session Expired", "Please log in to continue.");
        router.replace("/login");
        return;
      }

      const res = await axios.post(
        `${BASE_URL}/technicians/accounts/get_status.php`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("[get_status] Response:", res.data);

      if (res.data?.success && res.data?.status) {
        const s: TechStatusResponse = res.data.status;
        setStatusData(s);

        // If approved (status_code === 1), update local user state
        if (s.status_code === 1) {
          const updated = {
            ...userData,
            status: 1,
            is_verified: 1,
            availability: s.availability ?? userData?.availability ?? 0,
          };
          setUserData(updated);
          await SecureStore.setItemAsync("userData", JSON.stringify(updated));
        }

        if (isManual) {
          if (s.status_code === 1) {
            Alert.alert("Approved!", "Congratulations, your account has been approved!");
          } else if (s.status_code === -1) {
            Alert.alert("Application Rejected", s.rejection_reason || "Your application was rejected.");
          } else {
            Alert.alert("Status Updated", "Your application is still under review.");
          }
        }
      }
    } catch (err: any) {
      console.error("Failed to check status:", err);
      if (isManual) {
        Alert.alert("Error", "Unable to fetch status. Please check your internet connection.");
      }
    } finally {
      setLoading(false);
      setChecking(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      checkStatus();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    checkStatus();
  };

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync("userToken");
    await SecureStore.deleteItemAsync("userData");
    setUserData(null);
    setRole("user" as any);
    router.replace("/login");
  };

  const handleEnterDashboard = () => {
    setRole("technician" as any);
    router.replace("/(technician-tabs)" as any);
  };

  const statusCode = statusData?.status_code ?? 0;
  const isApproved = statusCode === 1;
  const isRejected = statusCode === -1;
  const isPending = !isApproved && !isRejected;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1A6B6B" />
        }
      >
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#1A6B6B" />
            <Text style={styles.loadingText}>Checking approval status...</Text>
          </View>
        ) : isApproved ? (
          /* Approved Screen */
          <View style={styles.content}>
            <View style={[styles.iconCircle, styles.iconCircleGreen]}>
              <Ionicons name="shield-checkmark" size={60} color="#059669" />
            </View>
            <View style={styles.badgeGreen}>
              <Text style={styles.badgeTextGreen}>Approved & Verified</Text>
            </View>
            <Text style={styles.title}>You're Approved!</Text>
            <Text style={styles.subtitle}>
              Your technician credentials have been verified by Fixaplex compliance. You can now accept incoming service requests.
            </Text>

            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.8}
              onPress={handleEnterDashboard}
            >
              <Text style={styles.primaryButtonText}>Enter Technician Dashboard</Text>
              <Ionicons name="arrow-forward" size={18} color="#ffffff" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          </View>
        ) : isRejected ? (
          /* Rejected Screen */
          <View style={styles.content}>
            <View style={[styles.iconCircle, styles.iconCircleRed]}>
              <Ionicons name="close-circle-outline" size={64} color="#DC2626" />
            </View>
            <View style={styles.badgeRed}>
              <Text style={styles.badgeTextRed}>Application Rejected</Text>
            </View>
            <Text style={styles.title}>Application Not Approved</Text>
            <Text style={styles.subtitle}>
              Our compliance team reviewed your submission and was unable to approve your application at this time.
            </Text>

            {statusData?.rejection_reason ? (
              <View style={styles.rejectionCard}>
                <View style={styles.rejectionHeaderRow}>
                  <Ionicons name="alert-circle" size={18} color="#DC2626" style={{ marginRight: 6 }} />
                  <Text style={styles.rejectionHeaderTitle}>Reason for Rejection</Text>
                </View>
                <Text style={styles.rejectionText}>{statusData.rejection_reason}</Text>
              </View>
            ) : null}

            {/* Re-apply CTA */}
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: "#1A6B6B", marginTop: 24 }]}
              activeOpacity={0.8}
              onPress={() => router.push("/re-apply" as any)}
            >
              <Ionicons name="refresh-outline" size={20} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.primaryButtonText}>Re-apply for Approval</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              activeOpacity={0.7}
              onPress={() => checkStatus(true)}
              disabled={checking}
            >
              {checking ? (
                <ActivityIndicator size="small" color="#1A6B6B" />
              ) : (
                <Text style={styles.secondaryButtonText}>Refresh Status</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          /* Pending Review Screen */
          <View style={styles.content}>
            <View style={[styles.iconCircle, styles.iconCircleAmber]}>
              <Ionicons name="time-outline" size={64} color="#D97706" />
            </View>
            <View style={styles.badgeAmber}>
              <Text style={styles.badgeTextAmber}>Pending Review</Text>
            </View>
            <Text style={styles.title}>Awaiting Approval</Text>
            <Text style={styles.subtitle}>
              Your account has been submitted and is currently pending verification. You will be notified as soon as your trade credentials and ID have been approved.
            </Text>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={20} color="#0F766E" style={{ marginRight: 8 }} />
              <Text style={styles.infoBoxText}>
                Review typically takes 24 to 48 business hours. You can pull down to refresh your status anytime.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.8}
              onPress={() => checkStatus(true)}
              disabled={checking}
            >
              {checking ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="sync-outline" size={18} color="#ffffff" style={{ marginRight: 8 }} />
                  <Text style={styles.primaryButtonText}>Check Status</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Footer Logout */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={18} color="#6b7280" style={{ marginRight: 6 }} />
            <Text style={styles.logoutText}>Log Out / Switch Account</Text>
          </TouchableOpacity>
        </View>
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
    flexGrow: 1,
    justifyContent: "space-between",
    padding: 24,
  },
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 100,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "Lato",
    color: "#6b7280",
    marginTop: 12,
  },
  content: {
    alignItems: "center",
    paddingTop: 30,
    width: "100%",
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  iconCircleAmber: {
    backgroundColor: "#FEF3C7",
  },
  iconCircleGreen: {
    backgroundColor: "#DCFCE7",
  },
  iconCircleRed: {
    backgroundColor: "#FEE2E2",
  },
  badgeAmber: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  badgeTextAmber: {
    color: "#D97706",
    fontSize: 12,
    fontFamily: "Lato-Bold",
  },
  badgeGreen: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  badgeTextGreen: {
    color: "#059669",
    fontSize: 12,
    fontFamily: "Lato-Bold",
  },
  badgeRed: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  badgeTextRed: {
    color: "#DC2626",
    fontSize: 12,
    fontFamily: "Lato-Bold",
  },
  title: {
    fontSize: 24,
    fontFamily: "DemoOsbert-Bold",
    color: "#1f2937",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Lato",
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDFA",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CCFBF1",
    padding: 14,
    marginBottom: 28,
    width: "100%",
  },
  infoBoxText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Lato",
    color: "#115E59",
    lineHeight: 18,
  },
  rejectionCard: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 14,
    padding: 16,
    width: "100%",
    marginBottom: 10,
  },
  rejectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  rejectionHeaderTitle: {
    fontSize: 13,
    fontFamily: "Lato-Bold",
    color: "#991B1B",
  },
  rejectionText: {
    fontSize: 13,
    fontFamily: "Lato",
    color: "#B91C1C",
    lineHeight: 18,
  },
  primaryButton: {
    flexDirection: "row",
    backgroundColor: "#1A6B6B",
    width: "100%",
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1A6B6B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontFamily: "Lato-Bold",
  },
  secondaryButton: {
    width: "100%",
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  secondaryButtonText: {
    color: "#4b5563",
    fontSize: 14,
    fontFamily: "Lato-Bold",
  },
  footer: {
    alignItems: "center",
    paddingTop: 30,
    paddingBottom: 10,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  logoutText: {
    color: "#6b7280",
    fontSize: 14,
    fontFamily: "Lato",
  },
});
