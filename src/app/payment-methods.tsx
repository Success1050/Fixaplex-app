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

export default function PaymentMethods() {
  const router = useRouter();
  const userData = useAuthStore((state) => state.userData);
  const setUserData = useAuthStore((state) => state.setUserData);

  const existingBank = userData?.bank_details || {};

  const [accountName, setAccountName] = useState(
    existingBank.account_name || userData?.account_name || userData?.full_name || ""
  );
  const [iban, setIban] = useState(
    existingBank.iban_formatted || existingBank.iban || userData?.iban || ""
  );
  const [accountNumber, setAccountNumber] = useState(
    existingBank.account_number || userData?.account_number || ""
  );
  const [sortCode, setSortCode] = useState(
    existingBank.sort_code || userData?.sort_code || ""
  );

  const [loading, setLoading] = useState(false);
  const [savedData, setSavedData] = useState<any>(
    existingBank.iban || existingBank.iban_formatted ? existingBank : null
  );
  const [showLegacy, setShowLegacy] = useState(
    Boolean(existingBank.account_number || existingBank.sort_code)
  );

  // If userData has bank details saved, initialize state
  useEffect(() => {
    if (userData?.bank_details) {
      const b = userData.bank_details;
      setSavedData(b);
      if (b.account_name && !accountName) setAccountName(b.account_name);
      if ((b.iban_formatted || b.iban) && !iban) setIban(b.iban_formatted || b.iban);
      if (b.account_number && !accountNumber) setAccountNumber(b.account_number);
      if (b.sort_code && !sortCode) setSortCode(b.sort_code);
    }
  }, [userData]);

  const handleSave = async () => {
    try {
      setLoading(true);
      const token = await SecureStore.getItemAsync("userToken");
      if (!token) {
        Alert.alert("Authentication", "Your session has expired. Please log in again.");
        return;
      }

      const formData = new FormData();

      if (accountName.trim()) {
        formData.append("account_name", accountName.trim());
      }

      if (iban.trim()) {
        // Strip spaces or formatting before sending if desired, but endpoint accepts string checksum
        formData.append("iban", iban.trim());
      }

      if (accountNumber.trim()) {
        // Digits only are kept per endpoint specification
        const cleanAccNumber = accountNumber.trim().replace(/[^0-9]/g, "");
        formData.append("account_number", cleanAccNumber);
      }

      if (sortCode.trim()) {
        // Digits only are kept per endpoint specification
        const cleanSortCode = sortCode.trim().replace(/[^0-9]/g, "");
        formData.append("sort_code", cleanSortCode);
      }

      const res = await axios.post(
        `${BASE_URL}/clients/account/modify_account.php`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      console.log("Modify account response:", res.data);

      if (res.data?.success) {
        const updatedBank = res.data.data || {
          account_name: accountName.trim(),
          iban: iban.trim(),
          iban_formatted: iban.trim(),
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
          res.data.msg || "Your bank details have been saved successfully.",
          [{ text: "OK", onPress: () => router.back() }]
        );
      } else {
        Alert.alert(
          "Error",
          res.data?.msg || "Failed to update bank details. Please check your information and try again."
        );
      }
    } catch (err: any) {
      console.error("Modify client account error:", err);
      const serverMsg = err.response?.data?.msg || err.message;
      Alert.alert(
        "Error",
        serverMsg || "Unable to save bank details. Please check your internet connection."
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
          <Text style={styles.headerTitle}>Payment Methods</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Card Payments Information Box */}
          <View style={styles.cardPaymentBanner}>
            <View style={styles.bannerIconCircle}>
              <Ionicons name="card-outline" size={22} color="#1A6B6B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>Card Payments & Refunds</Text>
              <Text style={styles.bannerText}>
                Payments are processed securely via Stripe. In case of cancellation or refund, funds are automatically credited back to your payment card.
              </Text>
            </View>
          </View>

          {/* Current Saved Bank Account Card */}
          {savedData?.iban && (
            <View style={styles.savedCard}>
              <View style={styles.savedCardHeader}>
                <View style={styles.bankIconCircle}>
                  <Ionicons name="business" size={20} color="#1A6B6B" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.savedCardLabel}>Saved Bank Account (Refunds)</Text>
                  <Text style={styles.savedCardName}>
                    {savedData.account_name || userData?.full_name || "Client Account"}
                  </Text>
                </View>
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>Saved</Text>
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

              {savedData.account_number ? (
                <View style={styles.savedRow}>
                  <Text style={styles.savedRowLabel}>Account Number</Text>
                  <Text style={styles.savedRowValue}>{savedData.account_number}</Text>
                </View>
              ) : null}

              {savedData.sort_code ? (
                <View style={styles.savedRow}>
                  <Text style={styles.savedRowLabel}>Sort Code</Text>
                  <Text style={styles.savedRowValue}>{savedData.sort_code}</Text>
                </View>
              ) : null}
            </View>
          )}

          {/* Form Section */}
          <View style={styles.formContainer}>
            <Text style={styles.sectionHeader}>
              {savedData?.iban ? "Update Bank Details" : "Bank Details (Optional)"}
            </Text>
            <Text style={styles.sectionSubtext}>
              Bank details are optional. They are only used in rare circumstances where a direct transfer refund is required.
            </Text>

            {/* Account Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Account Holder Name</Text>
              <TextInput
                style={styles.textInput}
                value={accountName}
                onChangeText={setAccountName}
                placeholder="Exactly as the bank has it (e.g. Sean O'Brien)"
                placeholderTextColor="#9ca3af"
                autoCapitalize="words"
              />
              <Text style={styles.helperText}>
                Matches your official legal name with the bank.
              </Text>
            </View>

            {/* IBAN */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>IBAN</Text>
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
                Validated checksum if sent. Leaving this empty leaves any stored IBAN unchanged.
              </Text>
            </View>

            {/* Legacy details toggle */}
            <TouchableOpacity
              style={styles.legacyToggle}
              activeOpacity={0.7}
              onPress={() => setShowLegacy(!showLegacy)}
            >
              <Text style={styles.legacyToggleText}>
                {showLegacy
                  ? "Hide legacy bank details"
                  : "Add legacy account number / sort code (Optional)"}
              </Text>
              <Ionicons
                name={showLegacy ? "chevron-up" : "chevron-down"}
                size={16}
                color="#1A6B6B"
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
                  <Text style={styles.helperText}>Digits only are stored.</Text>
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
                    keyboardType="number-pad"
                  />
                  <Text style={styles.helperText}>Digits only are stored.</Text>
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
                <Ionicons
                  name="checkmark-circle-outline"
                  size={20}
                  color="#ffffff"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.saveButtonText}>Save Details</Text>
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
  cardPaymentBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F0FDFA",
    borderWidth: 1,
    borderColor: "#99F6E4",
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  bannerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#CCFBF1",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
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
    marginBottom: 4,
  },
  sectionSubtext: {
    fontSize: 12,
    fontFamily: "Lato",
    color: "#6b7280",
    marginBottom: 16,
    lineHeight: 18,
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
    fontFamily: "Lato-Bold",
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
