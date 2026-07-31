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
  View,
  Linking
} from "react-native";
import { BASE_URL, IMAGE_BASE_URL } from "../../config/api";

export default function BookingDetails() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<any>(null);

  // Actions state
  const [actionLoading, setActionLoading] = useState(false);
  const [declineModalVisible, setDeclineModalVisible] = useState(false);
  const [zoomModalVisible, setZoomModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [declineType, setDeclineType] = useState<'tech' | 'price' | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);

  const fetchBookingDetails = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) return;

      const formData = new FormData();
      formData.append('booking_id', id as string);

      const res = await axios.post(`${BASE_URL}/clients/jobs/get_booking_details.php`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      console.log('client job detail', res.data);


      if (res.data && res.data.success) {
        setDetails(res.data);
      } else {
        Alert.alert("Error", res.data?.msg || "Could not fetch booking details");
      }
    } catch (err) {
      console.error("Failed to fetch booking details:", err);
      Alert.alert("Error", "A network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchBookingDetails();
    }
  }, [id]);

  const handleConfirm = async (type: 'tech' | 'price', decision: 'accept' | 'decline', assignmentId: string, reason?: string) => {
    try {
      setActionLoading(true);
      const token = await SecureStore.getItemAsync('userToken');
      const formData = new FormData();
      formData.append('assignment_id', assignmentId);
      formData.append('decision', decision);
      if (reason) formData.append('reason', reason);

      const endpoint = type === 'tech' ? 'confirm_technician.php' : 'confirm_price.php';
      const res = await axios.post(`${BASE_URL}/clients/jobs/${endpoint}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      console.log('the output', res);


      if (res.data?.success) {
        Alert.alert("Success", "Action completed successfully.");
        setDeclineModalVisible(false);
        setDeclineReason("");
        fetchBookingDetails(); // Refresh details to show updated status
      } else {
        Alert.alert("Error", res.data?.msg || "Failed to process request.");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "A network error occurred.");
    } finally {
      setActionLoading(false);
    }
  };

  const openDeclineModal = (type: 'tech' | 'price', assignmentId: string) => {
    setDeclineType(type);
    setSelectedAssignmentId(assignmentId);
    setDeclineReason("");
    setDeclineModalVisible(true);
  };

  const submitDecline = () => {
    if (selectedAssignmentId && declineType) {
      handleConfirm(declineType, 'decline', selectedAssignmentId, declineReason);
    }
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
        <Text style={styles.errorText}>Booking not found.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const { booking, assignedTechs, images, completion_images, disputes, feedback } = details;

  const getImageUrl = (url: string) => {
    if (!url) return '';
    return url.startsWith('http') ? url : `${IMAGE_BASE_URL}/${url}`;
  };

  const getStatusStyle = (statusNum: number | string) => {
    const s = Number(statusNum);
    switch (s) {
      case 0: return { bg: '#fef3c7', text: '#D97706', label: 'Searching' };
      case 1: return { bg: '#dbeafe', text: '#3B82F6', label: 'Matched' };
      case 2: return { bg: '#d1fae5', text: '#059669', label: 'Tech Assigned' };
      case 3: return { bg: '#d1fae5', text: '#059669', label: 'In Progress' };
      case 4: return { bg: '#d1fae5', text: '#059669', label: 'Completed' };
      case 5: return { bg: '#e0e7ff', text: '#4338ca', label: 'On My Way' };
      case 6: return { bg: '#dcfce7', text: '#15803d', label: 'Arrived' };
      case 7: return { bg: '#fef3c7', text: '#D97706', label: 'Price Review' };
      case -1: return { bg: '#fee2e2', text: '#DC2626', label: 'Cancelled' };
      default: return { bg: '#f3f4f6', text: '#4b5563', label: `Status ${s}` };
    }
  };

  const statusStyle = getStatusStyle(booking.status);

  const renderTimeline = (currentStatus: number) => {
    const s = Number(currentStatus);
    const steps = [
      { title: "Confirmed", active: s >= 2 },
      { title: "On My Way", active: [5, 6, 7, 3, 4].includes(s) },
      { title: "Arrived", active: [6, 7, 3, 4].includes(s) },
      { title: "Work in Progress", active: [3, 4].includes(s) },
      { title: "Completed", active: s === 4 },
    ];

    return (
      <View style={styles.timelineContainer}>
        {steps.map((step, index) => (
          <View key={index} style={styles.timelineStep}>
            <View style={styles.timelineIndicatorWrapper}>
              <View style={[styles.timelineDot, step.active && styles.timelineDotActive]}>
                {step.active && <Ionicons name="checkmark" size={12} color="#ffffff" />}
              </View>
              {index < steps.length - 1 && (
                <View style={[styles.timelineLine, step.active && steps[index + 1].active && styles.timelineLineActive]} />
              )}
            </View>
            <View style={styles.timelineTextContainer}>
              <Text style={[styles.timelineText, step.active && styles.timelineTextActive]}>{step.title}</Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Main Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.bookingCode}>{booking.booking_code || `ID: ${booking.booking_id}`}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
              <Text style={[styles.statusText, { color: statusStyle.text }]}>{statusStyle.label}</Text>
            </View>
          </View>

          <Text style={styles.serviceTitle}>{booking.service_name || booking.title || "Service Request"}</Text>

          {booking.booking_charges ? (
            <Text style={styles.priceText}>Base Charges: €{booking.booking_charges}</Text>
          ) : null}

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="calendar-outline" size={18} color="#1A6B6B" />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Date</Text>
              <Text style={styles.infoValue}>{booking.booking_date || booking.date_added || "TBD"}</Text>
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
                <Text style={styles.infoLabel}>Notes</Text>
                <Text style={styles.infoValue}>{booking.notes}</Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* Price Review Section (Status 7) */}
        {Number(booking.status) === 7 && assignedTechs && assignedTechs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Price Review</Text>
            {assignedTechs.map((tech: any, index: number) => (
              <View key={index} style={styles.priceReviewCard}>
                <View style={styles.priceReviewHeader}>
                  <Text style={styles.priceReviewTitle}>New Quoted Price</Text>
                  <Text style={styles.priceReviewValue}>€{tech.amount_paid}</Text>
                </View>
                {tech.price_reason || tech.reason ? (
                  <View style={styles.priceReasonBox}>
                    <Text style={styles.priceReasonLabel}>Technician's Reason:</Text>
                    <Text style={styles.priceReasonText}>{tech.price_reason || tech.reason}</Text>
                  </View>
                ) : null}
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.declineBtn]}
                    onPress={() => openDeclineModal('price', tech.id)}
                    disabled={actionLoading}
                  >
                    <Text style={styles.declineBtnText}>Decline</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.acceptBtn]}
                    onPress={() => handleConfirm('price', 'accept', tech.id)}
                    disabled={actionLoading}
                  >
                    {actionLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.acceptBtnText}>Accept Price</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Assigned Technicians */}
        {Number(booking.status) >= 2 && assignedTechs && assignedTechs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Assigned Technician</Text>
            {assignedTechs.map((tech: any, index: number) => (
              <View key={index} style={styles.techCardWrapper}>
                <View style={styles.techCard}>
                  <Image
                    source={{ uri: tech.tech_photo ? getImageUrl(tech.tech_photo) : "https://ui-avatars.com/api/?name=" + encodeURIComponent(tech.tech_name || "Tech") }}
                    style={styles.techAvatar}
                  />
                  <View style={styles.techInfo}>
                    <Text style={styles.techName}>{tech.tech_name || "Technician"}</Text>
                    {/* <View style={styles.techStats}>
                      <Ionicons name="star" size={14} color="#f59e0b" />
                      <Text style={styles.techRating}>{tech.avg_rating || "New"} • {tech.jobs_completed || 0} jobs</Text>
                    </View> */}
                  </View>
                  <TouchableOpacity 
                    style={styles.callButton} 
                    onPress={() => {
                      if (tech.tech_phone) {
                        Linking.openURL(`tel:${tech.tech_phone}`);
                      } else {
                        Alert.alert("No Phone Number", "This technician doesn't have a phone number listed.");
                      }
                    }}
                  >
                    <Ionicons name="call" size={20} color="#ffffff" />
                  </TouchableOpacity>
                </View>

                {/* Accept/Decline Technician (Status 2) */}
                {Number(booking.status) === 2 && String(tech.user_status) === "0" && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.declineBtn]}
                      onPress={() => openDeclineModal('tech', tech.id)}
                      disabled={actionLoading}
                    >
                      <Text style={styles.declineBtnText}>Decline</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.acceptBtn]}
                      onPress={() => handleConfirm('tech', 'accept', tech.id)}
                      disabled={actionLoading}
                    >
                      {actionLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.acceptBtnText}>Accept</Text>}
                    </TouchableOpacity>
                  </View>
                )}

                {/* Timeline tracking (if confirmed) */}
                {String(tech.user_status) === "1" && (
                  <View style={styles.timelineSection}>
                    {renderTimeline(tech.status)}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Images */}
        {images && images.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Problem Photos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryContent}>
              {images.map((img: any, idx: number) => (
                <TouchableOpacity 
                  key={idx} 
                  style={styles.imageWrapper}
                  onPress={() => {
                    setSelectedImage(getImageUrl(typeof img === 'string' ? img : img.url));
                    setZoomModalVisible(true);
                  }}
                >
                  <Image source={{ uri: getImageUrl(typeof img === 'string' ? img : img.url) }} style={styles.galleryImage} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {completion_images && completion_images.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Completion Photos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryContent}>
              {completion_images.map((img: any, idx: number) => (
                <TouchableOpacity 
                  key={idx} 
                  style={styles.imageWrapper}
                  onPress={() => {
                    setSelectedImage(getImageUrl(typeof img === 'string' ? img : img.url));
                    setZoomModalVisible(true);
                  }}
                >
                  <Image source={{ uri: getImageUrl(typeof img === 'string' ? img : img.url) }} style={styles.galleryImage} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Support & Feedback Section */}
        {(Number(booking.status) === 3 || Number(booking.status) === 4) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Support & Feedback</Text>
            <View style={styles.supportContainer}>
              <TouchableOpacity
                style={styles.supportActionBtn}
                onPress={() => {
                  const techRecord = assignedTechs?.find((t: any) => String(t.user_status) === "1") || assignedTechs?.[0];
                  const assignmentId = techRecord?.id || booking?.assignment_id || booking?.id;
                  router.push({
                    pathname: "/job/dispute",
                    params: { booking_technician_id: assignmentId }
                  });
                }}
              >
                <View style={styles.supportIconWrapper}>
                  <Ionicons name="warning-outline" size={24} color="#ea580c" />
                </View>
                <View style={styles.supportTextWrapper}>
                  <Text style={styles.supportActionTitle}>Raise a Dispute</Text>
                  <Text style={styles.supportActionSubtitle}>Report an issue with this job</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </TouchableOpacity>

              {Number(booking.status) === 4 && (
                <>
                  <View style={styles.supportDivider} />
                  <TouchableOpacity
                    style={styles.supportActionBtn}
                    onPress={() => {
                      const techRecord = assignedTechs?.find((t: any) => String(t.user_status) === "1") || assignedTechs?.[0];
                      router.push({
                        pathname: "/job/feedback",
                        params: { 
                          booking_id: booking?.id || id,
                          technician_id: techRecord?.technician_id
                        }
                      });
                    }}
                  >
                    <View style={[styles.supportIconWrapper, { backgroundColor: "#dbeafe" }]}>
                      <Ionicons name="star-outline" size={24} color="#3b82f6" />
                    </View>
                    <View style={styles.supportTextWrapper}>
                      <Text style={styles.supportActionTitle}>Leave Feedback</Text>
                      <Text style={styles.supportActionSubtitle}>Rate your experience</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        )}

      </ScrollView>

      {/* Decline Reason Modal */}
      <Modal
        visible={declineModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeclineModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {declineType === 'tech' ? 'Decline Technician' : 'Decline Price'}
            </Text>
            <Text style={styles.modalSubtitle}>
              Please provide an optional reason for your decision.
            </Text>

            <TextInput
              style={styles.textInput}
              placeholder="e.g. Price is too high, prefer someone else..."
              value={declineReason}
              onChangeText={setDeclineReason}
              multiline
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setDeclineModalVisible(false)}
                disabled={actionLoading}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={submitDecline}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.modalSubmitText}>Submit Decline</Text>
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
  techCardWrapper: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 12,
    overflow: 'hidden',
  },
  techCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  techAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  techInfo: {
    flex: 1,
  },
  techName: {
    fontSize: 16,
    fontFamily: "Lato-Bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  techStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  techRating: {
    fontSize: 13,
    fontFamily: "Lato",
    color: "#6b7280",
    marginLeft: 4,
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1A6B6B",
    alignItems: "center",
    justifyContent: "center",
  },
  priceReviewCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 12,
    padding: 16,
  },
  priceReviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  priceReviewTitle: {
    fontSize: 16,
    fontFamily: "Lato-Bold",
    color: "#1f2937",
  },
  priceReviewValue: {
    fontSize: 20,
    fontFamily: "DemoOsbert-Bold",
    color: "#10b981",
  },
  priceReasonBox: {
    backgroundColor: "#f9fafb",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  priceReasonLabel: {
    fontSize: 12,
    fontFamily: "Lato-Bold",
    color: "#6b7280",
    marginBottom: 4,
  },
  priceReasonText: {
    fontSize: 14,
    fontFamily: "Lato",
    color: "#4b5563",
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  declineBtn: {
    backgroundColor: "#fee2e2",
  },
  declineBtnText: {
    color: "#DC2626",
    fontFamily: "Lato-Bold",
    fontSize: 14,
  },
  acceptBtn: {
    backgroundColor: "#10b981",
  },
  acceptBtnText: {
    color: "#ffffff",
    fontFamily: "Lato-Bold",
    fontSize: 14,
  },
  galleryContent: {
    gap: 12,
  },
  imageWrapper: {
    width: 140,
    height: 140,
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
  timelineSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
  },
  timelineContainer: {
    flexDirection: 'column',
  },
  timelineStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 40,
  },
  timelineIndicatorWrapper: {
    alignItems: 'center',
    width: 20,
    marginRight: 12,
  },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
  },
  timelineDotActive: {
    backgroundColor: "#10b981",
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: "#e5e7eb",
    marginTop: 4,
    marginBottom: 4,
  },
  timelineLineActive: {
    backgroundColor: "#10b981",
  },
  timelineTextContainer: {
    flex: 1,
    paddingTop: 1,
  },
  timelineText: {
    fontSize: 14,
    fontFamily: "Lato",
    color: "#6b7280",
  },
  timelineTextActive: {
    fontFamily: "Lato-Bold",
    color: "#1f2937",
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
  supportContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    overflow: "hidden",
    marginTop: 8,
  },
  supportActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#ffffff",
  },
  supportIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#ffedd5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  supportTextWrapper: {
    flex: 1,
  },
  supportActionTitle: {
    fontSize: 16,
    fontFamily: "Lato-Bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  supportActionSubtitle: {
    fontSize: 13,
    fontFamily: "Lato",
    color: "#6b7280",
  },
  supportDivider: {
    height: 1,
    backgroundColor: "#f3f4f6",
    marginLeft: 80,
  }
});
