import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, SafeAreaView, Platform, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import axios from "axios";
import { BASE_URL } from "../../config/api";

export default function TechnicianNotifications() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const [bookings, setBookings] = useState<any[]>([]);

  const fetchBookings = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) return;
      const res = await axios.post(`${BASE_URL}/technicians/jobs/get_jobs.php`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data && res.data.success && Array.isArray(res.data.bookings)) {
        setBookings(res.data.bookings);
      }
    } catch (e) {
      console.warn("Could not fetch bookings list for notification resolution:", e);
    }
  };

  const fetchNotifications = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) return;
      const res = await axios.post(`${BASE_URL}/technicians/notifications/get_notifications.php`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data && res.data.success) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unread_count || 0);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchBookings();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
    fetchBookings();
  };

  const markAsRead = async (id: number | 'all') => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) return;
      
      const formData = new FormData();
      if (id === 'all') {
        formData.append('all', '1');
      } else {
        formData.append('notification_id', String(id));
      }

      const res = await axios.post(`${BASE_URL}/technicians/notifications/mark_read.php`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      if (res.data && res.data.success) {
        fetchNotifications();
      }
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const handleNotificationPress = (notif: any) => {
    if (notif.is_read === 0 || notif.is_read === "0") {
      markAsRead(notif.id);
    }

    // Direct property if available
    const directId = notif.booking_id || notif.job_id || notif.assignment_id || notif.target_id;
    if (directId) {
      router.push(`/tech-job/${directId}` as any);
      return;
    }

    // Extract booking code like FP-ELE-110FCF3, FP-PLB-72200B9, UBX-2026-756F5D
    const combined = `${notif.title || ''} ${notif.message || ''}`;
    const codeMatch = combined.match(/\b([A-Z0-9]{2,6}-[A-Z0-9]{2,6}-[A-Z0-9]{4,10})\b/i) ||
                      combined.match(/\b([A-Z]{2,4}-[A-Z0-9]+-[A-Z0-9]+)\b/i) ||
                      combined.match(/(?:job|booking)\s+#?([A-Z0-9-]+)/i);
    const code = codeMatch ? codeMatch[1].trim() : null;

    if (code) {
      // Look up in loaded bookings list to get numeric booking_id if available
      const found = bookings.find((b: any) =>
        String(b.booking_code || '').toUpperCase() === code.toUpperCase() ||
        String(b.booking_id || b.id) === code
      );
      const targetId = found ? (found.booking_id || found.id) : code;
      router.push(`/tech-job/${targetId}` as any);
      return;
    }

    // Fallback if no specific job identifier is in the notification
    Alert.alert(notif.title || "Notification", notif.message || "");
  };

  // Helper to format date string
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Notifications</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={() => markAsRead('all')}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 80 }} />
        )}
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1A6B6B" />
        </View>
      ) : (
        <ScrollView 
          contentContainerStyle={styles.container} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#1A6B6B"]} />
          }
        >
          {notifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="notifications-off-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyText}>You have no notifications yet.</Text>
            </View>
          ) : (
            <View style={styles.timelineContainer}>
              {notifications.map((notif, index) => {
                const isUnread = notif.is_read === 0 || notif.is_read === "0";
                return (
                  <TouchableOpacity 
                    key={notif.id || index} 
                    style={[styles.notificationItem, isUnread && styles.notificationItemHighlighted]}
                    onPress={() => handleNotificationPress(notif)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.iconContainer}>
                      <Ionicons name={isUnread ? "notifications" : "notifications-outline"} size={20} color={isUnread ? "#1A6B6B" : "#9ca3af"} />
                    </View>
                    <View style={styles.textContainer}>
                      <View style={styles.titleRow}>
                        <Text style={styles.notifTitle}>{notif.title}</Text>
                        <Text style={styles.dateText}>{formatDate(notif.date_added)}</Text>
                      </View>
                      <Text style={styles.notifSubtitle}>{notif.message}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#9ca3af" style={{ alignSelf: 'center', marginLeft: 8 }} />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
    paddingTop: Platform.OS === 'android' ? 40 : 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  pageTitle: {
    fontSize: 22,
    fontFamily: "DemoOsbert-Bold",
    color: "#1f2937",
    fontWeight: "bold",
  },
  markAllText: {
    fontSize: 14,
    fontFamily: "Lato-Bold",
    color: "#1A6B6B",
  },
  container: {
    paddingBottom: 40,
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: "Lato",
    color: "#9ca3af",
  },
  timelineContainer: {
    paddingVertical: 12,
  },
  notificationItem: {
    flexDirection: "row",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f9fafb",
  },
  notificationItemHighlighted: {
    backgroundColor: "#F0F9F9",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  textContainer: {
    flex: 1,
    justifyContent: "center",
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  notifTitle: {
    fontSize: 15,
    fontFamily: "Lato-Bold",
    color: "#1f2937",
    flex: 1,
    marginRight: 8,
  },
  dateText: {
    fontSize: 11,
    fontFamily: "Lato",
    color: "#9ca3af",
    marginTop: 2,
  },
  notifSubtitle: {
    fontSize: 13,
    fontFamily: "Lato",
    color: "#6b7280",
    lineHeight: 18,
  }
});
