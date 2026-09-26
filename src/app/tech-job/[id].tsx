import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { BASE_URL, IMAGE_BASE_URL } from "../../config/api";

export default function TechJobDetails() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<any>(null);

  const [actionLoading, setActionLoading] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [zoomModalVisible, setZoomModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const fetchJobDetails = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) return;

      let resolvedBookingId = id as string;
      if (id && isNaN(Number(id))) {
        try {
          const jobsRes = await axios.post(`${BASE_URL}/technicians/jobs/get_jobs.php`, {}, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (jobsRes.data?.success && Array.isArray(jobsRes.data.bookings)) {
            const match = jobsRes.data.bookings.find((b: any) =>
              String(b.booking_code || '').toUpperCase() === String(id).toUpperCase() ||
              String(b.booking_id || b.id) === String(id)
            );
            if (match) {
              resolvedBookingId = String(match.booking_id || match.id);
            }
          }
        } catch (e) {}
      }

      const formData = new FormData();
      formData.append('booking_id', resolvedBookingId);

      const res = await axios.post(`${BASE_URL}/technicians/jobs/get_booking_details.php`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (res.data && res.data.success) {
        console.log(res.data);

        setDetails(res.data);
      } else {
        Alert.alert("Error", res.data?.msg || "Could not fetch job details");
      }
    } catch (err) {
      console.error("Failed to fetch tech job details:", err);
      Alert.alert("Error", "A network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchJobDetails();
    }
  }, [id]);

  const handleAcceptJob = async () => {
    const assignmentId = details?.booking?.assignment_id || details?.booking?.id || id;
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
        fetchJobDetails(); // Refresh to see updated status
      } else {
        Alert.alert("Error", res.data?.msg || "Failed to accept job.");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Network error occurred.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectJob = async () => {
    if (!rejectReason.trim()) {
      Alert.alert("Error", "Please provide a reason.");
      return;
    }

    const assignmentId = details?.booking?.assignment_id || details?.booking?.id || id;
    try {
      setActionLoading(true);
      const token = await SecureStore.getItemAsync('userToken');
      const formData = new FormData();
      formData.append('assignment_id', assignmentId);
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
        router.back(); // Go back after rejecting
      } else {
        Alert.alert("Error", res.data?.msg || "Failed to reject job.");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Network error occurred.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangeStatus = async (newStatus: number) => {
    const assignmentId = details?.assignedTechs?.find((t: any) => t.user_status == 1)?.id || details?.assignedTechs?.[0]?.id || details?.booking?.assignment_id || details?.booking?.id || id;
    try {
      setActionLoading(true);
      const token = await SecureStore.getItemAsync('userToken');
      const formData = new FormData();
      formData.append('assignment_id', assignmentId);
      formData.append('status', newStatus.toString());

      const res = await axios.post(`${BASE_URL}/technicians/jobs/change_job_status.php`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (res.data?.success) {
        Alert.alert("Success", "Status updated!");
        fetchJobDetails(); 
      } else {
        Alert.alert("Error", res.data?.msg || "Failed to update status.");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Network error occurred.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleGoToComplete = () => {
    const assignmentId = myTechRecord?.id || details?.booking?.assignment_id || details?.booking?.id || id;
    router.push({
      pathname: "/tech-job/complete",
      params: { 
        assignment_id: assignmentId, 
        title: booking?.service_name || booking?.title,
        price: booking?.booking_charges
      }
    });
  };

  const handleGoToAdjustPrice = () => {
    const assignmentId = myTechRecord?.id || details?.booking?.assignment_id || details?.booking?.id || id;
    router.push({
      pathname: "/tech-job/adjust-price",
      params: { 
        assignment_id: assignmentId, 
        base_price: booking?.booking_charges
      }
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1A6B6B" />
      </SafeAreaView>
    );
  }

  if (!details || !details.booking) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.errorText}>Job details not found.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const { booking, images, completion_images, assignedTechs } = details;
  const isPending = Number(booking.status) === 1;
  const myTechRecord = assignedTechs?.find((t: any) => t.user_status == 1) || assignedTechs?.[0];
  const isClientConfirmed = String(myTechRecord?.user_status) === "1";

  const getImageUrl = (url: string) => {
    if (!url) return '';
    return url.startsWith('http') ? url : `${IMAGE_BASE_URL}/${url}`;
  };

  const getStatusStyle = (statusNum: number | string) => {
    const s = Number(statusNum);
    const techStatus = String(myTechRecord?.technician_status || myTechRecord?.status || "0");
    switch (s) {
      case 1: 
        if (techStatus === "1" || techStatus === "2") {
          return { bg: '#dbeafe', text: '#3B82F6', label: 'Waiting for Client' };
        }
        return { bg: '#fef3c7', text: '#D97706', label: 'Pending Acceptance' };
      case 2: return { bg: '#d1fae5', text: '#059669', label: 'Client Confirmed' };
      case 3: return { bg: '#dbeafe', text: '#3B82F6', label: 'Work In Progress' };
      case 4: return { bg: '#d1fae5', text: '#059669', label: 'Completed' };
      case 5: return { bg: '#e0e7ff', text: '#4338ca', label: 'On My Way' };
      case 6: return { bg: '#dcfce7', text: '#15803d', label: 'Arrived' };
      case 7: return { bg: '#fef3c7', text: '#D97706', label: 'Price Review' };
      default: return { bg: '#e5e7eb', text: '#4b5563', label: `Status ${s}` };
    }
  };

  const statusStyle = getStatusStyle(booking.status);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Main Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.bookingCode}>{booking.booking_code || `ID: ${booking.booking_id || booking.id}`}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
              <Text style={[styles.statusText, { color: statusStyle.text }]}>{statusStyle.label}</Text>
            </View>
          </View>

          <Text style={styles.serviceTitle}>{booking.service_name || booking.title || "Service Request"}</Text>

          {booking.booking_charges ? (
            <Text style={styles.priceText}>Base Quote: €{booking.booking_charges}</Text>
          ) : null}
          {myTechRecord?.amount_paid && String(myTechRecord.amount_paid) !== String(booking.booking_charges) ? (
            <Text style={[styles.priceText, { color: '#059669', fontSize: 16, marginTop: 4 }]}>
              Final Quote Submitted: €{myTechRecord.amount_paid}
            </Text>
          ) : null}

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="calendar-outline" size={18} color="#1A6B6B" />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Date</Text>
              <Text style={styles.infoValue}>{booking.booking_date || booking.date_added || "ASAP"}</Text>
            </View>
          </View>

          {booking.address ? (
            <View style={styles.infoRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="location-outline" size={18} color="#1A6B6B" />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Address</Text>
                <Text style={styles.infoValue}>{booking.address}</Text>
              </View>
            </View>
          ) : null}

          {booking.notes ? (
            <View style={styles.infoRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="document-text-outline" size={18} color="#1A6B6B" />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Client's Notes</Text>
                <Text style={styles.infoValue}>{booking.notes}</Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* Status 7: Quote Review Phase Notice (Image 2) */}
        {Number(booking.status) === 7 && (
          <View style={styles.quoteStatusBox}>
            <View style={styles.quoteStatusHeaderRow}>
              <Ionicons name="receipt-outline" size={22} color="#b45309" />
              <Text style={styles.quoteStatusTitle}>Quote Review Phase</Text>
            </View>
            <Text style={styles.quoteStatusText}>
              Once the customer accepts the quote, tap "Start Job (In Progress)" below to begin work. If client requested changes, tap "Revise Quote".
            </Text>
          </View>
        )}

        {/* Problem Photos */}
        {images && images.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Problem Photos</Text>
            <View style={styles.photosGrid}>
              {images.map((img: any, idx: number) => (
                <TouchableOpacity 
                  key={idx} 
                  style={styles.photoWrapper}
                  onPress={() => {
                    setSelectedImage(getImageUrl(typeof img === 'string' ? img : img.url));
                    setZoomModalVisible(true);
                  }}
                >
                  <Image source={{ uri: getImageUrl(typeof img === 'string' ? img : img.url) }} style={styles.galleryImage} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

      </ScrollView>

      {/* Sticky Bottom Actions if Pending */}
      {isPending && (
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.rejectBtn]}
            onPress={() => setRejectModalVisible(true)}
            disabled={actionLoading}
          >
            <Text style={styles.rejectBtnText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.acceptBtn]}
            onPress={handleAcceptJob}
            disabled={actionLoading}
          >
            {actionLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.acceptBtnText}>Accept Job</Text>}
          </TouchableOpacity>
        </View>
      )}

      {/* Progress Actions */}
      {Number(booking.status) === 2 && isClientConfirmed && (
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.progressBtn]}
            onPress={() => handleChangeStatus(5)}
            disabled={actionLoading}
          >
            {actionLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.progressBtnText}>Tap when On My Way</Text>}
          </TouchableOpacity>
        </View>
      )}
      
      {Number(booking.status) === 5 && (
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.progressBtn]}
            onPress={() => handleChangeStatus(6)}
            disabled={actionLoading}
          >
            {actionLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.progressBtnText}>Tap when Arrived</Text>}
          </TouchableOpacity>
        </View>
      )}

      {Number(booking.status) === 6 && (
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.progressBtn]}
            onPress={handleGoToAdjustPrice}
            disabled={actionLoading}
          >
            <Text style={styles.progressBtnText}>Submit Final Price</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Status 7: Quote Review - Start Job (In Progress) or Revise Quote */}
      {Number(booking.status) === 7 && (
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.secondaryActionBtn]}
            onPress={handleGoToAdjustPrice}
            disabled={actionLoading}
          >
            <Ionicons name="pricetag-outline" size={16} color="#1A6B6B" style={{ marginRight: 6 }} />
            <Text style={styles.secondaryActionBtnText}>Revise Quote</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.progressBtn, { flex: 2 }]}
            onPress={() => handleChangeStatus(3)}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="play" size={18} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.progressBtnText}>Start Job (In Progress)</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {Number(booking.status) === 3 && (
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.progressBtn]}
            onPress={handleGoToComplete}
            disabled={actionLoading}
          >
            <Text style={styles.progressBtnText}>Mark Job As Complete</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Reject Reason Modal */}
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
              placeholder="e.g. Too far, not available..."
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

      {/* Zoom Image Modal */}
      <Modal visible={zoomModalVisible} transparent={true} animationType="fade" onRequestClose={() => setZoomModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity style={{ position: 'absolute', top: Platform.OS === 'ios' ? 50 : 30, right: 20, zIndex: 10, padding: 10 }} onPress={() => setZoomModalVisible(false)}>
            <Ionicons name="close" size={32} color="#fff" />
          </TouchableOpacity>
          {selectedImage && (
            <Image source={{ uri: selectedImage }} style={{ width: '100%', height: '80%', resizeMode: 'contain' }} />
          )}
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f9fafb",
    paddingTop: Platform.OS === 'android' ? 40 : 0,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#f9fafb",
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontSize: 16,
    fontFamily: "Lato",
    color: "#4b5563",
    marginBottom: 16,
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#1A6B6B",
    borderRadius: 8,
  },
  backBtnText: {
    color: "#ffffff",
    fontFamily: "Lato-Bold",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "DemoOsbert-Bold",
    color: "#1f2937",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  bookingCode: {
    fontSize: 14,
    fontFamily: "Lato-Bold",
    color: "#1A6B6B",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontFamily: "Lato-Bold",
  },
  serviceTitle: {
    fontSize: 22,
    fontFamily: "DemoOsbert-Bold",
    color: "#1f2937",
    marginBottom: 8,
  },
  priceText: {
    fontSize: 16,
    fontFamily: "Lato-Bold",
    color: "#1f2937",
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: "#f3f4f6",
    marginVertical: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f0fdfa",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontFamily: "Lato",
    color: "#6b7280",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontFamily: "Lato-Bold",
    color: "#1f2937",
    lineHeight: 22,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "DemoOsbert-Bold",
    color: "#1f2937",
    marginBottom: 12,
  },
  photosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  photoWrapper: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  galleryImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  bottomActions: {
    flexDirection: "row",
    padding: 20,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rejectBtn: {
    backgroundColor: "#fee2e2",
  },
  rejectBtnText: {
    color: "#DC2626",
    fontFamily: "Lato-Bold",
    fontSize: 16,
  },
  acceptBtn: {
    backgroundColor: "#10b981",
  },
  acceptBtnText: {
    color: "#ffffff",
    fontFamily: "Lato-Bold",
    fontSize: 16,
  },
  progressBtn: {
    backgroundColor: "#1A6B6B",
  },
  progressBtnText: {
    color: "#ffffff",
    fontFamily: "Lato-Bold",
    fontSize: 16,
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
  secondaryActionBtn: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1.5,
    borderColor: '#1A6B6B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionBtnText: {
    color: '#1A6B6B',
    fontFamily: 'Lato-Bold',
    fontSize: 15,
  },
  quoteStatusBox: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  quoteStatusHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  quoteStatusTitle: {
    fontSize: 16,
    fontFamily: 'Lato-Bold',
    color: '#92400E',
  },
  quoteStatusText: {
    fontSize: 14,
    fontFamily: 'Lato',
    color: '#78350F',
    lineHeight: 20,
  },
});
