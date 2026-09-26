import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import axios from "axios";
import { BASE_URL } from "../../config/api";
import { useStripe, initStripe } from "@stripe/stripe-react-native";
import { useBookingStore } from "../../store/useBookingStore";
import { useAuthStore } from "../../store/useAuthStore";

export default function BookingTerms() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const userData = useAuthStore((state) => state.userData);
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const {
    serviceId,
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
    rawBookingDate,
    activeBookingId,
    setActiveBookingId,
    issueDescription,
    images,
    minPrice,
    maxPrice,
    guestName,
    guestPhone,
    guestEmail,
    reset,
    addSubmittedJob,
  } = useBookingStore();

  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const fullAddress = [addressLine1, addressLine2, addressLine3, town, county, postcode]
    .filter(Boolean)
    .join(", ");

  const handleBookingSuccess = (response: any) => {
    const bookingData = response.data?.bookingData;
    const bookingId = bookingData?.booking_id || bookingData?.id;
    const bookingCode = bookingData?.booking_code;
    const depositAmount = bookingData?.deposit_amount || response.data?.payment?.amount;
    const rawMsg =
      response.data?.msg ||
      "Your booking request has been confirmed. A certified technician is being matched to your job.";
    const cleanMsg = rawMsg.replace(/\/n/g, "\n");

    addSubmittedJob({
      id: bookingId || Math.random().toString(),
      bookingCode: bookingCode,
      serviceId,
      address: bookingData?.address || fullAddress,
      categoryName: categoryName || "Service Request",
      status: "Pending",
      depositAmount: depositAmount,
      createdAt: new Date().toISOString(),
    });
    reset();
    Alert.alert(
      bookingCode ? `Booking Confirmed (${bookingCode})` : "Booking Confirmed!",
      cleanMsg,
      [
        {
          text: "View Status",
          onPress: () => {
            router.replace("/(tabs)");
          },
        },
      ]
    );
  };

  const handleSecureBooking = async () => {
    if (!agreedToTerms) {
      Alert.alert("Agreement Required", "Please accept the Fixaplex Booking Terms to proceed.");
      return;
    }

    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync("userToken");
      if (!token) {
        setLoading(false);
        Alert.alert(
          "Login Required",
          "Please log in or register an account to secure your booking and payment.",
          [
            {
              text: "Log In",
              onPress: () => router.push("/login" as any),
            },
            {
              text: "Register",
              onPress: () => router.push("/register" as any),
            },
            {
              text: "Cancel",
              style: "cancel",
            },
          ]
        );
        return;
      }

      const formData = new FormData();

      // Send booking_id if retrying an unpaid booking (Image 4 / backend $id)
      if (activeBookingId) {
        formData.append("booking_id", String(activeBookingId));
      }

      formData.append("service_id", String(serviceId || "1"));
      formData.append("area_id", "0");

      // Contact Details
      const contactName = userData?.full_name || userData?.name || guestName || "";
      const contactPhone = userData?.phone || userData?.phone_number || guestPhone || "";
      if (contactName) formData.append("full_name", contactName);
      if (contactPhone) formData.append("phone_number", contactPhone);

      // Notes
      formData.append("notes", issueDescription || "");

      // Address Fields
      const resolvedTown = town?.trim() || county?.trim() || "Dublin";
      formData.append("address_line1", addressLine1 || "");
      if (addressLine2) formData.append("address_line2", addressLine2);
      if (addressLine3) formData.append("address_line3", addressLine3);
      formData.append("town", resolvedTown);
      if (county) formData.append("county", county);
      if (postcode) formData.append("postcode", postcode);
      formData.append("address", fullAddress || "");

      // Schedule (asap | tomorrow | future)
      const schedType = (timingType || "ASAP").toLowerCase();
      formData.append("schedule_type", schedType);

      if (schedType === "tomorrow") {
        const tomorrowTime = selectedTime?.trim() || "10:00 AM";
        formData.append("booking_time", tomorrowTime);
      } else if (schedType === "future") {
        let formattedDate = rawBookingDate;
        if (!formattedDate && selectedDate) {
          const parsed = new Date(selectedDate);
          if (!isNaN(parsed.getTime())) {
            formattedDate = parsed.toISOString().split("T")[0];
          } else {
            formattedDate = selectedDate;
          }
        }
        if (formattedDate) {
          formData.append("booking_date", formattedDate);
        }
        if (selectedTime?.trim()) {
          formData.append("booking_time", selectedTime.trim());
        }
      }

      // Stripe mobile SDK API version for ephemeral key creation
      formData.append("stripe_version", "2020-08-27");

      // Terms Agreement
      formData.append("terms_accepted", "1");
      formData.append("terms_version", "2026-09");

      // Attach images (up to 6 photos, max 5MB each)
      if (images && images.length > 0) {
        images.slice(0, 6).forEach((imgAsset, idx) => {
          formData.append("images[]", {
            uri: String(imgAsset.uri),
            name: String(imgAsset.fileName || `issue_photo_${idx + 1}.jpg`),
            type: String(imgAsset.mimeType || "image/jpeg"),
          } as any);
        });
      }

      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
      };

      console.log("[book_service] Submitting booking request...");
      const response = await axios.post(`${BASE_URL}/clients/jobs/book_service.php`, formData, {
        headers,
      });

      console.log("[book_service] Response:", JSON.stringify(response.data, null, 2));

      // Always capture activeBookingId if returned so retries update instead of duplicating
      const savedBookingId =
        response.data?.bookingData?.booking_id || response.data?.bookingData?.id;
      if (savedBookingId) {
        setActiveBookingId(savedBookingId);
      }

      // Handle backend failure response (e.g. paymentError with retryable: true)
      if (response.data && response.data.success === false) {
        setLoading(false);
        if (response.data.retryable) {
          Alert.alert(
            "Payment Setup Incomplete",
            response.data.msg ||
              "Your booking was saved, but payment preparation failed. Tap retry to start payment.",
            [
              { text: "Retry Payment", onPress: handleSecureBooking },
              { text: "Later", style: "cancel" },
            ]
          );
        } else {
          Alert.alert(
            "Booking Notice",
            response.data.msg || "Unable to complete booking. Please try again."
          );
        }
        return;
      }

      const payment = response.data?.payment;

      // Handle Stripe Payment Sheet
      if (payment && payment.required) {
        const clientSecret =
          payment.payment_intent_client_secret ||
          payment.client_secret ||
          payment.paymentIntentClientSecret;

        if (clientSecret) {
          const publishableKey = payment.publishable_key || payment.publishableKey;
          if (publishableKey) {
            console.log("[Stripe] Initializing Stripe with backend publishableKey...");
            await initStripe({
              publishableKey,
              merchantIdentifier: "merchant.com.john_1050.ibb",
              urlScheme: "ibb",
            });
          }

          console.log("[Stripe] Initializing Payment Sheet with client secret...");
          const customerId = payment.customer_id ? String(payment.customer_id) : undefined;
          const ephemeralKey =
            payment.ephemeral_key && String(payment.ephemeral_key).length > 0
              ? String(payment.ephemeral_key)
              : undefined;

          const { error: initError } = await initPaymentSheet({
            paymentIntentClientSecret: clientSecret,
            merchantDisplayName: "Fixaplex",
            customerId: customerId,
            customerEphemeralKeySecret: ephemeralKey,
            allowsDelayedPaymentMethods: true,
            returnURL: "ibb://stripe-redirect",
          });

          if (initError) {
            console.error("[Stripe] initPaymentSheet error:", initError);
            Alert.alert("Payment Error", initError.message || "Failed to initialize payment sheet.");
            setLoading(false);
            return;
          }

          setLoading(false);
          console.log("[Stripe] Presenting Payment Sheet...");
          const { error: presentError } = await presentPaymentSheet();

          if (presentError) {
            console.warn("[Stripe] presentPaymentSheet result:", presentError);
            if (presentError.code === "Canceled") {
              Alert.alert(
                "Payment Incomplete",
                "Your booking is saved in pending status. You can resume payment at any time to confirm it."
              );
            } else {
              Alert.alert("Payment Failed", presentError.message || "Could not complete payment.");
            }
            return;
          }

          // Payment successful! Webhook marks payment_status = deposit_paid
          console.log("[Stripe] Payment completed successfully!");
          handleBookingSuccess(response);
          return;
        } else {
          console.warn("[Stripe] payment.required is true but no client_secret found in payment block");
        }
      }

      // Fallback for bookings where payment.required is false (e.g. edit of already paid booking)
      if (response.data && (response.data.success || response.data.bookingData)) {
        handleBookingSuccess(response);
      } else {
        Alert.alert(
          "Booking Notice",
          response.data?.msg || "Unable to complete booking. Please try again."
        );
      }
    } catch (error: any) {
      console.error("Booking submission error:", error);
      const serverMsg =
        error?.response?.data?.msg ||
        error?.message ||
        "There was an issue processing your booking.";
      Alert.alert("Booking Error", serverMsg);
    } finally {
      setLoading(false);
    }
  };

  const priceText =
    minPrice && maxPrice
      ? `€${minPrice} – €${maxPrice}`
      : minPrice
      ? `From €${minPrice}`
      : "Quote provided on-site";

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms & Estimated Cost</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Estimated Cost Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconCircle}>
              <Ionicons name="pricetag" size={20} color="#1A6B6B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardSubtitle}>Estimated Service Cost</Text>
              <Text style={styles.priceEstimate}>{priceText}</Text>
            </View>
          </View>
          <Text style={styles.cardExplainer}>
            This is an indicative estimate for {categoryName || "this service"}. The technician will
            perform an on-site inspection and confirm a final quote before starting any work.
          </Text>
        </View>

        {/* Secure Booking Fee Card */}
        <View style={styles.bookingFeeCard}>
          <View style={styles.feeHeaderRow}>
            <View style={styles.feeBadge}>
              <Ionicons name="shield-checkmark" size={18} color="#1A6B6B" />
              <Text style={styles.feeBadgeText}>Deposit</Text>
            </View>
            <Text style={styles.feeAmount}>€25.00</Text>
          </View>
          <Text style={styles.feeTitle}>Secure Booking Deposit</Text>
          <Text style={styles.feeDescription}>
            A €25 booking fee is required to dispatch a certified, verified local technician to your
            location. This fee is credited 100% towards your final service quote.
          </Text>
        </View>

        {/* Cancellation and Refund Policy */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Cancellation & Refund Terms</Text>
          <View style={styles.bulletRow}>
            <Ionicons name="checkmark-circle" size={18} color="#1A6B6B" style={styles.bulletIcon} />
            <Text style={styles.bulletText}>
              <Text style={styles.boldText}>Free Cancellation:</Text> Cancel with a full refund up
              to 2 hours before the technician's scheduled arrival window.
            </Text>
          </View>
          <View style={styles.bulletRow}>
            <Ionicons name="checkmark-circle" size={18} color="#1A6B6B" style={styles.bulletIcon} />
            <Text style={styles.bulletText}>
              <Text style={styles.boldText}>Inspection Guarantee:</Text> If you decline the final
              on-site quote, the technician call-out terms apply.
            </Text>
          </View>
          <View style={styles.bulletRow}>
            <Ionicons name="checkmark-circle" size={18} color="#1A6B6B" style={styles.bulletIcon} />
            <Text style={styles.bulletText}>
              <Text style={styles.boldText}>Direct Resolution:</Text> You can report any concerns or
              request a dispute review directly in the app.
            </Text>
          </View>
        </View>

        {/* Agreement Checkbox */}
        <TouchableOpacity
          style={styles.checkboxContainer}
          activeOpacity={0.8}
          onPress={() => setAgreedToTerms(!agreedToTerms)}
        >
          <View style={[styles.checkbox, agreedToTerms && styles.checkboxActive]}>
            {agreedToTerms && <Ionicons name="checkmark" size={16} color="#ffffff" />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.checkboxLabel}>
              I have read and agree to the Fixaplex Terms of Service, Cancellation Policy, and
              Booking Conditions.
            </Text>
            <TouchableOpacity onPress={() => setShowTermsModal(true)}>
              <Text style={styles.viewTermsLink}>View Terms & Conditions</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* Footer Button */}
      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom + 12, Platform.OS === "android" ? 28 : 16) },
        ]}
      >
        <TouchableOpacity
          style={[styles.submitButton, (!agreedToTerms || loading) && styles.submitButtonDisabled]}
          onPress={handleSecureBooking}
          disabled={!agreedToTerms || loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.submitButtonText}>Secure Booking €25</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Modal with Full Terms & Conditions */}
      <Modal visible={showTermsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Fixaplex Booking Terms</Text>
              <TouchableOpacity onPress={() => setShowTermsModal(false)}>
                <Ionicons name="close-circle" size={26} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.termsHeading}>1. Booking Deposit</Text>
              <Text style={styles.termsParagraph}>
                A €25 booking deposit is charged upon securing a technician. This deposit secures the
                allocated time slot and covers initial administrative and dispatch operations. The
                entire €25 amount will be deducted from your final agreed service invoice.
              </Text>

              <Text style={styles.termsHeading}>2. On-Site Quote & Inspection</Text>
              <Text style={styles.termsParagraph}>
                Online quotes and price ranges are estimates. When the technician arrives, they will
                inspect the site and present a final quote. You have full discretion to accept or
                decline the final quote. Work will only commence upon your explicit agreement.
              </Text>

              <Text style={styles.termsHeading}>3. Cancellation & Refunds</Text>
              <Text style={styles.termsParagraph}>
                Cancellations made more than 2 hours before the scheduled time slot receive a 100%
                refund of the booking fee. If cancelled within 2 hours or after the technician is
                en route, call-out compensation is deducted.
              </Text>

              <Text style={styles.termsHeading}>4. Safety & Standards</Text>
              <Text style={styles.termsParagraph}>
                All Fixaplex technicians are verified professionals. We maintain rigorous standards
                and provide built-in reporting and dispute resolution for complete peace of mind.
              </Text>
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => {
                setAgreedToTerms(true);
                setShowTermsModal(false);
              }}
            >
              <Text style={styles.modalCloseButtonText}>I Understand & Agree</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    gap: 16,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#E8F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  cardSubtitle: {
    fontSize: 13,
    fontFamily: "Lato",
    color: "#6b7280",
    textTransform: "uppercase",
  },
  priceEstimate: {
    fontSize: 22,
    fontFamily: "DemoOsbert-Bold",
    color: "#1A6B6B",
    fontWeight: "bold",
  },
  cardExplainer: {
    fontSize: 13,
    fontFamily: "Lato",
    color: "#4b5563",
    lineHeight: 19,
  },
  bookingFeeCard: {
    backgroundColor: "#F0FDFA",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#99F6E4",
  },
  feeHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  feeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#CCFBF1",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  feeBadgeText: {
    fontSize: 12,
    fontFamily: "Lato-Bold",
    color: "#0F766E",
  },
  feeAmount: {
    fontSize: 24,
    fontFamily: "DemoOsbert-Bold",
    color: "#0F766E",
    fontWeight: "bold",
  },
  feeTitle: {
    fontSize: 16,
    fontFamily: "Lato-Bold",
    color: "#134E4A",
    marginBottom: 6,
  },
  feeDescription: {
    fontSize: 13,
    fontFamily: "Lato",
    color: "#115E59",
    lineHeight: 18,
  },
  sectionHeader: {
    fontSize: 15,
    fontFamily: "Lato-Bold",
    color: "#1f2937",
    marginBottom: 12,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  bulletIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  bulletText: {
    fontSize: 13,
    fontFamily: "Lato",
    color: "#374151",
    flex: 1,
    lineHeight: 19,
  },
  boldText: {
    fontFamily: "Lato-Bold",
    color: "#1f2937",
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#9ca3af",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkboxActive: {
    backgroundColor: "#1A6B6B",
    borderColor: "#1A6B6B",
  },
  checkboxLabel: {
    fontSize: 13,
    fontFamily: "Lato",
    color: "#374151",
    lineHeight: 18,
  },
  viewTermsLink: {
    fontSize: 13,
    fontFamily: "Lato-Bold",
    color: "#1A6B6B",
    marginTop: 4,
    textDecorationLine: "underline",
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
  submitButtonDisabled: {
    backgroundColor: "#d1d5db",
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: "Lato-Bold",
    color: "#ffffff",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "DemoOsbert-Bold",
    color: "#1f2937",
    fontWeight: "bold",
  },
  modalScroll: {
    marginBottom: 16,
  },
  termsHeading: {
    fontSize: 14,
    fontFamily: "Lato-Bold",
    color: "#1f2937",
    marginTop: 12,
    marginBottom: 4,
  },
  termsParagraph: {
    fontSize: 13,
    fontFamily: "Lato",
    color: "#4b5563",
    lineHeight: 18,
  },
  modalCloseButton: {
    backgroundColor: "#1A6B6B",
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: "center",
  },
  modalCloseButtonText: {
    color: "#ffffff",
    fontFamily: "Lato-Bold",
    fontSize: 15,
  },
});
