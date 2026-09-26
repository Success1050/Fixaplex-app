import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { useFocusEffect, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { BASE_URL } from "../../config/api";
import { useAuthStore } from "../../store/useAuthStore";

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
};

export default function TechnicianHome() {
  const router = useRouter();
  const setRole = useAuthStore(state => state.setRole);
  const isTechnicianOnboarded = useAuthStore(state => state.isTechnicianOnboarded);
  const userData = useAuthStore(state => state.userData);
  const setUserData = useAuthStore(state => state.setUserData);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingBookings, setPendingBookings] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [totalJobs, setTotalJobs] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isAvailable, setIsAvailable] = useState<boolean>(() => {
    if (userData?.availability !== undefined && userData?.availability !== null) {
      return Number(userData.availability) === 1;
    }
    return false;
  });
  const [togglingAvailability, setTogglingAvailability] = useState(false);

  // Reject Modal State
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const handleToggleAvailability = async () => {
    const prev = isAvailable;
    const newVal = !isAvailable;
    setIsAvailable(newVal);
    setTogglingAvailability(true);

    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) return;

      const formData = new FormData();
      formData.append('availability', newVal ? '1' : '0');
      formData.append('is_available', newVal ? '1' : '0');
      formData.append('status', newVal ? '1' : '0');
      formData.append('is_online', newVal ? '1' : '0');

      const res = await axios.post(`${BASE_URL}/technicians/accounts/set_availability.php`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.data && res.data.success) {
        const serverAvail =
          res.data.availability !== undefined
            ? Number(res.data.availability) === 1
            : newVal;
        setIsAvailable(serverAvail);
        const updated = { ...userData, availability: serverAvail ? 1 : 0 };
        setUserData(updated);
        await SecureStore.setItemAsync('userData', JSON.stringify(updated));
      } else {
        setIsAvailable(prev);
        Alert.alert("Update Failed", res.data?.msg || "Could not update availability.");
      }
    } catch (err) {
      setIsAvailable(prev);
      Alert.alert("Network Error", "Unable to update availability status. Please check your connection.");
    } finally {
      setTogglingAvailability(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) return;

      const res = await axios.post(`${BASE_URL}/technicians/home/jobs.php`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data && res.data.success) {
        console.log('recent jobs', res.data);

        setPendingBookings(res.data.pending_bookings || []);
        setBookings(res.data.bookings || []);
        setTotalJobs(res.data.total_jobs || 0);
        setTotalEarnings(res.data.totalEarnings || 0);

        if (res.data.availability !== undefined && res.data.availability !== null) {
          const serverAvail = Number(res.data.availability) === 1;
          setIsAvailable(serverAvail);
          const updated = { ...userData, availability: serverAvail ? 1 : 0 };
          setUserData(updated);
          SecureStore.setItemAsync('userData', JSON.stringify(updated));
        }
      }
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) return;
      const res = await axios.post(`${BASE_URL}/technicians/notifications/get_notifications.php`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data && res.data.success) {
        setUnreadCount(res.data.unread_count || 0);
      }
    } catch (err) {
      console.error("Failed to fetch unread count", err);
    }
  };

  const getStatusInfo = (statusNum: number | string) => {
    const s = Number(statusNum);
    switch (s) {
      case 0: return { bg: '#f3f4f6', text: '#6b7280', label: 'Pending' };
      case 1: return { bg: '#fef3c7', text: '#D97706', label: 'Pending Acceptance' };
      case 2: return { bg: '#d1fae5', text: '#059669', label: 'Client Confirmed' };
      case 5: return { bg: '#e0e7ff', text: '#4338ca', label: 'On My Way' };
      case 6: return { bg: '#dcfce7', text: '#15803d', label: 'Arrived' };
      case 7: return { bg: '#fef3c7', text: '#D97706', label: 'Price Review' };
      case 3: return { bg: '#1A6B6B', text: '#ffffff', label: 'Work In Progress' };
      case 8: return { bg: '#fef3c7', text: '#D97706', label: 'Awaiting Sign-Off' };
      case 4: return { bg: '#10b981', text: '#ffffff', label: 'Completed' };
      case -1: return { bg: '#fee2e2', text: '#DC2626', label: 'Cancelled' };
      default: return { bg: '#1A6B6B', text: '#ffffff', label: 'Active' };
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchUnreadCount();
      fetchDashboardData();
      if (userData?.availability !== undefined && userData?.availability !== null) {
        setIsAvailable(Number(userData.availability) === 1);
      }
    }, [userData?.availability])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardData();
    fetchUnreadCount();
  }, []);

  const handleRoleToggle = () => {
    setRole('user' as any);
    router.replace("/(tabs)");
  };

  const handleAcceptJob = async (assignmentId: string) => {
    try {
      setActionLoading(true);
      const token = await SecureStore.getItemAsync('userToken');
      const formData = new FormData();
      formData.append('assignment_id', assignmentId);

      const res = await axios.post(`${BASE_URL}/technicians/jobs/accept_job.php`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (res.data?.success) {
        Alert.alert("Success", "Job accepted!");
        fetchDashboardData();
      } else {
        Alert.alert("Error", res.data?.msg || "Failed to accept job.");
      }
    } catch (err) {
      Alert.alert("Error", "Network error occurred.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectJob = async () => {
    if (!rejectReason.trim()) {
      Alert.alert("Error", "Please provide a reason for rejecting the job.");
      return;
    }

    try {
      setActionLoading(true);
      const token = await SecureStore.getItemAsync('userToken');
      const formData = new FormData();
      formData.append('assignment_id', selectedJobId!);
      formData.append('reason', rejectReason);

      const res = await axios.post(`${BASE_URL}/technicians/jobs/reject_job.php`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (res.data?.success) {
        Alert.alert("Success", "Job rejected.");
        setRejectModalVisible(false);
        setRejectReason("");
        setSelectedJobId(null);
        fetchDashboardData();
      } else {
        Alert.alert("Error", res.data?.msg || "Failed to reject job.");
      }
    } catch (err) {
      Alert.alert("Error", "Network error occurred.");
    } finally {
      setActionLoading(false);
    }
  };

  const openRejectModal = (id: string) => {
    setSelectedJobId(id);
    setRejectReason("");
    setRejectModalVisible(true);
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.greeting}>{getGreeting()},{"\n"}{userData?.full_name?.split(' ')[0] || 'Technician'}</Text>
      <View style={styles.headerRight}>
        <TouchableOpacity style={styles.toggleButton} onPress={handleRoleToggle}>
          <Ionicons name="people-outline" size={24} color="#1A6B6B" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.notificationIcon} onPress={() => router.push("/(technician-tabs)/notifications" as any)}>
          <Ionicons name="notifications-outline" size={24} color="#1f2937" />
          {unreadCount > 0 && <View style={styles.notificationBadge} />}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
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
          {renderHeader()}

          {/* Prominent Availability Card (Tech Items 5, 18) */}
          <TouchableOpacity 
            style={[styles.availabilityCard, isAvailable ? styles.availabilityCardOnline : styles.availabilityCardOffline]}
            activeOpacity={0.85}
            disabled={togglingAvailability}
            onPress={handleToggleAvailability}
          >
            <View style={styles.availabilityStatusDotWrapper}>
              <View style={[styles.availabilityStatusDot, isAvailable ? styles.dotOnline : styles.dotOffline]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.availabilityMainTitle}>
                {isAvailable ? "You're Available" : "You're Offline"}
              </Text>
              <Text style={styles.availabilitySubText}>
                {isAvailable ? "Ready to receive new jobs • Tap to change" : "Paused • Tap to go online"}
              </Text>
            </View>
            <View style={[styles.switchPill, isAvailable ? styles.switchPillOnline : styles.switchPillOffline]}>
              <Text style={[styles.switchPillText, isAvailable ? styles.switchTextOnline : styles.switchTextOffline]}>
                {isAvailable ? "ONLINE" : "OFFLINE"}
              </Text>
            </View>
          </TouchableOpacity>

          {pendingBookings.map((job: any, idx: number) => (
            <View key={idx} style={styles.pendingCard}>
              <View style={styles.pendingCardHeader}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={styles.notificationTitleWhite}>New Job Assigned!</Text>
                  <Text style={styles.notificationSubtitleWhite} numberOfLines={2}>{job.address} • {job.schedule_type || 'ASAP'}</Text>
                </View>
                <View style={styles.priceBadge}>
                  <Text style={styles.priceBadgeText}>€{job.booking_charges}</Text>
                </View>
              </View>

              <Text style={styles.pendingServiceText}>{job.service_name}</Text>

              <View style={styles.actionButtonsRow}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={() => openRejectModal(job.assignment_id || job.id)}
                  disabled={actionLoading}
                >
                  <Text style={styles.rejectButtonText}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.acceptButton]}
                  onPress={() => handleAcceptJob(job.assignment_id || job.id)}
                  disabled={actionLoading}
                >
                  <Text style={styles.acceptButtonText}>Accept Job</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          <Text style={styles.sectionTitle}>This week</Text>

          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Ionicons name="cash-outline" size={20} color="#1A6B6B" />
              </View>
              <Text style={styles.statLabel}>Earnings</Text>
              <Text style={styles.statValue}>€{totalEarnings}</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Ionicons name="briefcase-outline" size={20} color="#1A6B6B" />
              </View>
              <Text style={styles.statLabel}>Jobs</Text>
              <Text style={styles.statValue}>{totalJobs}</Text>
            </View>
          </View>

          <View style={styles.recentJobsContainer}>
            <View style={styles.recentHeader}>
              <Text style={styles.recentTitle}>Recent Jobs</Text>
              <TouchableOpacity style={styles.arrowButton} onPress={() => router.push("/(technician-tabs)/jobs")}>
                <Ionicons name="arrow-forward" size={16} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {bookings.length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <Image
                  source={require("../../../assets/images/1.png")}
                  style={styles.emptyStateImage}
                  resizeMode="contain"
                />
                <Text style={styles.emptyStateTitle}>Nothing here yet</Text>
                <Text style={styles.emptyStateSubtitle}>
                  You don't have any recent jobs.
                </Text>
              </View>
            ) : (
              bookings.slice(0, 5).map((job: any, idx: number) => {
                const statusInfo = getStatusInfo(job.booking_status || job.status);
                const jobId = job.booking_id || job.id;
                return (
                  <TouchableOpacity
                    key={jobId || idx}
                    style={styles.jobRow}
                    activeOpacity={0.7}
                    onPress={() => {
                      if (jobId) {
                        router.push(`/tech-job/${jobId}` as any);
                      }
                    }}
                  >
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={styles.jobTitle} numberOfLines={1}>{job.service_name || job.title}</Text>
                      <Text style={styles.jobSubtitle} numberOfLines={1}>{job.address}</Text>
                    </View>
                    <View style={styles.jobRight}>
                      <Text style={styles.jobPrice}>€{job.booking_charges}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
                        <Text style={[styles.statusText, { color: statusInfo.text }]}>{statusInfo.label}</Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#9ca3af" style={{ marginLeft: 6 }} />
                  </TouchableOpacity>
                );
              })
            )}
          </View>

        </ScrollView>
      )}

      <Modal
        visible={rejectModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reject Job</Text>
            <Text style={styles.modalSubtitle}>Please provide a reason for rejecting this assignment.</Text>

            <TextInput
              style={styles.textInput}
              placeholder="e.g. Too far, Not available, etc."
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setRejectModalVisible(false)}
                disabled={actionLoading}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleRejectJob}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.modalSubmitText}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
    paddingBottom: 60,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  greeting: {
    fontSize: 22,
    fontFamily: "DemoOsbert-Bold",
    color: "#1f2937",
    lineHeight: 28,
  },
  toggleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E8F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  notificationIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  notificationBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#ef4444",
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  pendingCard: {
    backgroundColor: "#1f2937",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  pendingCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  notificationTitleWhite: {
    color: "#ffffff",
    fontFamily: "DemoOsbert-Bold",
    fontSize: 18,
    marginBottom: 4,
  },
  notificationSubtitleWhite: {
    color: "#ffffff",
    opacity: 0.8,
    fontFamily: "Lato",
    fontSize: 13,
  },
  priceBadge: {
    backgroundColor: "#ffffff20",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priceBadgeText: {
    color: "#ffffff",
    fontFamily: "Lato-Bold",
    fontSize: 14,
  },
  pendingServiceText: {
    color: "#ffffff",
    fontSize: 16,
    fontFamily: "Lato-Bold",
    marginBottom: 20,
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  rejectButton: {
    backgroundColor: "#ffffff20",
  },
  rejectButtonText: {
    color: "#ffffff",
    fontFamily: "Lato-Bold",
  },
  acceptButton: {
    backgroundColor: "#10b981",
  },
  acceptButtonText: {
    color: "#ffffff",
    fontFamily: "Lato-Bold",
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Lato",
    color: "#1f2937",
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 16,
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderWidth: 1,
    borderColor: "#1A6B6B",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "Lato-Bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontFamily: "Lato-Bold",
    color: "#1f2937",
  },
  recentJobsContainer: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 16,
    paddingTop: 16,
  },
  recentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  recentTitle: {
    fontSize: 14,
    fontFamily: "Lato-Bold",
    color: "#1f2937",
  },
  arrowButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  jobRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    backgroundColor: "#f9fafb",
  },
  jobTitle: {
    fontSize: 14,
    fontFamily: "Lato-Bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  jobSubtitle: {
    fontSize: 12,
    fontFamily: "Lato",
    color: "#6b7280",
  },
  jobRight: {
    alignItems: "flex-end",
  },
  jobPrice: {
    fontSize: 14,
    fontFamily: "Lato-Bold",
    color: "#1f2937",
    marginBottom: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusGreen: {
    backgroundColor: "#059669",
  },
  statusTeal: {
    backgroundColor: "#1A6B6B",
  },
  statusText: {
    color: "#ffffff",
    fontSize: 10,
    fontFamily: "Lato-Bold",
  },
  emptyStateContainer: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyStateImage: {
    width: 150,
    height: 150,
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontFamily: "DemoOsbert-Bold",
    color: "#1f2937",
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 12,
    fontFamily: "Lato",
    color: "#9ca3af",
    textAlign: "center",
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'DemoOsbert-Bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: 'Lato',
    color: '#6b7280',
    marginBottom: 20,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontFamily: 'Lato',
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalCancelText: {
    color: '#6b7280',
    fontFamily: 'Lato-Bold',
  },
  modalSubmitBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#DC2626',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  modalSubmitText: {
    color: '#ffffff',
    fontFamily: 'Lato-Bold',
  },
  availabilityCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    gap: 12,
  },
  availabilityCardOnline: {
    backgroundColor: "#F0FDFA",
    borderColor: "#99F6E4",
  },
  availabilityCardOffline: {
    backgroundColor: "#F9FAFB",
    borderColor: "#E5E7EB",
  },
  availabilityStatusDotWrapper: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.04)",
  },
  availabilityStatusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dotOnline: {
    backgroundColor: "#10B981",
  },
  dotOffline: {
    backgroundColor: "#9CA3AF",
  },
  availabilityMainTitle: {
    fontSize: 16,
    fontFamily: "Lato-Bold",
    color: "#1F2937",
    marginBottom: 2,
  },
  availabilitySubText: {
    fontSize: 12,
    fontFamily: "Lato",
    color: "#6B7280",
  },
  switchPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  switchPillOnline: {
    backgroundColor: "#1A6B6B",
  },
  switchPillOffline: {
    backgroundColor: "#E5E7EB",
  },
  switchPillText: {
    fontSize: 11,
    fontFamily: "Lato-Bold",
    letterSpacing: 0.5,
  },
  switchTextOnline: {
    color: "#ffffff",
  },
  switchTextOffline: {
    color: "#6B7280",
  },
});
