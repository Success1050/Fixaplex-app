import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBookingStore } from "../../store/useBookingStore";
import { useAuthStore } from "../../store/useAuthStore";

export default function Review() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const userData = useAuthStore((state) => state.userData);
  const guestId = useAuthStore((state) => state.guestId);

  const {
    addressLine1,
    addressLine2,
    addressLine3,
    town,
    county,
    postcode,
    categoryName,
    selectedServices,
    timingType,
    selectedDate,
    selectedTime,
    issueDescription,
    guestName,
    guestPhone,
    guestEmail,
    images,
  } = useBookingStore();

  const fullAddress = [addressLine1, addressLine2, addressLine3, town, county, postcode]
    .filter(Boolean)
    .join(", ");
  const displayName =
    userData?.full_name?.split(" ")[0] ||
    userData?.name?.split(" ")[0] ||
    guestName?.split(" ")[0] ||
    guestId ||
    "Guest";

  const getTimingText = () => {
    if (timingType === "Future") {
      return `${selectedDate} at ${selectedTime}`;
    }
    if (timingType === "Tomorrow") {
      return `Tomorrow at ${selectedTime}`;
    }
    return timingType || "ASAP";
  };

  const handleContinue = () => {
    router.push("/booking/terms" as any);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review Details</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.titleSection}>
          <Text style={styles.title}>Anything else we should know?</Text>
          <Text style={styles.subtitle}>
            Please review the details of your request before continuing, {displayName}.
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Ionicons name="location-outline" size={22} color="#1A6B6B" style={styles.icon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Address</Text>
              <Text style={styles.summaryText}>{fullAddress || "Address not provided"}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Ionicons name="construct-outline" size={22} color="#1A6B6B" style={styles.icon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Service</Text>
              <Text style={styles.summaryText}>{categoryName || "Requested Service"}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Ionicons name="document-text-outline" size={22} color="#1A6B6B" style={styles.icon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Problem Description</Text>
              <Text style={styles.summaryText}>
                {issueDescription ||
                  (selectedServices.length > 0
                    ? selectedServices.join(", ")
                    : "No specific notes provided")}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Ionicons name="images-outline" size={22} color="#1A6B6B" style={styles.icon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Photos Attached</Text>
              <Text style={styles.summaryText}>{images.length} photos uploaded</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Ionicons name="calendar-outline" size={22} color="#1A6B6B" style={styles.icon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>When Needed</Text>
              <Text style={styles.summaryText}>{getTimingText()}</Text>
            </View>
          </View>

          {guestName ? (
            <>
              <View style={styles.divider} />
              <View style={styles.summaryRow}>
                <Ionicons name="call-outline" size={22} color="#1A6B6B" style={styles.icon} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>Contact Info</Text>
                  <Text style={styles.summaryText}>
                    {guestName} ({guestPhone})
                  </Text>
                  <Text style={[styles.summaryText, { fontSize: 13, color: "#6b7280" }]}>
                    {guestEmail}
                  </Text>
                </View>
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom + 12, Platform.OS === "android" ? 28 : 16) },
        ]}
      >
        <TouchableOpacity style={styles.submitButton} onPress={handleContinue}>
          <Text style={styles.submitButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
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
  container: {
    padding: 20,
    paddingBottom: 30,
  },
  titleSection: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontFamily: "DemoOsbert-Bold",
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 6,
    lineHeight: 30,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Lato",
    color: "#6b7280",
    lineHeight: 20,
  },
  summaryCard: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 16,
    backgroundColor: "#ffffff",
    padding: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  icon: {
    marginRight: 14,
    marginTop: 2,
  },
  rowLabel: {
    fontSize: 12,
    fontFamily: "Lato-Bold",
    color: "#9ca3af",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  summaryText: {
    fontSize: 15,
    fontFamily: "Lato",
    color: "#1f2937",
    lineHeight: 21,
  },
  divider: {
    height: 1,
    backgroundColor: "#f3f4f6",
    marginHorizontal: 12,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    backgroundColor: "#ffffff",
  },
  submitButton: {
    backgroundColor: "#1A6B6B",
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: "Lato-Bold",
    color: "#ffffff",
  },
});
