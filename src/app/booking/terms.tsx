import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { initStripe, useStripe } from "@stripe/stripe-react-native";
import axios from "axios";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BASE_URL } from "../../config/api";
import { useAuthStore } from "../../store/useAuthStore";
import { useBookingStore } from "../../store/useBookingStore";
import { FIXAPLEX_SERVICE_CATALOG } from "../../utils/serviceCatalog";

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
    charges: storeCharges,
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

  // Resolve service pricing from store or catalog
  const catalogItem = serviceId ? FIXAPLEX_SERVICE_CATALOG[String(serviceId)] : null;
  const rawMin = minPrice || catalogItem?.min_price || "140.00";
  const rawMax = maxPrice || catalogItem?.max_price || "220.00";
  const rawCharge = storeCharges || "25.00";

  const minNum = parseFloat(String(rawMin).replace(/[^0-9.]/g, "")) || 140;
  const maxNum = parseFloat(String(rawMax).replace(/[^0-9.]/g, "")) || 220;
  const chargesNum = parseFloat(String(rawCharge).replace(/[^0-9.]/g, "")) || 25;

  // Subtract the charges field from the max booking to get temporary card authorisation amount
  const holdAmount = Math.max(0, maxNum - chargesNum);

  // Formatted amounts
  const displayMin = minNum % 1 === 0 ? minNum.toFixed(0) : minNum.toFixed(2);
  const displayMax = maxNum % 1 === 0 ? maxNum.toFixed(0) : maxNum.toFixed(2);

  const formattedMax = maxNum.toFixed(2);
  const formattedCharges = chargesNum.toFixed(2);
  const formattedHold = holdAmount.toFixed(2);

  const renderServiceIcon = () => {
    const sName = (categoryName || catalogItem?.name || "").toLowerCase();
    if (sName.includes("radiator") || sName.includes("heat")) {
      return <MaterialCommunityIcons name="radiator" size={24} color="#0F766E" />;
    }
    if (
      sName.includes("plumb") ||
      sName.includes("leak") ||
      sName.includes("tap") ||
      sName.includes("pipe") ||
      sName.includes("toilet") ||
      sName.includes("drain") ||
      sName.includes("shower")
    ) {
      return <MaterialCommunityIcons name="water-pump" size={24} color="#0F766E" />;
    }
    if (
      sName.includes("electr") ||
      sName.includes("wire") ||
      sName.includes("fuse") ||
      sName.includes("socket") ||
      sName.includes("light")
    ) {
      return <Ionicons name="flash-outline" size={24} color="#0F766E" />;
    }
    if (sName.includes("clean") || sName.includes("carpet") || sName.includes("sofa")) {
      return <Ionicons name="sparkles-outline" size={24} color="#0F766E" />;
    }
    if (sName.includes("handy") || sName.includes("repair") || sName.includes("assembl")) {
      return <Ionicons name="construct-outline" size={24} color="#0F766E" />;
    }
    return <MaterialCommunityIcons name="radiator" size={24} color="#0F766E" />;
  };

  const handleBookingSuccess = async (response: any) => {
    const bookingData = response.data?.bookingData;
    const bookingId = bookingData?.booking_id || bookingData?.id;
    const bookingCode = bookingData?.booking_code;
    const depositAmount =
      bookingData?.deposit_amount || response.data?.payment?.amount || formattedCharges;
    const rawMsg =
      response.data?.msg ||
      "Your booking request has been confirmed. A certified technician is being matched to your job.";
    const cleanMsg = rawMsg.replace(/\/n/g, "\n");

    const cleanCode = (c: string) => String(c || "").trim().toUpperCase().replace(/\s+/g, "");
    if (bookingId) {
      await SecureStore.setItemAsync(`deposit_paid_${bookingId}`, "true").catch(() => { });
    }
    if (bookingCode) {
      await SecureStore.setItemAsync(`deposit_paid_${cleanCode(bookingCode)}`, "true").catch(() => { });
    }

    addSubmittedJob({
      id: bookingId || Math.random().toString(),
      bookingCode: bookingCode,
      serviceId,
      address: bookingData?.address || fullAddress,
      categoryName: categoryName || "Service Request",
      status: "Pending",
      depositAmount: depositAmount,
      depositPaid: true,
      createdAt: new Date().toISOString(),
    });

    const navigateToBookings = () => {
      reset();
      router.replace("/(tabs)/jobs" as any);
    };

    Alert.alert(
      bookingCode ? `Booking Confirmed (${bookingCode})` : "Booking Confirmed!",
      cleanMsg,
      [
        {
          text: "View Status",
          onPress: navigateToBookings,
        },
      ],
      { cancelable: false }
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

      // Send booking_id if retrying an unpaid booking
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
          await handleBookingSuccess(response);
          return;
        } else {
          console.warn("[Stripe] payment.required is true but no client_secret found in payment block");
        }
      }

      // Fallback for bookings where payment.required is false
      if (response.data && (response.data.success || response.data.bookingData)) {
        await handleBookingSuccess(response);
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

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review & secure booking</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Card 1: Estimated Service Cost */}
        <View style={styles.costCard}>
          <View style={styles.costCardHeader}>
            <View style={styles.costIconCircle}>{renderServiceIcon()}</View>
            <View style={styles.costHeaderTexts}>
              <Text style={styles.costSectionLabel}>ESTIMATED SERVICE COST</Text>
              <Text style={styles.costPriceRange}>
                €{displayMin} – €{displayMax}
              </Text>
            </View>
          </View>
          <Text style={styles.costExplainer}>
            Indicative estimate only. Your technician will inspect the issue and confirm a final quote before work begins.
          </Text>
        </View>

        {/* Card 2: Payment Today */}
        <View style={styles.paymentTodayCard}>
          <View style={styles.cardTopRow}>
            <View style={styles.cardIconCircle}>
              <Ionicons name="card-outline" size={22} color="#0F766E" />
            </View>
            <View style={styles.paymentTodayTitleRow}>
              <Text style={styles.cardMainTitle}>Payment today</Text>
              <View style={styles.chargedNowBadge}>
                <Text style={styles.chargedNowBadgeText}>Charged now</Text>
              </View>
            </View>
            <Text style={styles.paymentTodayAmount}>€{formattedCharges}</Text>
          </View>
          <Text style={styles.cardSubText}>
            Booking payment. Credited in full towards your final approved job price.
          </Text>
        </View>

        {/* Card 3: Temporary Card Authorisation */}
        <View style={styles.authHoldCard}>
          <View style={styles.cardTopRow}>
            <View style={styles.cardIconCircle}>
              <Ionicons name="shield-checkmark-outline" size={22} color="#0F766E" />
            </View>
            <Text style={styles.cardMainTitleAuth}>Temporary card authorisation</Text>
            <Text style={styles.authHoldAmount}>Up to €{formattedHold}</Text>
          </View>
          <Text style={styles.cardSubText}>
            A temporary hold for the remaining amount up to your €{displayMax} estimated maximum. This is not an additional charge. Your final price requires your approval.
          </Text>
        </View>

        {/* Card 4: Summary Breakdown Table */}
        <View style={styles.summaryTableCard}>
          <View style={styles.summaryTableRow}>
            <Text style={styles.summaryTableLabel}>Maximum estimated total</Text>
            <Text style={styles.summaryTableValueDark}>€{formattedMax}</Text>
          </View>
          <View style={styles.tableDivider} />
          <View style={styles.summaryTableRow}>
            <Text style={styles.summaryTableLabel}>Paid today</Text>
            <Text style={styles.summaryTableValueDark}>€{formattedCharges}</Text>
          </View>
          <View style={styles.tableDivider} />
          <View style={styles.summaryTableRow}>
            <Text style={styles.summaryTableLabel}>Remaining amount held</Text>
            <Text style={styles.summaryTableValueTeal}>up to €{formattedHold}</Text>
          </View>
        </View>

        {/* Card 5: Cancellation & Refund Terms */}
        <View style={styles.termsBulletsCard}>
          <View style={styles.termsHeaderRow}>
            <Ionicons name="information-circle" size={18} color="#0F766E" />
            <Text style={styles.termsHeaderTitle}>Cancellation & refund terms</Text>
          </View>
          <View style={styles.bulletsList}>
            <View style={styles.bulletItem}>
              <Ionicons name="checkmark-circle" size={16} color="#0F766E" style={styles.bulletIcon} />
              <Text style={styles.bulletItemText}>
                Cancel within the free cancellation window for a refund, subject to the Booking Terms.
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Ionicons name="checkmark-circle" size={16} color="#0F766E" style={styles.bulletIcon} />
              <Text style={styles.bulletItemText}>
                If the final quote changes, you'll approve it before work proceeds.
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Ionicons name="checkmark-circle" size={16} color="#0F766E" style={styles.bulletIcon} />
              <Text style={styles.bulletItemText}>
                If the final quote exceeds the existing authorisation, we'll request authorisation for the additional amount.
              </Text>
            </View>
          </View>
        </View>

        {/* Terms Agreement Checkbox & Link */}
        <View style={styles.agreementSection}>
          <TouchableOpacity
            style={styles.checkboxTouch}
            activeOpacity={0.8}
            onPress={() => setAgreedToTerms(!agreedToTerms)}
          >
            <View style={[styles.checkboxSquare, agreedToTerms && styles.checkboxSquareActive]}>
              {agreedToTerms && <Ionicons name="checkmark" size={15} color="#FFFFFF" />}
            </View>
            <View style={styles.agreementTextContainer}>
              <Text style={styles.agreementText}>
                I agree to the Fixaplex{" "}
                <Text style={styles.agreementLink} onPress={() => setShowTermsModal(true)}>
                  Terms of Service
                </Text>
                ,{" "}
                <Text style={styles.agreementLink} onPress={() => setShowTermsModal(true)}>
                  Booking Terms
                </Text>{" "}
                and{" "}
                <Text style={styles.agreementLink} onPress={() => setShowTermsModal(true)}>
                  Cancellation Policy
                </Text>
              </Text>
              <TouchableOpacity
                style={styles.viewTermsRow}
                activeOpacity={0.7}
                onPress={() => setShowTermsModal(true)}
              >
                <Text style={styles.viewTermsLinkText}>View terms & conditions</Text>
                <Ionicons name="chevron-forward" size={14} color="#0F766E" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom Floating/Fixed Footer Button */}
      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom + 12, Platform.OS === "android" ? 28 : 20) },
        ]}
      >
        <TouchableOpacity
          style={[styles.secureButton, (!agreedToTerms || loading) && styles.secureButtonDisabled]}
          onPress={handleSecureBooking}
          disabled={!agreedToTerms || loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <View style={styles.secureButtonContent}>
              <Text style={styles.secureButtonText}>
                Secure booking · Pay €{formattedMax}
              </Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Full Terms & Conditions Modal */}
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
                A €{formattedCharges} booking payment is charged upon securing your booking. This payment secures the allocated time slot and covers initial technician dispatch. The entire €{formattedCharges} amount is credited in full towards your final approved job price.
              </Text>

              <Text style={styles.termsHeading}>2. Temporary Card Authorisation</Text>
              <Text style={styles.termsParagraph}>
                A temporary hold for up to €{formattedHold} covers the remaining amount up to your €{displayMax} estimated maximum. This is not an immediate charge. Your final price requires your approval before any work begins.
              </Text>

              <Text style={styles.termsHeading}>3. On-Site Quote & Inspection</Text>
              <Text style={styles.termsParagraph}>
                All online estimates are indicative only. When your technician arrives, they inspect the issue and confirm a clear, final quote. You have full discretion to approve or decline the final quote.
              </Text>

              <Text style={styles.termsHeading}>4. Cancellation & Refunds</Text>
              <Text style={styles.termsParagraph}>
                Cancel within the free cancellation window for a refund, subject to the Fixaplex Booking Terms. If the technician is already dispatched or on-site, call-out compensation applies.
              </Text>

              <Text style={styles.termsHeading}>5. Safety & Standards</Text>
              <Text style={styles.termsParagraph}>
                All Fixaplex technicians are verified professionals. We maintain rigorous standards and provide dispute resolution for complete peace of mind.
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
    backgroundColor: "#FFFFFF",
    paddingTop: Platform.OS === "android" ? 40 : 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "DemoOsbert-Bold",
    fontWeight: "700",
    color: "#0F172A",
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 28,
    gap: 14,
  },

  // Card 1: Estimated Service Cost
  costCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  costCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  costIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#E6F7F5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  costHeaderTexts: {
    flex: 1,
  },
  costSectionLabel: {
    fontSize: 11,
    fontFamily: "Lato-Bold",
    fontWeight: "600",
    color: "#64748B",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  costPriceRange: {
    fontSize: 24,
    fontFamily: "DemoOsbert-Bold",
    fontWeight: "800",
    color: "#0F766E",
  },
  costExplainer: {
    fontSize: 12.5,
    fontFamily: "Lato",
    color: "#64748B",
    lineHeight: 18,
  },

  // Card 2: Payment Today
  paymentTodayCard: {
    backgroundColor: "#F4FBF9",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#CCFBF1",
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  cardIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#D1F5EE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  paymentTodayTitleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  cardMainTitle: {
    fontSize: 15.5,
    fontFamily: "Lato-Bold",
    fontWeight: "700",
    color: "#0F172A",
  },
  chargedNowBadge: {
    backgroundColor: "#CCFBF1",
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 10,
    marginLeft: 8,
  },
  chargedNowBadgeText: {
    fontSize: 11,
    fontFamily: "Lato-Bold",
    fontWeight: "700",
    color: "#0F766E",
  },
  paymentTodayAmount: {
    fontSize: 21,
    fontFamily: "DemoOsbert-Bold",
    fontWeight: "800",
    color: "#0F172A",
  },
  cardSubText: {
    fontSize: 12.5,
    fontFamily: "Lato",
    color: "#64748B",
    lineHeight: 18,
  },

  // Card 3: Temporary Card Authorisation
  authHoldCard: {
    backgroundColor: "#F4FBF9",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#CCFBF1",
  },
  cardMainTitleAuth: {
    fontSize: 15,
    fontFamily: "Lato-Bold",
    fontWeight: "700",
    color: "#0F172A",
    flex: 1,
    paddingRight: 6,
  },
  authHoldAmount: {
    fontSize: 15.5,
    fontFamily: "DemoOsbert-Bold",
    fontWeight: "800",
    color: "#0F766E",
  },

  // Card 4: Summary Breakdown Table
  summaryTableCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  summaryTableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 2,
  },
  summaryTableLabel: {
    fontSize: 14,
    fontFamily: "Lato",
    color: "#64748B",
  },
  summaryTableValueDark: {
    fontSize: 15,
    fontFamily: "Lato-Bold",
    fontWeight: "700",
    color: "#0F172A",
  },
  summaryTableValueTeal: {
    fontSize: 15,
    fontFamily: "Lato-Bold",
    fontWeight: "700",
    color: "#0F766E",
  },
  tableDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 10,
  },

  // Card 5: Cancellation & Refund Terms
  termsBulletsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  termsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  termsHeaderTitle: {
    fontSize: 14.5,
    fontFamily: "Lato-Bold",
    fontWeight: "700",
    color: "#0F172A",
    marginLeft: 6,
  },
  bulletsList: {
    gap: 10,
  },
  bulletItem: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  bulletIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  bulletItemText: {
    fontSize: 12.5,
    fontFamily: "Lato",
    color: "#475569",
    lineHeight: 18,
    flex: 1,
  },

  // Checkbox Section
  agreementSection: {
    marginTop: 4,
    paddingHorizontal: 2,
  },
  checkboxTouch: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  checkboxSquare: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#94A3B8",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    backgroundColor: "transparent",
  },
  checkboxSquareActive: {
    backgroundColor: "#0F766E",
    borderColor: "#0F766E",
  },
  agreementTextContainer: {
    flex: 1,
  },
  agreementText: {
    fontSize: 12.5,
    fontFamily: "Lato",
    color: "#475569",
    lineHeight: 18,
  },
  agreementLink: {
    color: "#0F766E",
    textDecorationLine: "underline",
    fontFamily: "Lato-Bold",
  },
  viewTermsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  viewTermsLinkText: {
    fontSize: 12.5,
    fontFamily: "Lato-Bold",
    fontWeight: "600",
    color: "#0F766E",
    marginRight: 2,
  },

  // Footer Button
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    backgroundColor: "#FFFFFF",
  },
  secureButton: {
    backgroundColor: "#0F766E",
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
  },
  secureButtonDisabled: {
    backgroundColor: "#94A3B8",
  },
  secureButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  secureButtonText: {
    fontSize: 16,
    fontFamily: "Lato-Bold",
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
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
    color: "#0F172A",
    fontWeight: "bold",
  },
  modalScroll: {
    marginBottom: 16,
  },
  termsHeading: {
    fontSize: 14,
    fontFamily: "Lato-Bold",
    color: "#0F172A",
    marginTop: 12,
    marginBottom: 4,
  },
  termsParagraph: {
    fontSize: 13,
    fontFamily: "Lato",
    color: "#475569",
    lineHeight: 18,
  },
  modalCloseButton: {
    backgroundColor: "#0F766E",
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: "center",
  },
  modalCloseButtonText: {
    color: "#FFFFFF",
    fontFamily: "Lato-Bold",
    fontSize: 15,
  },
});
