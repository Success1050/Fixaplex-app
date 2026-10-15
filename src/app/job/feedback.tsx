import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Platform,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import axios from "axios";
import { BASE_URL } from "../../config/api";

export default function Feedback() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const scrollViewRef = useRef<ScrollView>(null);

  const [bookingId, setBookingId] = useState<string | number | null>(
    params.booking_id ? String(params.booking_id) : null
  );
  const [technicianId, setTechnicianId] = useState<string | number | null>(
    params.technician_id ? String(params.technician_id) : null
  );
  const [bookingCode, setBookingCode] = useState<string>(
    params.booking_code ? String(params.booking_code) : ""
  );
  const [techName, setTechName] = useState<string>(
    params.tech_name ? String(params.tech_name) : ""
  );
  const [serviceName, setServiceName] = useState<string>(
    params.service_name ? String(params.service_name) : ""
  );

  const [rating, setRating] = useState(0);
  const [comments, setComments] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingJobs, setFetchingJobs] = useState(false);
  const [completedJobs, setCompletedJobs] = useState<any[]>([]);
  const [existingFeedback, setExistingFeedback] = useState<any | null>(null);
  const [checkingExisting, setCheckingExisting] = useState(false);

  // Check if feedback was already submitted for this booking
  useEffect(() => {
    if (!bookingId) {
      setExistingFeedback(null);
      return;
    }

    const checkFeedbackStatus = async () => {
      try {
        setCheckingExisting(true);
        // 1. Check local device record
        const storedKey = `feedback_submitted_${bookingId}`;
        const stored = await SecureStore.getItemAsync(storedKey);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            setExistingFeedback(parsed);
            if (parsed.rating) setRating(Number(parsed.rating));
            if (parsed.comments || parsed.comment) setComments(parsed.comments || parsed.comment);
            return;
          } catch (e) {}
        }

        // 2. Check server booking details
        const token = await SecureStore.getItemAsync("userToken");
        if (token) {
          const formData = new FormData();
          formData.append("booking_id", String(bookingId));
          const res = await axios.post(`${BASE_URL}/clients/jobs/get_booking_details.php`, formData, {
            headers: { Authorization: `Bearer ${token}` }
          });

          const serverFb = res.data?.feedback || res.data?.booking?.feedback;
          if (serverFb && (serverFb.rating || (Array.isArray(serverFb) && serverFb.length > 0))) {
            const fbObj = Array.isArray(serverFb) ? serverFb[0] : serverFb;
            setExistingFeedback(fbObj);
            if (fbObj.rating) setRating(Number(fbObj.rating));
            if (fbObj.comments || fbObj.comment) setComments(fbObj.comments || fbObj.comment);
            await SecureStore.setItemAsync(storedKey, JSON.stringify(fbObj));
          }
        }
      } catch (err) {
        console.warn("Could not check feedback status:", err);
      } finally {
        setCheckingExisting(false);
      }
    };

    checkFeedbackStatus();
  }, [bookingId]);

  // If booking_id is not passed, fetch user's completed jobs (status 4)
  useEffect(() => {
    if (!bookingId) {
      const fetchCompletedBookings = async () => {
        try {
          setFetchingJobs(true);
          const token = await SecureStore.getItemAsync("userToken");
          if (!token) return;

          const res = await axios.post(
            `${BASE_URL}/clients/jobs/get_bookings.php`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (res.data?.success && Array.isArray(res.data.bookings)) {
            const completed = res.data.bookings.filter(
              (b: any) => Number(b.status) === 4
            );
            setCompletedJobs(completed);
            if (completed.length === 1) {
              setBookingId(completed[0].id || completed[0].booking_id);
              setBookingCode(completed[0].booking_code || "");
              setServiceName(completed[0].service_name || completed[0].title || "");
              if (completed[0].technician_id) {
                setTechnicianId(completed[0].technician_id);
              }
              if (completed[0].technician_name) {
                setTechName(completed[0].technician_name);
              }
            }
          }
        } catch (err) {
          console.warn("Could not fetch completed bookings:", err);
        } finally {
          setFetchingJobs(false);
        }
      };

      fetchCompletedBookings();
    }
  }, [bookingId]);

  const handleSubmit = async () => {
    if (existingFeedback) {
      Alert.alert(
        "Feedback Already Recorded",
        "You have already submitted feedback for this completed job. Feedback can only be submitted once per job."
      );
      return;
    }

    if (!bookingId) {
      Alert.alert(
        "Booking Required",
        "Feedback can only be submitted for completed jobs (Status: Completed). Please select a completed booking or wait until your job is finished."
      );
      return;
    }

    if (rating === 0) {
      Alert.alert("Hold on", "Please select a star rating before submitting.");
      return;
    }

    try {
      setLoading(true);
      const token = await SecureStore.getItemAsync("userToken");
      if (!token) {
        Alert.alert("Login Required", "Please log in to submit feedback.");
        return;
      }

      const formData = new FormData();
      formData.append("booking_id", String(bookingId));
      formData.append("rating", String(rating));
      if (technicianId) {
        formData.append("technician_id", String(technicianId));
      }
      if (comments.trim()) {
        formData.append("comment", comments.trim());
      }

      console.log("[save_feedback] Submitting feedback for booking:", bookingId);
      const res = await axios.post(
        `${BASE_URL}/clients/jobs/save_feedback.php`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      console.log("[save_feedback] Response:", res.data);

      if (res.data?.success) {
        const recordedFeedback = {
          rating,
          comments: comments.trim(),
          submitted_at: new Date().toISOString()
        };
        setExistingFeedback(recordedFeedback);
        try {
          await SecureStore.setItemAsync(
            `feedback_submitted_${bookingId}`,
            JSON.stringify(recordedFeedback)
          );
        } catch (e) {}

        Alert.alert(
          "Feedback Submitted",
          res.data.msg ||
            "Thank you for sharing your experience! Your rating helps us improve.",
          [{ text: "OK", onPress: () => router.back() }]
        );
      } else {
        Alert.alert(
          "Unable to Submit Feedback",
          res.data?.msg || "Feedback can only be submitted for completed bookings."
        );
      }
    } catch (err: any) {
      console.error("Failed to submit feedback:", err);
      const serverMsg = err?.response?.data?.msg || err.message;
      Alert.alert(
        "Unable to Submit Feedback",
        serverMsg || "A network error occurred while submitting feedback."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Leave Feedback</Text>
        </View>

        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom + 40, 60) },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="star" size={40} color="#0d9488" />
            </View>
            <Text style={styles.title}>How would you rate your technician?</Text>
            <Text style={styles.subtitle}>
              Feedback is recorded for completed bookings to recognize great service.
            </Text>
          </View>

          {/* If checking feedback status */}
          {checkingExisting && (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color="#0d9488" />
              <Text style={styles.loadingText}>Checking feedback record...</Text>
            </View>
          )}

          {/* Already Submitted Record Card (Issue 5 - Single feedback enforcement) */}
          {existingFeedback && !checkingExisting && (
            <View style={styles.alreadySubmittedCard}>
              <View style={styles.alreadySubmittedHeader}>
                <Ionicons name="checkmark-circle" size={26} color="#059669" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.alreadySubmittedTitle}>Feedback Already Submitted</Text>
                  <Text style={styles.alreadySubmittedSubtitle}>
                    You have already reviewed this service. To maintain verified service ratings, feedback can only be submitted once per job.
                  </Text>
                </View>
              </View>
              {existingFeedback.submitted_at ? (
                <Text style={styles.alreadySubmittedDate}>
                  Recorded: {new Date(existingFeedback.submitted_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                </Text>
              ) : null}
            </View>
          )}

          {/* If booking not provided & fetching */}
          {fetchingJobs && (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color="#0d9488" />
              <Text style={styles.loadingText}>Checking completed bookings...</Text>
            </View>
          )}

          {/* If no completed jobs exist */}
          {!bookingId && !fetchingJobs && completedJobs.length === 0 && (
            <View style={styles.noticeCard}>
              <Ionicons name="information-circle" size={24} color="#0284c7" style={{ marginRight: 10, marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.noticeTitle}>Only For Completed Jobs</Text>
                <Text style={styles.noticeText}>
                  Technician feedback can only be submitted after a technician completes a job for you (Status: Completed).
                  You do not have any completed bookings eligible for review yet.
                </Text>
              </View>
            </View>
          )}

          {/* If multiple completed jobs, let user choose */}
          {!bookingId && !fetchingJobs && completedJobs.length > 0 && (
            <View style={{ marginBottom: 20 }}>
              <Text style={styles.label}>Select Completed Booking to Rate:</Text>
              {completedJobs.map((job: any) => (
                <TouchableOpacity
                  key={job.id || job.booking_id}
                  style={styles.jobSelectItem}
                  onPress={() => {
                    setBookingId(job.id || job.booking_id);
                    setBookingCode(job.booking_code || "");
                    setServiceName(job.service_name || job.title || "");
                    if (job.technician_id) setTechnicianId(job.technician_id);
                    if (job.technician_name) setTechName(job.technician_name);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.jobSelectTitle}>{job.service_name || job.title || "Service Request"}</Text>
                    <Text style={styles.jobSelectSubtitle}>
                      {job.booking_code ? `#${job.booking_code} • ` : ""}
                      {job.technician_name ? `Tech: ${job.technician_name}` : "Completed"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#0d9488" />
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.ratingContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => !existingFeedback && setRating(star)}
                disabled={Boolean(existingFeedback)}
                style={styles.starButton}
              >
                <Ionicons
                  name={star <= rating ? "star" : "star-outline"}
                  size={42}
                  color={star <= rating ? "#f59e0b" : "#d1d5db"}
                />
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>
            {existingFeedback ? "Your Submitted Comments:" : "Comments & Review (optional):"}
          </Text>
          <TextInput
            style={[
              styles.textInput,
              existingFeedback && styles.textInputDisabled,
            ]}
            placeholder={existingFeedback ? "No additional comments provided." : "Tell us what went well, or what could be improved..."}
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            value={comments}
            onChangeText={setComments}
            editable={!existingFeedback}
            onFocus={() => {
              setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
              }, 200);
            }}
          />

          {/* Submit button directly inside ScrollView below the textarea */}
          <View style={styles.submitContainer}>
            {existingFeedback ? (
              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: "#0d9488" }]}
                onPress={() => router.back()}
              >
                <Text style={styles.submitButtonText}>Feedback Recorded • Done</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (rating === 0 || loading || (!bookingId && completedJobs.length === 0)) &&
                    styles.submitButtonDisabled,
                ]}
                disabled={rating === 0 || loading || (!bookingId && completedJobs.length === 0)}
                onPress={handleSubmit}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit Feedback</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
    paddingTop: Platform.OS === "android" ? 40 : 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "DemoOsbert-Bold",
    color: "#1f2937",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#ccfbf1",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontFamily: "DemoOsbert-Bold",
    color: "#1f2937",
    marginBottom: 4,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 12,
    fontFamily: "Lato",
    color: "#6b7280",
    textAlign: "center",
    paddingHorizontal: 16,
    lineHeight: 16,
  },

  loadingBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    marginBottom: 14,
  },
  loadingText: {
    fontSize: 12,
    fontFamily: "Lato",
    color: "#6b7280",
    marginLeft: 8,
  },
  noticeCard: {
    flexDirection: "row",
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#bae6fd",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  noticeTitle: {
    fontSize: 13,
    fontFamily: "Lato-Bold",
    color: "#0369a1",
    marginBottom: 4,
  },
  noticeText: {
    fontSize: 12,
    fontFamily: "Lato",
    color: "#0c4a6e",
    lineHeight: 17,
  },
  jobSelectItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  jobSelectTitle: {
    fontSize: 14,
    fontFamily: "Lato-Bold",
    color: "#1f2937",
    marginBottom: 2,
  },
  jobSelectSubtitle: {
    fontSize: 12,
    fontFamily: "Lato",
    color: "#6b7280",
  },
  ratingContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 20,
  },
  starButton: {
    paddingHorizontal: 8,
  },
  label: {
    fontSize: 13,
    fontFamily: "Lato-Bold",
    color: "#4b5563",
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    fontFamily: "Lato",
    color: "#1f2937",
    backgroundColor: "#f9fafb",
    minHeight: 100,
  },
  submitContainer: {
    marginTop: 20,
  },
  submitButton: {
    backgroundColor: "#0d9488",
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: "center",
  },
  submitButtonDisabled: {
    backgroundColor: "#d1d5db",
  },
  submitButtonText: {
    fontSize: 15,
    fontFamily: "Lato-Bold",
    color: "#ffffff",
  },
  textInputDisabled: {
    backgroundColor: "#f3f4f6",
    color: "#4b5563",
    borderColor: "#e5e7eb",
  },
  alreadySubmittedCard: {
    backgroundColor: "#ecfdf5",
    borderWidth: 1.5,
    borderColor: "#a7f3d0",
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  alreadySubmittedHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  alreadySubmittedTitle: {
    fontSize: 15,
    fontFamily: "Lato-Bold",
    color: "#065f46",
    marginBottom: 4,
  },
  alreadySubmittedSubtitle: {
    fontSize: 12,
    fontFamily: "Lato",
    color: "#047857",
    lineHeight: 17,
  },
  alreadySubmittedDate: {
    fontSize: 11,
    fontFamily: "Lato-Bold",
    color: "#059669",
    marginTop: 10,
    textAlign: "right",
  },
});
