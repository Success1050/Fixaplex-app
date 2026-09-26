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

const DISPUTE_REASONS = [
  "Technician didn't show up",
  "Unprofessional behavior",
  "Job was not completed properly",
  "Pricing or payment issue",
  "Quality of work is unsatisfactory",
  "Other",
];

export default function Dispute() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const scrollViewRef = useRef<ScrollView>(null);

  const [bookingTechnicianId, setBookingTechnicianId] = useState<string | number | null>(
    params.booking_technician_id ? String(params.booking_technician_id) : null
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

  const [selectedReason, setSelectedReason] = useState("");
  const [details, setDetails] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingJobs, setFetchingJobs] = useState(false);
  const [eligibleJobs, setEligibleJobs] = useState<any[]>([]);

  // If booking_technician_id is not provided, fetch bookings in status 3, 8, or 4
  useEffect(() => {
    if (!bookingTechnicianId) {
      const fetchEligibleBookings = async () => {
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
            // Status 3: In Progress, Status 8: Awaiting sign-off, Status 4: Completed
            const eligible = res.data.bookings.filter((b: any) =>
              [3, 8, 4].includes(Number(b.status))
            );
            setEligibleJobs(eligible);

            if (eligible.length === 1) {
              const b = eligible[0];
              const assignmentId = b.booking_technician_id || b.assignment_id || b.id;
              setBookingTechnicianId(assignmentId);
              setBookingCode(b.booking_code || "");
              setServiceName(b.service_name || b.title || "");
              if (b.technician_name) setTechName(b.technician_name);
            }
          }
        } catch (err) {
          console.warn("Could not fetch eligible bookings for dispute:", err);
        } finally {
          setFetchingJobs(false);
        }
      };

      fetchEligibleBookings();
    }
  }, [bookingTechnicianId]);

  const handleSubmit = async () => {
    if (!bookingTechnicianId) {
      Alert.alert(
        "Assignment Required",
        "Disputes can only be raised for jobs in progress, awaiting sign-off, or completed (Status 3, 8, or 4). Please select a job to report."
      );
      return;
    }

    if (!selectedReason) {
      Alert.alert("Hold on", "Please select a reason for the report.");
      return;
    }

    try {
      setLoading(true);
      const token = await SecureStore.getItemAsync("userToken");
      if (!token) {
        Alert.alert("Login Required", "Please log in to report a problem.");
        return;
      }

      const fullComplaint = details.trim()
        ? `${selectedReason}: ${details.trim()}`
        : selectedReason;

      const formData = new FormData();
      formData.append("booking_technician_id", String(bookingTechnicianId));
      formData.append("complain", fullComplaint);

      console.log("[save_dispute] Submitting dispute for assignment:", bookingTechnicianId);
      const res = await axios.post(
        `${BASE_URL}/clients/jobs/save_dispute.php`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      console.log("[save_dispute] Response:", res.data);

      if (res.data?.success) {
        Alert.alert(
          "Issue Submitted",
          res.data.msg ||
            "We've received your dispute report. Our support team will investigate the issue and contact you within 24 hours.",
          [{ text: "OK", onPress: () => router.back() }]
        );
      } else {
        Alert.alert(
          "Unable to Submit Dispute",
          res.data?.msg || "Failed to submit dispute. Disputes are only accepted for jobs in progress, awaiting sign-off, or completed."
        );
      }
    } catch (err: any) {
      console.error("Failed to submit dispute:", err);
      const serverMsg = err?.response?.data?.msg || err.message;
      Alert.alert(
        "Unable to Submit Dispute",
        serverMsg || "A network error occurred while submitting your dispute."
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
          <Text style={styles.headerTitle}>Report a Problem</Text>
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
          <View style={styles.warningContainer}>
            <Ionicons name="warning" size={24} color="#ea580c" style={styles.warningIcon} />
            <Text style={styles.warningText}>
              Reporting a dispute will notify our support team to investigate the issue and ensure fair resolution.
              Disputes are valid for jobs in progress, awaiting sign-off, or completed (Status 3, 8 or 4).
            </Text>
          </View>

          {/* If booking info is known */}
          {bookingTechnicianId && (
            <View style={styles.selectedJobCard}>
              <View style={styles.jobBadgeRow}>
                <View style={styles.disputeTargetBadge}>
                  <Ionicons name="shield-outline" size={13} color="#C2410C" style={{ marginRight: 4 }} />
                  <Text style={styles.disputeTargetBadgeText}>Job Assignment</Text>
                </View>
                {bookingCode ? (
                  <Text style={styles.bookingCodeText}>Ref: #{bookingCode}</Text>
                ) : null}
              </View>
              {serviceName ? <Text style={styles.serviceNameText}>{serviceName}</Text> : null}
              {techName ? (
                <Text style={styles.techNameText}>
                  Technician: <Text style={{ fontFamily: "Lato-Bold" }}>{techName}</Text>
                </Text>
              ) : null}
            </View>
          )}

          {/* Loading state if checking bookings */}
          {fetchingJobs && (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color="#ea580c" />
              <Text style={styles.loadingText}>Checking eligible assignments...</Text>
            </View>
          )}

          {/* If no eligible jobs found */}
          {!bookingTechnicianId && !fetchingJobs && eligibleJobs.length === 0 && (
            <View style={styles.noticeCard}>
              <Ionicons name="information-circle" size={24} color="#0369a1" style={{ marginRight: 10, marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.noticeTitle}>No Active or Completed Jobs</Text>
                <Text style={styles.noticeText}>
                  Disputes can only be raised for jobs that are in progress, awaiting sign-off, or completed (Status 3, 8, or 4).
                  You do not currently have any active assignments in these stages.
                </Text>
              </View>
            </View>
          )}

          {/* If multiple eligible jobs, let user choose */}
          {!bookingTechnicianId && !fetchingJobs && eligibleJobs.length > 0 && (
            <View style={{ marginBottom: 20 }}>
              <Text style={styles.label}>Select Job to Dispute:</Text>
              {eligibleJobs.map((job: any) => {
                const assignmentId = job.booking_technician_id || job.assignment_id || job.id;
                return (
                  <TouchableOpacity
                    key={job.id || assignmentId}
                    style={styles.jobSelectItem}
                    onPress={() => {
                      setBookingTechnicianId(assignmentId);
                      setBookingCode(job.booking_code || "");
                      setServiceName(job.service_name || job.title || "");
                      if (job.technician_name) setTechName(job.technician_name);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.jobSelectTitle}>{job.service_name || job.title || "Service Request"}</Text>
                      <Text style={styles.jobSelectSubtitle}>
                        {job.booking_code ? `#${job.booking_code} • ` : ""}
                        {job.technician_name ? `Tech: ${job.technician_name}` : "Active"}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#ea580c" />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <Text style={styles.label}>Reason for Report</Text>
          <TouchableOpacity
            style={styles.dropdownHeader}
            onPress={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <Text style={[styles.dropdownText, !selectedReason && styles.dropdownPlaceholder]}>
              {selectedReason || "Select a reason"}
            </Text>
            <Ionicons name={isDropdownOpen ? "chevron-up" : "chevron-down"} size={20} color="#9ca3af" />
          </TouchableOpacity>

          {isDropdownOpen && (
            <View style={styles.dropdownList}>
              {DISPUTE_REASONS.map((reason, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setSelectedReason(reason);
                    setIsDropdownOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      selectedReason === reason && styles.dropdownItemTextActive,
                    ]}
                  >
                    {reason}
                  </Text>
                  {selectedReason === reason && (
                    <Ionicons name="checkmark" size={20} color="#1A6B6B" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={[styles.label, { marginTop: 20 }]}>Additional Details</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Please provide as much information as possible to help us resolve the issue..."
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            value={details}
            onChangeText={setDetails}
            onFocus={() => {
              setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
              }, 200);
            }}
          />

          <View style={styles.submitContainer}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!selectedReason || loading || (!bookingTechnicianId && eligibleJobs.length === 0)) &&
                  styles.submitButtonDisabled,
              ]}
              disabled={!selectedReason || loading || (!bookingTechnicianId && eligibleJobs.length === 0)}
              onPress={handleSubmit}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Issue</Text>
              )}
            </TouchableOpacity>
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
  warningContainer: {
    flexDirection: "row",
    backgroundColor: "#fff7ed",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ffedd5",
    marginBottom: 18,
  },
  warningIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Lato",
    color: "#9a3412",
    lineHeight: 17,
  },
  selectedJobCard: {
    backgroundColor: "#fff7ed",
    borderWidth: 1,
    borderColor: "#fed7aa",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  jobBadgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  disputeTargetBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffedd5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  disputeTargetBadgeText: {
    fontSize: 11,
    fontFamily: "Lato-Bold",
    color: "#C2410C",
  },
  bookingCodeText: {
    fontSize: 12,
    fontFamily: "Lato-Bold",
    color: "#4b5563",
  },
  serviceNameText: {
    fontSize: 14,
    fontFamily: "Lato-Bold",
    color: "#7c2d12",
    marginBottom: 2,
  },
  techNameText: {
    fontSize: 12,
    fontFamily: "Lato",
    color: "#9a3412",
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
  label: {
    fontSize: 13,
    fontFamily: "Lato-Bold",
    color: "#4b5563",
    marginBottom: 8,
  },
  dropdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    backgroundColor: "#f9fafb",
  },
  dropdownText: {
    fontSize: 14,
    fontFamily: "Lato",
    color: "#1f2937",
  },
  dropdownPlaceholder: {
    color: "#9ca3af",
  },
  dropdownList: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    marginTop: 6,
    backgroundColor: "#ffffff",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  dropdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  dropdownItemText: {
    fontSize: 13,
    fontFamily: "Lato",
    color: "#374151",
  },
  dropdownItemTextActive: {
    fontFamily: "Lato-Bold",
    color: "#1A6B6B",
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
    backgroundColor: "#ea580c",
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
});
