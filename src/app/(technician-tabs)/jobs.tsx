import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Platform, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { BASE_URL } from "../../config/api";

export default function TechnicianJobs() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);

  const fetchJobs = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) return;

      const res = await axios.post(`${BASE_URL}/technicians/jobs/get_jobs.php`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data && res.data.success) {
        setBookings(res.data.bookings || []);
        console.log('the jobs for', res.data);
      }
    } catch (err) {
      console.error("Failed to fetch technician jobs:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchJobs();
  }, []);

  // Split bookings based on status (4 is completed, others active excluding cancelled/pending)
  const activeJobs = bookings.filter(b => ![4, -1, 0].includes(Number(b.booking_status || b.status)));
  const completedJobs = bookings.filter(b => Number(b.booking_status || b.status) === 4);

  const getStatusInfo = (statusNum: number | string, techStatus?: string | number) => {
    const s = Number(statusNum);
    switch (s) {
      case 1: 
        if (String(techStatus) === "1" || String(techStatus) === "2") {
          return { bg: '#dbeafe', text: '#3B82F6', label: 'Waiting for Client' };
        }
        return { bg: '#fef3c7', text: '#D97706', label: 'Pending Acceptance' };
      case 2: return { bg: '#d1fae5', text: '#059669', label: 'Client Confirmed' };
      case 3: return { bg: '#1A6B6B', text: '#ffffff', label: 'In Progress' };
      case 4: return { bg: '#10b981', text: '#ffffff', label: 'Completed' };
      case 5: return { bg: '#e0e7ff', text: '#4338ca', label: 'On My Way' };
      case 6: return { bg: '#dcfce7', text: '#15803d', label: 'Arrived' };
      case 7: return { bg: '#fef3c7', text: '#D97706', label: 'Finished (Pending Review)' };
      default: return { bg: '#1A6B6B', text: '#ffffff', label: 'Active' };
    }
  };

  const renderJobCard = (job: any, isCompleted: boolean) => {
    const statusInfo = getStatusInfo(job.booking_status || job.status, job.technician_status);

    return (
      <TouchableOpacity
        key={job.booking_id || job.id}
        style={styles.jobCard}
        onPress={() => router.push(`/tech-job/${job.booking_id || job.id}` as any)}
      >
        <View style={styles.jobInfo}>
          <Text style={styles.jobTitle}>{job.service_name || job.title}</Text>
          <Text style={styles.jobSubtitle}>{job.address} • {job.booking_date || job.date_added}</Text>
        </View>
        <View style={styles.jobMeta}>
          <Text style={styles.jobPrice}>€{job.booking_charges}</Text>
          <View style={[styles.badgeTeal, { backgroundColor: statusInfo.bg }]}>
            <Text style={[styles.badgeText, { color: statusInfo.text }]}>{statusInfo.label}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>My Jobs</Text>
      </View>

      {loading && !refreshing ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#1A6B6B" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1A6B6B" />}
        >
          {activeJobs.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Active</Text>
              {activeJobs.map(job => renderJobCard(job, false))}
              <View style={styles.divider} />
            </>
          )}

          {completedJobs.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Completed</Text>
              {completedJobs.map(job => renderJobCard(job, true))}
            </>
          )}

          {bookings.length === 0 && (
            <View style={styles.emptyContainer}>
              <Ionicons name="briefcase-outline" size={64} color="#e5e7eb" style={{ marginBottom: 16 }} />
              <Text style={styles.emptyTitle}>No Jobs Yet</Text>
              <Text style={styles.emptySubtitle}>You don't have any job history right now.</Text>
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
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: "#ffffff",
  },
  pageTitle: {
    fontSize: 24,
    fontFamily: "DemoOsbert-Bold",
    color: "#1f2937",
  },
  container: {
    padding: 24,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Lato-Bold",
    color: "#9ca3af",
    marginBottom: 16,
  },
  jobCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  jobInfo: {
    flex: 1,
    paddingRight: 12,
  },
  jobTitle: {
    fontSize: 15,
    fontFamily: "Lato-Bold",
    color: "#1f2937",
    marginBottom: 6,
  },
  jobSubtitle: {
    fontSize: 13,
    fontFamily: "Lato",
    color: "#6b7280",
  },
  jobMeta: {
    alignItems: "flex-end",
  },
  jobPrice: {
    fontSize: 16,
    fontFamily: "Lato-Bold",
    color: "#1A6B6B",
    marginBottom: 8,
  },
  badgeTeal: {
    backgroundColor: "#1A6B6B",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeGreen: {
    backgroundColor: "#10b981",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontFamily: "Lato-Bold",
  },
  divider: {
    height: 1,
    backgroundColor: "#f3f4f6",
    marginVertical: 24,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "DemoOsbert-Bold",
    color: "#1f2937",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Lato",
    color: "#9ca3af",
  },
});
