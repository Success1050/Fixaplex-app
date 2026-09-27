import React, { useState, useEffect } from "react";
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
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import axios from "axios";
import { BASE_URL } from "../config/api";
import { useAuthStore } from "../store/useAuthStore";
import { useBookingStore } from "../store/useBookingStore";

export default function ManageAddress() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const userData = useAuthStore((state) => state.userData);
  const setUserData = useAuthStore((state) => state.setUserData);
  const savedAddress = useBookingStore((state) => state.savedAddress);
  const setFullAddress = useBookingStore((state) => state.setFullAddress);

  const [addressLine1, setAddressLine1] = useState(
    userData?.address_line1 || savedAddress?.addressLine1 || userData?.address || ""
  );
  const [addressLine2, setAddressLine2] = useState(
    userData?.address_line2 || savedAddress?.addressLine2 || ""
  );
  const [addressLine3, setAddressLine3] = useState(
    userData?.address_line3 || savedAddress?.addressLine3 || ""
  );
  const [town, setTown] = useState(
    userData?.town || savedAddress?.town || ""
  );
  const [county, setCounty] = useState(
    userData?.county || savedAddress?.county || ""
  );
  const [eircode, setEircode] = useState(
    userData?.eircode || userData?.postcode || savedAddress?.postcode || ""
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userData) {
      if (userData.address_line1 !== undefined) {
        setAddressLine1(userData.address_line1 || "");
      }
      if (userData.address_line2 !== undefined) {
        setAddressLine2(userData.address_line2 || "");
      }
      if (userData.address_line3 !== undefined) {
        setAddressLine3(userData.address_line3 || "");
      }
      if (userData.town !== undefined) {
        setTown(userData.town || "");
      }
      if (userData.county !== undefined) {
        setCounty(userData.county || "");
      }
      if (userData.eircode !== undefined || userData.postcode !== undefined) {
        setEircode(userData.eircode || userData.postcode || "");
      }
    }
  }, [userData]);

  const handleSaveAddress = async () => {
    const line1 = addressLine1.trim();
    const line2 = addressLine2.trim();
    const line3 = addressLine3.trim();
    const townVal = town.trim();
    const countyVal = county.trim();
    const eircodeVal = eircode.trim();

    if (!line1) {
      Alert.alert("Required Field", "Please enter your first address line.");
      return;
    }

    if (!townVal) {
      Alert.alert("Required Field", "Please enter your town.");
      return;
    }

    try {
      setLoading(true);
      const token = await SecureStore.getItemAsync("userToken");
      if (!token) {
        Alert.alert("Authentication", "Your session has expired. Please log in again.");
        return;
      }

      const combinedAddress = [line1, line2, line3, townVal, countyVal, eircodeVal]
        .filter(Boolean)
        .join(", ");

      const formData = new FormData();
      formData.append("address_line1", line1);
      formData.append("address_line2", line2);
      formData.append("address_line3", line3);
      formData.append("town", townVal);
      formData.append("county", countyVal);
      formData.append("postcode", eircodeVal);
      formData.append("eircode", eircodeVal);
      formData.append("address", combinedAddress);

      const res = await axios.post(
        `${BASE_URL}/clients/account/modify_address.php`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (res.data?.success) {
        const responseData = res.data.data || {};
        const savedLine1 = responseData.address_line1 ?? line1;
        const savedLine2 = responseData.address_line2 ?? line2;
        const savedLine3 = responseData.address_line3 ?? line3;
        const savedTown = responseData.town ?? townVal;
        const savedCounty = responseData.county ?? countyVal;
        const savedEircode = responseData.eircode ?? responseData.postcode ?? eircodeVal;
        const savedFullAddress = responseData.address ?? combinedAddress;

        const updatedUserData = {
          ...userData,
          address: savedFullAddress,
          address_line1: savedLine1,
          address_line2: savedLine2,
          address_line3: savedLine3,
          town: savedTown,
          county: savedCounty,
          eircode: savedEircode,
          postcode: savedEircode,
        };

        setUserData(updatedUserData);
        await SecureStore.setItemAsync("userData", JSON.stringify(updatedUserData));

        setFullAddress(
          savedLine1,
          savedLine2,
          savedLine3,
          savedTown,
          savedCounty,
          savedEircode
        );

        Alert.alert("Success", res.data.msg || "Address updated successfully!", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        Alert.alert("Error", res.data?.msg || "Failed to update address.");
      }
    } catch (err: any) {
      console.error("Failed to update address:", err);
      Alert.alert(
        "Error",
        err?.response?.data?.msg || err?.message || "A network error occurred."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Manage Address</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionTitle}>Your Address</Text>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>First Address Line</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 12 High Street"
                placeholderTextColor="#9ca3af"
                value={addressLine1}
                onChangeText={setAddressLine1}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Second Address Line</Text>
              <TextInput
                style={styles.input}
                placeholder="Apartment, suite, etc."
                placeholderTextColor="#9ca3af"
                value={addressLine2}
                onChangeText={setAddressLine2}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Third Address Line</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Ballsbridge"
                placeholderTextColor="#9ca3af"
                value={addressLine3}
                onChangeText={setAddressLine3}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Town</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Dublin"
                placeholderTextColor="#9ca3af"
                value={town}
                onChangeText={setTown}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>County</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Co. Dublin"
                placeholderTextColor="#9ca3af"
                value={county}
                onChangeText={setCounty}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Eircode</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. D02 X285"
                placeholderTextColor="#9ca3af"
                autoCapitalize="characters"
                value={eircode}
                onChangeText={setEircode}
              />
            </View>
          </View>
        </ScrollView>

        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom + 12, Platform.OS === "android" ? 28 : 16) },
          ]}
        >
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            disabled={loading}
            onPress={handleSaveAddress}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Save Address</Text>
            )}
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
    paddingTop: Platform.OS === "android" ? 40 : 0,
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
    fontWeight: "bold",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "DemoOsbert-Bold",
    color: "#1f2937",
    marginBottom: 16,
  },
  form: {
    gap: 14,
  },
  inputContainer: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontFamily: "Lato-Bold",
    color: "#4b5563",
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 50,
    fontSize: 15,
    fontFamily: "Lato",
    color: "#1f2937",
    backgroundColor: "#f9fafb",
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    backgroundColor: "#ffffff",
  },
  submitButton: {
    backgroundColor: "#0d9488",
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: "Lato-Bold",
    color: "#ffffff",
  },
});
