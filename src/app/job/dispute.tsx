import React, { useState } from "react";
import { View, Text, StyleSheet, SafeAreaView, Platform, TouchableOpacity, TextInput, KeyboardAvoidingView, ScrollView, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import axios from "axios";
import { BASE_URL } from "../../config/api";

const DISPUTE_REASONS = [
  "Technician didn't show up",
  "Unprofessional behavior",
  "Job was not completed properly",
  "Pricing or payment issue",
  "Other"
];

export default function Dispute() {
  const router = useRouter();
  const { booking_technician_id } = useLocalSearchParams();
  const [selectedReason, setSelectedReason] = useState("");
  const [details, setDetails] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert("Hold on", "Please select a reason for the dispute.");
      return;
    }
    
    try {
      setLoading(true);
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) return;

      const formData = new FormData();
      formData.append('booking_technician_id', String(booking_technician_id));
      formData.append('complain', `${selectedReason}: ${details}`);

      const res = await axios.post(`${BASE_URL}/clients/jobs/save_dispute.php`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (res.data?.success) {
        Alert.alert(
          "Dispute Raised", 
          res.data.msg || "We've received your dispute and our support team will investigate the issue and contact you within 24 hours.",
          [{ text: "OK", onPress: () => router.back() }]
        );
      } else {
        Alert.alert("Error", res.data?.msg || "Failed to submit dispute.");
      }
    } catch (err) {
      console.error("Failed to submit dispute:", err);
      Alert.alert("Error", "A network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Raise a Dispute</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          <View style={styles.warningContainer}>
            <Ionicons name="warning" size={24} color="#ea580c" style={styles.warningIcon} />
            <Text style={styles.warningText}>
              Raising a dispute will pause any pending payments for this job until the issue is resolved by our support team.
            </Text>
          </View>

          <Text style={styles.label}>Reason for Dispute</Text>
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
                  <Text style={[
                    styles.dropdownItemText, 
                    selectedReason === reason && styles.dropdownItemTextActive
                  ]}>
                    {reason}
                  </Text>
                  {selectedReason === reason && (
                    <Ionicons name="checkmark" size={20} color="#0d9488" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={[styles.label, { marginTop: 24 }]}>Additional Details</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Please provide as much information as possible to help us resolve the issue..."
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            value={details}
            onChangeText={setDetails}
          />
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.submitButton, (!selectedReason || loading) && styles.submitButtonDisabled]} 
            disabled={!selectedReason || loading}
            onPress={handleSubmit}
          >
            <Text style={styles.submitButtonText}>{loading ? "Submitting..." : "Submit Dispute"}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
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
    padding: 24,
  },
  warningContainer: {
    flexDirection: "row",
    backgroundColor: "#fff7ed",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ffedd5",
    marginBottom: 32,
  },
  warningIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Lato",
    color: "#9a3412",
    lineHeight: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: "Lato-Bold",
    color: "#4b5563",
    marginBottom: 12,
  },
  dropdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    backgroundColor: "#f9fafb",
  },
  dropdownText: {
    fontSize: 16,
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
    marginTop: 8,
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
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  dropdownItemText: {
    fontSize: 15,
    fontFamily: "Lato",
    color: "#4b5563",
  },
  dropdownItemTextActive: {
    fontFamily: "Lato-Bold",
    color: "#0d9488",
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: "Lato",
    color: "#1f2937",
    backgroundColor: "#f9fafb",
    minHeight: 140,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    backgroundColor: "#ffffff",
  },
  submitButton: {
    backgroundColor: "#ef4444", // Red color for disputes
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
  },
  submitButtonDisabled: {
    backgroundColor: "#fca5a5",
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: "Lato-Bold",
    color: "#ffffff",
  },
});
