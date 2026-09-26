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

  // Additional quote modal states (POST /technicians/jobs/submit_additional_quote.php)
  const [addQuoteModalVisible, setAddQuoteModalVisible] = useState(false);
  const [additionalAmount, setAdditionalAmount] = useState("");
  const [additionalDescription, setAdditionalDescription] = useState("");

  // Withdraw quote modal states (POST /technicians/jobs/withdraw_additional_quote.php)
  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState("");
  const [selectedQuoteIdForWithdraw, setSelectedQuoteIdForWithdraw] = useState<number | string | null>(null);

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

  const getAssignmentId = () => {
    const tech = details?.assignedTechs?.find((t: any) => t.user_status == 1 || t.client_confirmed == 1 || t.client_confirmed === true) || details?.assignedTechs?.[0];
    return tech?.id || tech?.assignment_id || details?.booking?.assignment_id || details?.booking?.id || id;
  };

  const handleAcceptJob = async () => {
    const assignmentId = getAssignmentId();
    try {
      setActionLoading(true);
      const token = await SecureStore.getItemAsync('userToken');
      const formData = new FormData();
      formData.append('assignment_id', String(assignmentId));

      const res = await axios.post(`${BASE_URL}/technicians/jobs/accept_job.php`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (res.data?.success) {
        Alert.alert("Success", res.data?.msg || "Job accepted!");
        fetchJobDetails();
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

    const assignmentId = getAssignmentId();
    try {
      setActionLoading(true);
      const token = await SecureStore.getItemAsync('userToken');
      const formData = new FormData();
      formData.append('assignment_id', String(assignmentId));
      formData.append('reason', rejectReason.trim());

      const res = await axios.post(`${BASE_URL}/technicians/jobs/reject_job.php`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (res.data?.success) {
        Alert.alert("Success", res.data?.msg || "Job rejected.");
        setRejectModalVisible(false);
        router.back();
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

  // POST /technicians/jobs/change_job_status.php
  // Allowed transitions: status 5 from 2 (after client confirmation) and status 6 from 5
  const handleChangeStatus = async (newStatus: number) => {
    const assignmentId = getAssignmentId();
    try {
      setActionLoading(true);
      const token = await SecureStore.getItemAsync('userToken');
      const formData = new FormData();
      formData.append('assignment_id', String(assignmentId));
      formData.append('status', newStatus.toString());

      const res = await axios.post(`${BASE_URL}/technicians/jobs/change_job_status.php`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (res.data?.success) {
        Alert.alert("Success", res.data?.msg || "Status updated!");
        fetchJobDetails(); 
      } else {
        Alert.alert("Status Update", res.data?.msg || "Failed to update status.");
      }
    } catch (err: any) {
      console.error(err);
      Alert.alert("Error", err.response?.data?.msg || "Network error occurred.");
    } finally {
      setActionLoading(false);
    }
  };

  // POST /technicians/jobs/submit_additional_quote.php
  const handleSubmitAdditionalQuote = async () => {
    const parsedAmount = parseFloat(additionalAmount.trim());
    if (isNaN(parsedAmount) || parsedAmount < 0.5) {
      Alert.alert("Invalid Amount", "Please enter a valid extra amount (minimum €0.50).");
      return;
    }
    if (!additionalDescription.trim()) {
      Alert.alert("Description Required", "Please provide a description of the additional work required.");
      return;
    }

    const assignmentId = getAssignmentId();
    try {
      setActionLoading(true);
      const token = await SecureStore.getItemAsync('userToken');
      const formData = new FormData();
      formData.append('assignment_id', String(assignmentId));
      formData.append('amount', String(parsedAmount));
      formData.append('description', additionalDescription.trim());

      const res = await axios.post(`${BASE_URL}/technicians/jobs/submit_additional_quote.php`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (res.data?.success) {
        Alert.alert("Success", res.data?.msg || "Additional quote submitted to client!");
        setAddQuoteModalVisible(false);
        setAdditionalAmount("");
        setAdditionalDescription("");
        fetchJobDetails();
      } else {
        Alert.alert("Error", res.data?.msg || "Failed to submit additional quote.");
      }
    } catch (err: any) {
      console.error(err);
      Alert.alert("Error", err.response?.data?.msg || "Network error occurred.");
    } finally {
      setActionLoading(false);
    }
  };

  // POST /technicians/jobs/withdraw_additional_quote.php
  const handleWithdrawAdditionalQuote = async () => {
    if (!selectedQuoteIdForWithdraw) return;

    try {
      setActionLoading(true);
      const token = await SecureStore.getItemAsync('userToken');
      const formData = new FormData();
      formData.append('quote_id', String(selectedQuoteIdForWithdraw));
      if (withdrawReason.trim()) {
        formData.append('reason', withdrawReason.trim());
      }

      const res = await axios.post(`${BASE_URL}/technicians/jobs/withdraw_additional_quote.php`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (res.data?.success) {
        Alert.alert("Success", res.data?.msg || "Additional quote withdrawn successfully.");
        setWithdrawModalVisible(false);
        setWithdrawReason("");
        setSelectedQuoteIdForWithdraw(null);
        fetchJobDetails();
      } else {
        Alert.alert("Error", res.data?.msg || "Failed to withdraw quote.");
      }
    } catch (err: any) {
      console.error(err);
      Alert.alert("Error", err.response?.data?.msg || "Network error occurred.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleGoToComplete = () => {
    const assignmentId = getAssignmentId();
    router.push({
      pathname: "/tech-job/complete",
      params: { 
        assignment_id: assignmentId, 
        title: details?.booking?.service_name || details?.booking?.title,
        price: details?.booking?.booking_charges
      }
    });
  };

  const handleGoToAdjustPrice = () => {
    const assignmentId = getAssignmentId();
    router.push({
      pathname: "/tech-job/adjust-price",
      params: { 
        assignment_id: assignmentId, 
        base_price: details?.booking?.booking_charges
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
  const myTechRecord = assignedTechs?.find((t: any) => t.user_status == 1 || t.client_confirmed == 1 || t.client_confirmed === true) || assignedTechs?.[0];
  const isClientConfirmed = Boolean(
    booking?.client_confirmed == 1 ||
    booking?.client_confirmed === true ||
    myTechRecord?.client_confirmed == 1 ||
    myTechRecord?.client_confirmed === true ||
    String(myTechRecord?.user_status) === "1"
  );

  const activeAddQuote = 
    details?.additional_quote || 
    (Array.isArray(details?.additional_quotes) ? details.additional_quotes[0] : null) ||
    (details?.quote?.type === 'additional' ? details.quote : null);

  const hasPendingAddQuote = Boolean(
    activeAddQuote && (
      String(activeAddQuote.status).toLowerCase() === 'pending' || 
      activeAddQuote.status === 0 || 
      activeAddQuote.status === '0'
    )
  );

  const getImageUrl = (url: string) => {
    if (!url) return '';
    return url.startsWith('http') ? url : `${IMAGE_BASE_URL}/${url}`;
  };

  const getStatusStyle = (statusNum: number | string) => {
    const s = Number(statusNum);
    switch (s) {
      case 0: return { bg: '#f3f4f6', text: '#6b7280', label: 'Pending' };
      case 1: return { bg: '#fef3c7', text: '#D97706', label: 'Pending Acceptance' };
      case 2: 
        return isClientConfirmed
          ? { bg: '#d1fae5', text: '#059669', label: 'Client Confirmed' }
          : { bg: '#fef3c7', text: '#D97706', label: 'Waiting for Client' };
      case 5: return { bg: '#e0e7ff', text: '#4338ca', label: 'On My Way' };
      case 6: return { bg: '#dcfce7', text: '#15803d', label: 'Arrived' };
      case 7: return { bg: '#fef3c7', text: '#D97706', label: 'Price Review' };
      case 3: return { bg: '#1A6B6B', text: '#ffffff', label: 'Work In Progress' };
      case 8: return { bg: '#fef3c7', text: '#D97706', label: 'Awaiting Sign-Off' };
      case 4: return { bg: '#10b981', text: '#ffffff', label: 'Completed' };
      case -1: return { bg: '#fee2e2', text: '#DC2626', label: 'Cancelled' };
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
        <TouchableOpacity style={styles.backButton} onPress={fetchJobDetails}>
          <Ionicons name="refresh" size={20} color="#1A6B6B" />
        </TouchableOpacity>
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

        {/* Status Notices */}
        {Number(booking.status) === 2 && !isClientConfirmed && (
          <View style={styles.noticeBox}>
            <View style={styles.noticeHeaderRow}>
              <Ionicons name="time-outline" size={20} color="#b45309" />
              <Text style={styles.noticeTitle}>Awaiting Client Confirmation</Text>
            </View>
            <Text style={styles.noticeText}>
              The client has not confirmed you yet. Please wait for their confirmation before tapping "On My Way".
            </Text>
          </View>
        )}

        {Number(booking.status) === 5 && (
          <View style={[styles.noticeBox, { backgroundColor: "#EEF2FF", borderColor: "#C7D2FE" }]}>
            <View style={styles.noticeHeaderRow}>
              <Ionicons name="navigate-circle-outline" size={20} color="#4338CA" />
              <Text style={[styles.noticeTitle, { color: "#3730A3" }]}>Journey In Progress</Text>
            </View>
            <Text style={[styles.noticeText, { color: "#312E81" }]}>
              You are on your way to the client's location. Tap "Tap when Arrived" below once you reach the destination.
            </Text>
          </View>
        )}

        {Number(booking.status) === 6 && (
          <View style={[styles.noticeBox, { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" }]}>
            <View style={styles.noticeHeaderRow}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#15803D" />
              <Text style={[styles.noticeTitle, { color: "#166534" }]}>Arrived at Location</Text>
            </View>
            <Text style={[styles.noticeText, { color: "#14532D" }]}>
              Please assess the job requirements and submit your final price quote to the client.
            </Text>
          </View>
        )}

        {Number(booking.status) === 7 && (
          <View style={styles.quoteStatusBox}>
            <View style={styles.quoteStatusHeaderRow}>
              <Ionicons name="time-outline" size={22} color="#b45309" />
              <Text style={styles.quoteStatusTitle}>Price Review Phase</Text>
            </View>
            <Text style={styles.quoteStatusText}>
              Your final quote has been submitted. Waiting for the client to review and authorize the balance hold.
            </Text>
            <Text style={[styles.quoteStatusText, { marginTop: 6, fontStyle: 'italic', fontSize: 13 }]}>
              If the client requests changes or declines, you may tap "Revise Quote" below to adjust the price.
            </Text>
          </View>
        )}

        {Number(booking.status) === 3 && (
          <View style={[styles.noticeBox, { backgroundColor: "#F0FDFA", borderColor: "#99F6E4" }]}>
            <View style={styles.noticeHeaderRow}>
              <Ionicons name="hammer-outline" size={20} color="#1A6B6B" />
              <Text style={[styles.noticeTitle, { color: "#115E59" }]}>Work In Progress</Text>
            </View>
            <Text style={[styles.noticeText, { color: "#134E48" }]}>
              Work is underway. If additional work is discovered, tap "Quote Extra Work" below. When finished, tap "Mark As Complete".
            </Text>
          </View>
        )}

        {/* Pending Additional Quote Card (while at status 3) */}
        {activeAddQuote && (
          <View style={styles.quoteStatusBox}>
            <View style={styles.quoteStatusHeaderRow}>
              <Ionicons name="document-attach-outline" size={22} color="#b45309" />
              <Text style={styles.quoteStatusTitle}>
                Additional Work Quote ({activeAddQuote.status || "Pending"})
              </Text>
            </View>
            <Text style={styles.quoteDetailText}>
              Extra Amount: <Text style={{ fontFamily: "Lato-Bold" }}>€{activeAddQuote.amount}</Text>
            </Text>
            {activeAddQuote.reason || activeAddQuote.description ? (
              <Text style={styles.quoteStatusText}>
                {activeAddQuote.reason || activeAddQuote.description}
              </Text>
            ) : null}
            {hasPendingAddQuote && (
              <View style={{ marginTop: 12, flexDirection: "row", justifyContent: "flex-end" }}>
                <TouchableOpacity
                  style={styles.withdrawBtn}
                  onPress={() => {
                    setSelectedQuoteIdForWithdraw(activeAddQuote.quote_id || activeAddQuote.id);
                    setWithdrawModalVisible(true);
                  }}
                  disabled={actionLoading}
                >
                  <Ionicons name="close-circle-outline" size={16} color="#DC2626" style={{ marginRight: 4 }} />
                  <Text style={styles.withdrawBtnText}>Withdraw Quote</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {Number(booking.status) === 8 && (
          <View style={styles.quoteStatusBox}>
            <View style={styles.quoteStatusHeaderRow}>
              <Ionicons name="shield-checkmark-outline" size={22} color="#b45309" />
              <Text style={styles.quoteStatusTitle}>Awaiting Client Sign-Off</Text>
            </View>
            <Text style={styles.quoteStatusText}>
              Work completed and completion photos submitted. Waiting for the client or admin to sign off and release payment in full.
            </Text>
          </View>
        )}

        {Number(booking.status) === 4 && (
          <View style={[styles.noticeBox, { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" }]}>
            <View style={styles.noticeHeaderRow}>
              <Ionicons name="checkmark-done-circle" size={22} color="#15803D" />
              <Text style={[styles.noticeTitle, { color: "#166534" }]}>Job Completed</Text>
            </View>
            <Text style={[styles.noticeText, { color: "#14532D" }]}>
              This job has been signed off and payment has been captured in full.
            </Text>
          </View>
        )}

        {Number(booking.status) === -1 && (
          <View style={[styles.noticeBox, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}>
            <View style={styles.noticeHeaderRow}>
              <Ionicons name="close-circle-outline" size={22} color="#DC2626" />
              <Text style={[styles.noticeTitle, { color: "#991B1B" }]}>Job Cancelled</Text>
            </View>
            <Text style={[styles.noticeText, { color: "#7F1D1D" }]}>
              This booking has been cancelled or rejected.
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

        {/* Completion Photos */}
        {completion_images && completion_images.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Completion Photos</Text>
            <View style={styles.photosGrid}>
              {completion_images.map((img: any, idx: number) => (
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

      {/* Sticky Bottom Actions by Status */}
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

      {Number(booking.status) === 2 && (
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.progressBtn]}
            onPress={() => handleChangeStatus(5)}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="navigate-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.progressBtnText}>Tap when On My Way</Text>
              </>
            )}
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
            {actionLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="location-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.progressBtnText}>Tap when Arrived</Text>
              </>
            )}
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
            <Ionicons name="pricetag-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.progressBtnText}>Submit Final Price</Text>
          </TouchableOpacity>
        </View>
      )}

      {Number(booking.status) === 7 && (
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.secondaryActionBtn]}
            onPress={handleGoToAdjustPrice}
            disabled={actionLoading}
          >
            <Ionicons name="pencil-outline" size={16} color="#1A6B6B" style={{ marginRight: 6 }} />
            <Text style={styles.secondaryActionBtnText}>Revise Quote</Text>
          </TouchableOpacity>
        </View>
      )}

      {Number(booking.status) === 3 && (
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.secondaryActionBtn]}
            onPress={() => setAddQuoteModalVisible(true)}
            disabled={actionLoading || hasPendingAddQuote}
          >
            <Ionicons name="add-circle-outline" size={18} color="#1A6B6B" style={{ marginRight: 6 }} />
            <Text style={styles.secondaryActionBtnText}>Quote Extra Work</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.progressBtn, { flex: 1.4 }]}
            onPress={() => {
              if (hasPendingAddQuote) {
                Alert.alert(
                  "Completion Blocked",
                  "You have an additional quote awaiting the client's response. Please wait for their approval or withdraw the quote before marking the job as complete."
                );
                return;
              }
              handleGoToComplete();
            }}
            disabled={actionLoading}
          >
            <Text style={styles.progressBtnText}>Mark As Complete</Text>
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

      {/* Submit Additional Quote Modal */}
      <Modal
        visible={addQuoteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddQuoteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Quote Additional Work</Text>
            <Text style={styles.modalSubtitle}>
              Quote the extra amount for additional work found during the job. The client will be asked to approve the extra amount.
            </Text>

            <Text style={styles.inputFieldLabel}>Extra Amount (€, min 0.50)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 35.00"
              keyboardType="numeric"
              value={additionalAmount}
              onChangeText={setAdditionalAmount}
            />

            <Text style={styles.inputFieldLabel}>Description of Extra Work</Text>
            <TextInput
              style={styles.textInput}
              placeholder="What additional work is needed and why..."
              value={additionalDescription}
              onChangeText={setAdditionalDescription}
              multiline
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setAddQuoteModalVisible(false);
                  setAdditionalAmount("");
                  setAdditionalDescription("");
                }}
                disabled={actionLoading}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: "#1A6B6B" }]}
                onPress={handleSubmitAdditionalQuote}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.modalSubmitText}>Submit Quote</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Withdraw Additional Quote Modal */}
      <Modal
        visible={withdrawModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setWithdrawModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Withdraw Additional Quote</Text>
            <Text style={styles.modalSubtitle}>
              Withdraw this quote if the client has not answered so that you can proceed to complete the job at the agreed price.
            </Text>

            <Text style={styles.inputFieldLabel}>Reason for Withdrawal (Optional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Client decided not to proceed with additional work..."
              value={withdrawReason}
              onChangeText={setWithdrawReason}
              multiline
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setWithdrawModalVisible(false);
                  setWithdrawReason("");
                  setSelectedQuoteIdForWithdraw(null);
                }}
                disabled={actionLoading}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleWithdrawAdditionalQuote}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.modalSubmitText}>Withdraw</Text>
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
  quoteDetailText: {
    fontSize: 14,
    fontFamily: 'Lato',
    color: '#92400E',
    marginBottom: 4,
  },
  withdrawBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
  },
  withdrawBtnText: {
    fontSize: 13,
    fontFamily: 'Lato-Bold',
    color: '#DC2626',
  },
  noticeBox: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  noticeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  noticeTitle: {
    fontSize: 15,
    fontFamily: 'Lato-Bold',
    color: '#92400E',
  },
  noticeText: {
    fontSize: 14,
    fontFamily: 'Lato',
    color: '#78350F',
    lineHeight: 20,
  },
  inputFieldLabel: {
    fontSize: 13,
    fontFamily: 'Lato-Bold',
    color: '#374151',
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontFamily: 'Lato',
    fontSize: 15,
    backgroundColor: '#f9fafb',
    color: '#1f2937',
    marginBottom: 16,
  },
});
