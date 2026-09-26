import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import axios from "axios";
import { BASE_URL } from "../config/api";
import { useAuthStore } from "../store/useAuthStore";

export default function BankDetails() {
  const router = useRouter();
  const userData = useAuthStore((state) => state.userData);
  const setUserData = useAuthStore((state) => state.setUserData);
  const role = useAuthStore((state) => state.role);
  const isClient = role === 'user';

  const existingBank = userData?.bank_details || {};

  const [accountName, setAccountName] = useState(
    existingBank.account_name || userData?.account_name || userData?.full_name || ""
  );
  const [iban, setIban] = useState(
    existingBank.iban || existingBank.iban_formatted || userData?.iban || ""
  );
  const [bic, setBic] = useState(existingBank.bic || userData?.bic || "");
  const [accountNumber, setAccountNumber] = useState(
    existingBank.account_number || userData?.account_number || ""
  );
  const [sortCode, setSortCode] = useState(
    existingBank.sort_code || userData?.sort_code || ""
  );

  const [loading, setLoading] = useState(false);
  const [savedData, setSavedData] = useState<any>(
    existingBank.iban ? existingBank : null
  );
  const [showLegacy, setShowLegacy] = useState(
    Boolean(existingBank.account_number || existingBank.sort_code)
  );

  // Attempt to check if backend get_technician has bank details
  useEffect(() => {
    const fetchExisting = async () => {
      try {
        if (isClient) return;
        const token = await SecureStore.getItemAsync("userToken");
        if (!token) return;

        const res = await axios.get(`${BASE_URL}/technicians/accounts/get_technician.php`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.data?.success && res.data?.bank_details) {
          const b = res.data.bank_details;
          setSavedData(b);
          if (b.account_name) setAccountName(b.account_name);
          if (b.iban) setIban(b.iban);
          if (b.bic) setBic(b.bic);
          if (b.account_number) setAccountNumber(b.account_number);
          if (b.sort_code) setSortCode(b.sort_code);
        }
      } catch (err) {
        // Silently handle if get_technician doesn't return bank_details directly
      }
    };
    fetchExisting();
  }, [isClient]);

  const handleSave = async () => {
    if (!isClient) {
      if (!accountName.trim()) {
        Alert.alert("Required Field", "Please enter the Account Holder Name exactly as it appears on your bank statement.");
        return;
      }

      if (!iban.trim()) {
        Alert.alert("Required Field", "Please provide a valid IBAN for payouts.");
        return;
      }
    }

    try {
      setLoading(true);
      const token = await SecureStore.getItemAsync("userToken");
      if (!token) {
        Alert.alert("Authentication", "Your session has expired. Please log in again.");
        return;
      }

      const formData = new FormData();
      if (accountName.trim()) formData.append("account_name", accountName.trim());
      if (iban.trim()) formData.append("iban", iban.trim());
      if (bic.trim()) formData.append("bic", bic.trim());
      if (accountNumber.trim()) formData.append("account_number", accountNumber.trim().replace(/[^0-9]/g, ""));
      if (sortCode.trim()) formData.append("sort_code", sortCode.trim().replace(/[^0-9]/g, ""));

      const endpoint = isClient
        ? `${BASE_URL}/clients/account/modify_account.php`
        : `${BASE_URL}/technicians/accounts/modify_account.php`;

      const res = await axios.post(
        endpoint,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (res.data?.success) {
        const updatedBank = res.data.data || {
          account_name: accountName.trim(),
          iban: iban.trim(),
          bic: bic.trim(),
          account_number: accountNumber.trim(),
          sort_code: sortCode.trim(),
        };

        setSavedData(updatedBank);

        const updatedUser = {
          ...userData,
          bank_details: updatedBank,
          iban: updatedBank.iban,
          account_name: updatedBank.account_name,
        };
        setUserData(updatedUser);
        await SecureStore.setItemAsync("userData", JSON.stringify(updatedUser));

        Alert.alert(
          "Bank Details Saved",
          res.data.msg || (isClient
            ? "Your bank details have been successfully saved for refund processing."
            : "Your payout bank account has been successfully configured. Any pending payouts will now be processed."),
          [{ text: "OK", onPress: () => router.back() }]
        );
      } else {
        Alert.alert("Submission Error", res.data?.msg || "Failed to update bank details. Please check the IBAN and try again.");
      }
    } catch (err: any) {
      console.error("Bank details update error:", err);
      const serverMsg = err.response?.data?.msg || err.message;
      Alert.alert("Error", serverMsg || "Unable to save bank details. Please check your network connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Navigation Bar */}
        <View style={styles.headerBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isClient ? "Bank Details" : "Bank & Payout Details"}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Informational Banner */}
          <View style={styles.infoBanner}>
            <Ionicons name="shield-checkmark" size={22} color="#1A6B6B" style={styles.bannerIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>
                {isClient ? "Refund Bank Details (Optional)" : "Secure Payout Account"}
              </Text>
              <Text style={styles.bannerText}>
                {isClient
                  ? "Clients do not need bank details for standard payments — cancellation refunds return to the card that paid. This is kept for direct transfer refunds."
                  : "Required before technician payouts can be dispatched. Your IBAN is checksum-verified. Saving also releases any payouts held waiting for banking details."}
              </Text>
            </View>
          </View>

          {/* Current Saved Account Card */}
          {savedData?.iban && (
            <View style={styles.savedCard}>
              <View style={styles.savedCardHeader}>
                <View style={styles.bankIconCircle}>
                  <Ionicons name="business" size={20} color="#1A6B6B" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.savedCardLabel}>Connected Payout Account</Text>
                  <Text style={styles.savedCardName}>{savedData.account_name}</Text>
                </View>
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>Active</Text>
                </View>
              </View>

              <View style={styles.savedDivider} />

              <View style={styles.savedRow}>
                <Text style={styles.savedRowLabel}>IBAN</Text>
                <Text style={styles.savedRowValue}>
                  {savedData.iban_formatted || savedData.iban}
                </Text>
              </View>

              {savedData.bic ? (
                <View style={styles.savedRow}>
                  <Text style={styles.savedRowLabel}>BIC / SWIFT</Text>
                  <Text style={styles.savedRowValue}>{savedData.bic}</Text>
                </View>
              ) : null}
            </View>
          )}

          {/* Form Fields */}
          <View style={styles.formContainer}>
            <Text style={styles.sectionHeader}>
              {savedData?.iban ? "Update Account Details" : "Enter Bank Details"}
            </Text>

            {/* Account Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Account Holder Name <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TextInput
                style={styles.textInput}
                value={accountName}
                onChangeText={setAccountName}
                placeholder="Exactly as the bank has it (e.g. Sean O'Brien)"
                placeholderTextColor="#9ca3af"
                autoCapitalize="words"
              />
              <Text style={styles.helperText}>
                Must match the official legal name registered with your financial institution.
              </Text>
            </View>

            {/* IBAN */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                IBAN <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TextInput
                style={styles.textInput}
                value={iban}
                onChangeText={setIban}
                placeholder="e.g. IE29 AIBK 9311 5212 3456 78"
                placeholderTextColor="#9ca3af"
                autoCapitalize="characters"
                autoCorrect={false}
              />
              <Text style={styles.helperText}>
                Spaces are permitted. The IBAN is checksum-validated upon submission.
              </Text>
            </View>

            {/* BIC / SWIFT */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                BIC / SWIFT <Text style={styles.optionalTag}>(Optional)</Text>
              </Text>
              <TextInput
                style={styles.textInput}
                value={bic}
                onChangeText={setBic}
                placeholder="e.g. AIBKIE2D"
                placeholderTextColor="#9ca3af"
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </View>

            {/* Toggle Legacy Fields */}
            <TouchableOpacity
              style={styles.legacyToggle}
              activeOpacity={0.7}
              onPress={() => setShowLegacy(!showLegacy)}
            >
              <Text style={styles.legacyToggleText}>
                {showLegacy ? "Hide legacy bank details" : "Add legacy account number / sort code (Optional)"}
              </Text>
              <Ionicons
                name={showLegacy ? "chevron-up" : "chevron-down"}
                size={16}
                color="#6b7280"
              />
            </TouchableOpacity>

            {showLegacy && (
              <View style={styles.legacyBox}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    Account Number <Text style={styles.optionalTag}>(Legacy, optional)</Text>
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    value={accountNumber}
                    onChangeText={setAccountNumber}
                    placeholder="e.g. 12345678"
                    placeholderTextColor="#9ca3af"
                    keyboardType="number-pad"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    Sort Code <Text style={styles.optionalTag}>(Legacy, optional)</Text>
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    value={sortCode}
                    onChangeText={setSortCode}
                    placeholder="e.g. 93-11-52"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              </View>
            )}
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            activeOpacity={0.8}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#ffffff" style={{ marginRight: 8 }} />
                <Text style={styles.saveButtonText}>Save Bank Details</Text>
              </>
            )}
          </TouchableOpacity>
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
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "DemoOsbert-Bold",
    color: "#1f2937",
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F0FDFA",
    borderWidth: 1,
    borderColor: "#99F6E4",
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  bannerIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  bannerTitle: {
    fontSize: 14,
    fontFamily: "Lato-Bold",
    color: "#0F766E",
    marginBottom: 2,
  },
  bannerText: {
    fontSize: 12,
    fontFamily: "Lato",
    color: "#115E59",
    lineHeight: 18,
  },
  savedCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  savedCardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  bankIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E8F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  savedCardLabel: {
    fontSize: 11,
    fontFamily: "Lato",
    color: "#9ca3af",
  },
  savedCardName: {
    fontSize: 15,
    fontFamily: "Lato-Bold",
    color: "#1f2937",
    marginTop: 1,
  },
  activeBadge: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  activeBadgeText: {
    fontSize: 11,
    fontFamily: "Lato-Bold",
    color: "#059669",
  },
  savedDivider: {
    height: 1,
    backgroundColor: "#f3f4f6",
    marginVertical: 12,
  },
  savedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  savedRowLabel: {
    fontSize: 13,
    fontFamily: "Lato",
    color: "#6b7280",
  },
  savedRowValue: {
    fontSize: 13,
    fontFamily: "Lato-Bold",
    color: "#1f2937",
  },
  formContainer: {
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 16,
    fontFamily: "DemoOsbert-Bold",
    color: "#1f2937",
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: "Lato-Bold",
    color: "#374151",
    marginBottom: 6,
  },
  requiredStar: {
    color: "#DC2626",
  },
  optionalTag: {
    fontSize: 12,
    fontFamily: "Lato",
    color: "#9ca3af",
  },
  textInput: {
    height: 48,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: "Lato",
    color: "#1f2937",
  },
  helperText: {
    fontSize: 11,
    fontFamily: "Lato",
    color: "#9ca3af",
    marginTop: 4,
    lineHeight: 15,
  },
  legacyToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    marginBottom: 10,
  },
  legacyToggleText: {
    fontSize: 13,
    fontFamily: "Lato",
    color: "#1A6B6B",
  },
  legacyBox: {
    backgroundColor: "#F9FAFB",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 10,
  },
  saveButton: {
    flexDirection: "row",
    height: 52,
    backgroundColor: "#1A6B6B",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    shadowColor: "#1A6B6B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontFamily: "Lato-Bold",
  },
});
