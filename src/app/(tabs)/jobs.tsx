import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Platform, RefreshControl, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { BASE_URL } from "../../config/api";

export default function Bookings() {
  const router = useRouter();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBookings = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) return;

      const res = await axios.post(`${BASE_URL}/clients/jobs/get_bookings.php`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data && res.data.success && Array.isArray(res.data.bookings)) {
        console.log('the bookins i made', res.data);

        setBookings(res.data.bookings);
      } else {
        setBookings([]);
      }
    } catch (err) {
      console.error("Failed to fetch bookings:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBookings();
  }, []);

  const renderEmptyComponent = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name="briefcase-outline" size={48} color="#9ca3af" />
        </View>
        <Text style={styles.emptyTitle}>No Bookings Yet</Text>
        <Text style={styles.emptySubtitle}>
          When you submit a booking request, it will appear here.
        </Text>
      </View>
    );
  };

  const getStatusStyle = (statusNum: number | string) => {
    const s = Number(statusNum);
    switch (s) {
      case 0: return { bg: '#fef3c7', text: '#D97706', label: 'Searching' };
      case 1: return { bg: '#dbeafe', text: '#3B82F6', label: 'Matched' };
      case 2: return { bg: '#d1fae5', text: '#059669', label: 'Tech Assigned' };
      case 3: return { bg: '#d1fae5', text: '#059669', label: 'In Progress' };
      case 4: return { bg: '#dcfce7', text: '#15803d', label: 'Completed' };
      case 5: return { bg: '#e0e7ff', text: '#4338ca', label: 'On My Way' };
      case 6: return { bg: '#dbeafe', text: '#3B82F6', label: 'Arrived' };
      case 7: return { bg: '#fef3c7', text: '#D97706', label: 'Price Review' };
      case 8: return { bg: '#e0f2fe', text: '#0284c7', label: 'Awaiting Sign-Off' };
      case -1: return { bg: '#fee2e2', text: '#DC2626', label: 'Cancelled' };
      default: return { bg: '#f3f4f6', text: '#4b5563', label: 'Pending' };
    }
  };

  const renderJobItem = ({ item }: { item: any }) => {
    const statusStyle = getStatusStyle(item.status);
    const dateStr = item.booking_date || item.date_added || "TBD";
    const title = item.service_name || item.title || "Service Request";

    return (
      <View style={styles.jobCard}>
        <View style={styles.jobHeader}>
          <View style={styles.categoryBadge}>
            <Ionicons name="construct-outline" size={16} color="#1A6B6B" />
            <Text style={styles.categoryText}>{item.booking_code || "Booking"}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>{statusStyle.label}</Text>
          </View>
        </View>

        <Text style={styles.servicesText}>
          {title}
        </Text>

        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color="#6b7280" />
          <Text style={styles.detailText}>
            {dateStr}
          </Text>
        </View>

        {item.address ? (
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={16} color="#6b7280" />
            <Text style={styles.detailText} numberOfLines={1}>{item.address}</Text>
          </View>
        ) : null}

        <View style={styles.footerRow}>
          <Text style={styles.dateText}>{item.booking_charges ? `€${item.booking_charges}` : ""}</Text>
          <TouchableOpacity
            style={styles.detailsButton}
            onPress={() => router.push({
              pathname: "/user-job/[id]",
              params: { id: item.booking_id || item.id || 1 }
            })}
          >
            <Text style={styles.detailsButtonText}>View Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Bookings</Text>
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color="#1A6B6B" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item, index) => item.booking_id?.toString() || item.id?.toString() || index.toString()}
          renderItem={renderJobItem}
          contentContainerStyle={[
            styles.listContent,
            bookings.length === 0 && styles.listContentEmpty
          ]}
          ListEmptyComponent={renderEmptyComponent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1A6B6B" />
          }
        />
      )}
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
  listContent: {
    padding: 24,
    paddingBottom: 40,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: "center",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: "DemoOsbert-Bold",
    color: "#1f2937",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Lato",
    color: "#6b7280",
    textAlign: "center",
    paddingHorizontal: 40,
  },
  jobCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  jobHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdfa",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontFamily: "Lato-Bold",
    color: "#1A6B6B",
    marginLeft: 6,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontFamily: "Lato-Bold",
  },
  servicesText: {
    fontSize: 18,
    fontFamily: "Lato-Bold",
    color: "#1f2937",
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    fontFamily: "Lato",
    color: "#4b5563",
    marginLeft: 10,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  dateText: {
    fontSize: 14,
    fontFamily: "Lato-Bold",
    color: "#1A6B6B",
  },
  detailsButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#1A6B6B",
    borderRadius: 12,
  },
  detailsButtonText: {
    fontSize: 12,
    fontFamily: "Lato-Bold",
    color: "#ffffff",
  },
});
