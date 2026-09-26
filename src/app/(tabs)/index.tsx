import { FontAwesome5, Ionicons, MaterialIcons } from "@expo/vector-icons";
import axios from "axios";
import { useFocusEffect, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, Platform, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { BASE_URL, IMAGE_BASE_URL, STRIPE_PUBLISHABLE_KEY } from "../../config/api";
import { useStripe, initStripe } from "@stripe/stripe-react-native";
import { useAuthStore } from "../../store/useAuthStore";
import { useBookingStore } from "../../store/useBookingStore";

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
};

const getCurrencySymbol = (curr?: string) => {
  if (!curr) return "€";
  const upper = String(curr).toUpperCase();
  if (upper === "EUR") return "€";
  if (upper === "GBP") return "£";
  if (upper === "USD") return "$";
  return curr;
};

const formatAmount = (val: any) => {
  if (val === null || val === undefined || val === "") return "0.00";
  const num = Number(val);
  return isNaN(num) ? "0.00" : num.toFixed(2);
};

export default function Dashboard() {
  const router = useRouter();
  const setRole = useAuthStore(state => state.setRole);
  const userData = useAuthStore(state => state.userData);
  const guestId = useAuthStore(state => state.guestId);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [payingBookingId, setPayingBookingId] = useState<string | number | null>(null);

  // Cancellation state
  const [loadingCancelJobId, setLoadingCancelJobId] = useState<string | number | null>(null);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [selectedCancelJob, setSelectedCancelJob] = useState<any | null>(null);
  const [cancelPreviewData, setCancelPreviewData] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isConfirmingCancel, setIsConfirmingCancel] = useState(false);

  const handleInitiateCancel = async (job: any) => {
    const bookingId = job.booking_id || job.id;
    if (!bookingId) {
      Alert.alert("Error", "Could not find booking ID.");
      return;
    }

    setLoadingCancelJobId(bookingId);
    try {
      const token = await SecureStore.getItemAsync("userToken");
      if (!token) {
        Alert.alert("Login Required", "Please log in to manage your bookings.", [
          { text: "Log In", onPress: () => router.push("/login" as any) },
          { text: "Cancel", style: "cancel" },
        ]);
        setLoadingCancelJobId(null);
        return;
      }

      // Step 1: Call without confirm to preview breakdown
      const formData = new FormData();
      formData.append("booking_id", String(bookingId));

      const res = await axios.post(
        `${BASE_URL}/clients/jobs/cancel_booking.php`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      console.log("[cancel_booking preview] Response:", res.data);

      if (res.data?.success === false) {
        Alert.alert("Cannot Cancel", res.data?.msg || "This booking cannot be cancelled.");
        setLoadingCancelJobId(null);
        return;
      }

      setSelectedCancelJob(job);
      setCancelPreviewData(res.data);
      setCancelReason("");
      setCancelModalVisible(true);
    } catch (err: any) {
      console.error("[cancel_booking preview] Error:", err);
      Alert.alert(
        "Cannot Cancel",
        err.response?.data?.msg || err.message || "Failed to retrieve cancellation details."
      );
    } finally {
      setLoadingCancelJobId(null);
    }
  };

  const handleConfirmCancel = async () => {
    if (!selectedCancelJob) return;
    const bookingId = selectedCancelJob.booking_id || selectedCancelJob.id;
    if (!bookingId) return;

    setIsConfirmingCancel(true);
    try {
      const token = await SecureStore.getItemAsync("userToken");
      const confirmData = new FormData();
      confirmData.append("booking_id", String(bookingId));
      confirmData.append("confirm", "1");
      if (cancelReason.trim()) {
        confirmData.append("reason", cancelReason.trim());
      }

      const res = await axios.post(
        `${BASE_URL}/clients/jobs/cancel_booking.php`,
        confirmData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      console.log("[cancel_booking confirm] Response:", res.data);

      if (res.data?.success || res.data?.status === -1) {
        setCancelModalVisible(false);
        setSelectedCancelJob(null);
        setCancelPreviewData(null);
        setCancelReason("");

        const refundInfo = res.data?.refund;
        const currencySym = getCurrencySymbol(refundInfo?.currency);
        const refundMsg =
          refundInfo?.amount !== undefined
            ? ` Refund of ${currencySym}${formatAmount(refundInfo.amount)} is ${refundInfo.status || "processing"}.`
            : "";

        Alert.alert(
          "Booking Cancelled",
          (res.data?.msg || "Your booking has been cancelled successfully.") + refundMsg,
          [{ text: "OK", onPress: () => fetchStatusCards() }]
        );
        fetchStatusCards();
      } else {
        Alert.alert("Cancellation Failed", res.data?.msg || "Unable to cancel this booking.");
      }
    } catch (err: any) {
      console.error("[cancel_booking confirm] Error:", err);
      Alert.alert(
        "Cancellation Error",
        err?.response?.data?.msg || err.message || "Failed to cancel booking. Please try again."
      );
    } finally {
      setIsConfirmingCancel(false);
    }
  };

  const handlePayBooking = async (job: any) => {
    const bookingId = job.booking_id || job.id;
    if (!bookingId) {
      Alert.alert("Error", "Could not find booking ID.");
      return;
    }

    setPayingBookingId(bookingId);
    try {
      const token = await SecureStore.getItemAsync("userToken");
      if (!token) {
        Alert.alert("Login Required", "Please log in to complete your payment.", [
          { text: "Log In", onPress: () => router.push("/login" as any) },
          { text: "Cancel", style: "cancel" },
        ]);
        setPayingBookingId(null);
        return;
      }

      let payment = job.payment;
      let clientSecret =
        payment?.payment_intent_client_secret ||
        payment?.client_secret ||
        job.payment_intent_client_secret ||
        job.client_secret;
      let ephemeralKey = payment?.ephemeral_key || job.ephemeral_key;
      let customerId = payment?.customer_id || job.customer_id;
      let publishableKey =
        payment?.publishable_key ||
        job.publishable_key ||
        STRIPE_PUBLISHABLE_KEY;

      let bookingDetails: any = null;

      // 1. Check get_booking_details.php to get booking fields and any payment data
      if (!clientSecret) {
        try {
          const formData = new FormData();
          formData.append("booking_id", String(bookingId));
          const detailsRes = await axios.post(
            `${BASE_URL}/clients/jobs/get_booking_details.php`,
            formData,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (detailsRes.data?.success && detailsRes.data?.booking) {
            bookingDetails = detailsRes.data.booking;
          }

          if (detailsRes.data?.payment?.payment_intent_client_secret) {
            payment = detailsRes.data.payment;
            clientSecret = payment.payment_intent_client_secret;
            ephemeralKey = payment.ephemeral_key;
            customerId = payment.customer_id;
            if (payment.publishable_key) publishableKey = payment.publishable_key;
          }
        } catch (e) {
          console.warn("[Payment] get_booking_details check:", e);
        }
      }

      // 2. If still no clientSecret, call book_service.php with booking_id and full details
      if (!clientSecret) {
        try {
          const b = bookingDetails || {};
          const bookFormData = new FormData();
          bookFormData.append("booking_id", String(bookingId));
          bookFormData.append("service_id", String(b.service_id || job.service_id || "1"));
          bookFormData.append("area_id", String(b.area_id || "0"));
          bookFormData.append("full_name", String(b.full_name || userData?.full_name || ""));
          bookFormData.append("phone_number", String(b.phone_number || userData?.phone || ""));
          bookFormData.append("notes", String(b.notes || ""));
          bookFormData.append("address_line1", String(b.address_line1 || b.address || ""));
          if (b.address_line2) bookFormData.append("address_line2", String(b.address_line2));
          if (b.address_line3) bookFormData.append("address_line3", String(b.address_line3));
          bookFormData.append("town", String(b.town || "Dublin"));
          if (b.county) bookFormData.append("county", String(b.county));
          if (b.postcode) bookFormData.append("postcode", String(b.postcode));
          bookFormData.append("address", String(b.address || ""));
          bookFormData.append("schedule_type", String(b.schedule_type || "asap"));
          if (b.booking_date) bookFormData.append("booking_date", String(b.booking_date));
          if (b.booking_time) bookFormData.append("booking_time", String(b.booking_time));
          bookFormData.append("stripe_version", "2020-08-27");
          bookFormData.append("terms_accepted", "1");
          bookFormData.append("terms_version", "2026-09");

          const bookRes = await axios.post(
            `${BASE_URL}/clients/jobs/book_service.php`,
            bookFormData,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          console.log("[Payment] book_service retry response:", bookRes.data);

          if (bookRes.data?.payment?.payment_intent_client_secret) {
            payment = bookRes.data.payment;
            clientSecret = payment.payment_intent_client_secret;
            ephemeralKey = payment.ephemeral_key;
            customerId = payment.customer_id;
            if (payment.publishable_key) publishableKey = payment.publishable_key;
          }
        } catch (e) {
          console.warn("[Payment] book_service prepare payment error:", e);
        }
      }

      if (!clientSecret) {
        router.push({
          pathname: "/user-job/[id]",
          params: { id: bookingId },
        });
        setPayingBookingId(null);
        return;
      }

      if (publishableKey) {
        await initStripe({
          publishableKey,
          merchantIdentifier: "merchant.com.john_1050.ibb",
          urlScheme: "ibb",
        });
      }

      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: "Fixaplex",
        customerId: customerId ? String(customerId) : undefined,
        customerEphemeralKeySecret: ephemeralKey ? String(ephemeralKey) : undefined,
        allowsDelayedPaymentMethods: true,
        returnURL: "ibb://stripe-redirect",
      });

      if (initError) {
        console.error("[Stripe] initPaymentSheet error:", initError);
        Alert.alert("Payment Error", initError.message || "Failed to initialize payment sheet.");
        setPayingBookingId(null);
        return;
      }

      setPayingBookingId(null);

      const { error: presentError } = await presentPaymentSheet();
      if (presentError) {
        if (presentError.code === "Canceled") {
          Alert.alert(
            "Payment Incomplete",
            "Your booking is saved in pending status. You can tap 'Pay Deposit' at any time to confirm it."
          );
        } else {
          Alert.alert("Payment Failed", presentError.message || "Could not complete payment.");
        }
        return;
      }

      Alert.alert(
        "Payment Successful",
        "Your deposit payment has been confirmed! We will now find a technician for your booking.",
        [{ text: "OK", onPress: () => fetchStatusCards() }]
      );
      fetchStatusCards();
    } catch (err: any) {
      console.error("Failed to process payment:", err);
      Alert.alert("Payment Error", err.response?.data?.msg || err.message || "Failed to process payment.");
      setPayingBookingId(null);
    }
  };

  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const resetBooking = useBookingStore(state => state.reset);
  const setServiceId = useBookingStore(state => state.setServiceId);
  const setCategoryInfo = useBookingStore(state => state.setCategoryInfo);
  const setPriceEstimate = useBookingStore(state => state.setPriceEstimate);

  const displayName = userData?.full_name?.split(' ')[0] || guestId || 'Guest244444';

  const fetchStatusCards = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) return;
      const res = await axios.post(`${BASE_URL}/clients/home/status_cards.php`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('--- STATUS CARDS RESPONSE ---', res.data);

      if (res.data && Array.isArray(res.data.cards)) {
        setActiveJobs(res.data.cards);
      } else if (res.data && Array.isArray(res.data.data)) {
        setActiveJobs(res.data.data);
      } else if (Array.isArray(res.data)) {
        setActiveJobs(res.data);
      } else {
        setActiveJobs([]);
      }
    } catch (err) {
      console.error("Failed to fetch active jobs:", err);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) return;
      const res = await axios.post(`${BASE_URL}/clients/notifications/get_notifications.php`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data && res.data.success) {
        setUnreadCount(res.data.unread_count || 0);
      }
    } catch (err) {
      console.error("Failed to fetch unread count", err);
    }
  };

  useEffect(() => {
    fetchStatusCards();
  }, [userData]);

  useFocusEffect(
    useCallback(() => {
      fetchUnreadCount();
    }, [])
  );

  const fetchDefaultServices = async () => {
    try {
      setLoading(true);
      const res = await axios.post(`${BASE_URL}/clients/home/categories.php`);
      console.log("Categories response:", JSON.stringify(res.data).slice(0, 200));
      if (res.data.success) {
        setServices(res.data.categories || []);
      }
    } catch (err) {
      console.warn("Failed to fetch default categories:", err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchStatusCards(),
        fetchUnreadCount(),
        fetchDefaultServices(),
      ]);
    } catch (err) {
      console.warn("Error during pull-to-refresh:", err);
    } finally {
      setRefreshing(false);
    }
  }, [userData]);

  useEffect(() => {

    const searchServices = async (query: string) => {
      console.log(`[searchServices] STARTING search for query: "${query}"`);
      try {
        setLoading(true);
        const formData = new FormData();
        formData.append("query", query);
        const res = await axios.post(`${BASE_URL}/clients/home/search_category.php`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        console.log(`[searchServices] RAW RESPONSE for "${query}":`, JSON.stringify(res.data));

        if (res.data.success) {
          const matchedCategories = res.data.categories || res.data.data || [];
          console.log(`[searchServices] SETTING SERVICES TO ${matchedCategories.length} categories.`);
          setServices(matchedCategories);
        } else {
          console.log(`[searchServices] SUCCESS = FALSE. Msg:`, res.data.msg);
        }
      } catch (err: any) {
        console.error("[searchServices] FAILED:", err?.response?.data || err.message);
      } finally {
        setLoading(false);
      }
    };

    if (searchQuery.trim().length > 0) {
      const timeoutId = setTimeout(() => {
        searchServices(searchQuery);
      }, 500); // 500ms debounce
      return () => clearTimeout(timeoutId);
    } else {
      fetchDefaultServices();
    }
  }, [searchQuery]);

  const getCategoryIconDetails = (_categoryId?: string) => {
    return { icon: <FontAwesome5 name="tools" size={26} color="#9333ea" />, bg: "#F3E8FF" };
  };

  const handleRoleToggle = () => {
    if (String(userData?.type) === '3') {
      router.push("/tech-onboarding" as any);
    } else {
      setRole('technician');
      router.replace("/(technician-tabs)" as any);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[styles.container, { flexGrow: 1 }]}
        showsVerticalScrollIndicator={false}
        alwaysBounceVertical={true}
        bounces={true}
        overScrollMode="always"
        nestedScrollEnabled={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#1A6B6B"]}
            tintColor="#1A6B6B"
            progressViewOffset={Platform.OS === 'android' ? 20 : 0}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greetingPrompt}>{getGreeting()},</Text>
            <View style={styles.nameRow}>
              <Text style={styles.greetingName}>{displayName}</Text>
              <Text style={styles.wavingHand}> 👋</Text>
            </View>
            <Text style={styles.greetingSubtitle}>How can we help you?</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.toggleButton} onPress={handleRoleToggle}>
              <Ionicons name="construct-outline" size={24} color="#1A6B6B" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.notificationIcon} onPress={() => router.push("/notifications" as any)}>
              <Ionicons name="notifications-outline" size={24} color="#1f2937" />
              {unreadCount > 0 && <View style={styles.notificationBadge} />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Dynamic Status Cards (Sliding from Right) if any active jobs */}
        {activeJobs && activeJobs.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            nestedScrollEnabled={true}
            contentContainerStyle={styles.statusCardsContainer}
          >
            {activeJobs.map((job, index) => {
              const statusNum = Number(job.status);
              const techName = job.technician?.name;

              const isCancelled =
                statusNum === -1 ||
                String(job.status) === "-1" ||
                job.title?.toLowerCase().includes("cancelled") ||
                job.status_label?.toLowerCase().includes("cancelled");

              if (isCancelled) {
                return null;
              }

              const isPaymentPending =
                statusNum !== 4 &&
                String(job.payment_status).toLowerCase() !== "refunded" &&
                (job.title?.toLowerCase().includes("payment") ||
                  job.message?.toLowerCase().includes("pay") ||
                  job.payment_status === "unpaid" ||
                  job.payment_status === "0" ||
                  job.is_paid === 0 ||
                  job.is_paid === "0" ||
                  job.payment?.required ||
                  job.action === "payment" ||
                  job.stage === "payment" ||
                  job.stage === "deposit");

              if (isPaymentPending) {
                const matchAmount =
                  job.message?.match(/€\s*([\d.]+)/) ||
                  job.message?.match(/EUR\s*([\d.]+)/);
                const depositAmt =
                  job.deposit_amount ||
                  job.amount ||
                  job.payment?.amount ||
                  (matchAmount ? matchAmount[1] : "25.00");
                const payBtnText = depositAmt ? `Pay €${depositAmt} Deposit` : "Pay Deposit";
                const isCurrentJobPaying = payingBookingId === (job.booking_id || job.id);

                return (
                  <View key={index} style={[styles.searchingBanner, { width: 310, marginRight: 16, marginBottom: 0 }]}>
                    <View style={styles.bannerTagRow}>
                      <View style={styles.actionRequiredHomeTag}>
                        <Text style={styles.actionRequiredHomeText}>ACTION REQUIRED</Text>
                      </View>
                    </View>
                    <Text style={styles.searchingBannerTitle}>{job.title || "Payment Not Completed"}</Text>
                    <Text style={styles.searchingBannerSubtitle}>
                      {job.message || "Your booking is not confirmed yet. Pay the booking charge to confirm it and we will start looking for a technician."}
                    </Text>

                    <TouchableOpacity
                      style={styles.payDepositBtn}
                      onPress={() => handlePayBooking(job)}
                      disabled={isCurrentJobPaying}
                      activeOpacity={0.85}
                    >
                      {isCurrentJobPaying ? (
                        <ActivityIndicator size="small" color="#1A6B6B" />
                      ) : (
                        <>
                          <Ionicons name="card" size={16} color="#1A6B6B" style={{ marginRight: 6 }} />
                          <Text style={styles.payDepositBtnText}>{payBtnText}</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              }

              const isFindingTech =
                statusNum === 0 ||
                (!techName &&
                  (job.title?.toLowerCase().includes("technician") ||
                    job.title?.toLowerCase().includes("finding") ||
                    job.title?.toLowerCase().includes("looking")));

              if (isFindingTech) {
                const currentJobId = job.booking_id || job.id;
                const isCancellingThis = loadingCancelJobId === currentJobId;

                return (
                  <View key={index} style={[styles.searchingBanner, { width: 310, marginRight: 16, marginBottom: 0 }]}>
                    <Text style={styles.searchingBannerTitle}>{job.title || "Looking for a Technician"}</Text>
                    <Text style={styles.searchingBannerSubtitle}>
                      {job.message || "We'll notify you as soon as someone is matched."}
                    </Text>

                    <View style={styles.bannerActionsRow}>
                      <TouchableOpacity
                        style={styles.cancelBannerBtn}
                        onPress={() => handleInitiateCancel(job)}
                        disabled={isCancellingThis}
                        activeOpacity={0.8}
                      >
                        {isCancellingThis ? (
                          <ActivityIndicator size="small" color="#DC2626" />
                        ) : (
                          <>
                            <Ionicons name="close-circle-outline" size={15} color="#DC2626" style={{ marginRight: 6 }} />
                            <Text style={styles.cancelBannerBtnText}>Cancel Booking</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              } else if (statusNum === 1) {
                return (
                  <View key={index} style={[styles.foundBanner, { width: 300, marginRight: 16, marginBottom: 0 }]}>
                    <Text style={styles.searchingBannerTitle}>{job.title || "Booking Update"}</Text>
                    {techName ? (
                      <Text style={[styles.searchingBannerSubtitle, { marginBottom: 4, fontFamily: 'Lato-Bold', color: '#7DD3FC' }]}>
                        Technician: {techName}
                      </Text>
                    ) : null}
                    <Text style={[styles.searchingBannerSubtitle, { marginBottom: 8 }]}>{job.message}</Text>
                  </View>
                );
              } else if (statusNum === 8 || job.stage === 'confirm_completion') {
                return (
                  <View key={index} style={[styles.completionBanner, { width: 310, marginRight: 16, marginBottom: 0 }]}>
                    <View style={styles.bannerTagRow}>
                      <View style={styles.actionRequiredHomeTag}>
                        <Text style={styles.actionRequiredHomeText}>ACTION REQUIRED</Text>
                      </View>
                    </View>
                    <Text style={styles.completionBannerTitle}>
                      {job.title || "Work Finished — Sign Off"}
                    </Text>
                    {techName ? (
                      <Text style={[styles.searchingBannerSubtitle, { marginBottom: 4, fontFamily: 'Lato-Bold', color: '#166534' }]}>
                        Technician: {techName}
                      </Text>
                    ) : null}
                    <Text style={[styles.completionBannerSubtitle, { marginBottom: 12 }]}>
                      {job.message || "Technician finished work. Please review and sign off to release payment."}
                    </Text>
                    <TouchableOpacity
                      style={styles.confirmCompletionHomeBtn}
                      onPress={() => router.push({
                        pathname: "/user-job/[id]",
                        params: { id: job.booking_id || job.id || 1 }
                      })}
                    >
                      <Ionicons name="checkmark-circle" size={18} color="#ffffff" style={{ marginRight: 6 }} />
                      <Text style={styles.confirmCompletionHomeBtnText}>Review & Sign Off</Text>
                    </TouchableOpacity>
                  </View>
                );
              } else if (job.stage === 'additional_quote_review' || (statusNum === 3 && job.quote)) {
                const quoteAmt = job.quote?.amount;
                return (
                  <View key={index} style={[styles.quoteBanner, { width: 310, marginRight: 16, marginBottom: 0 }]}>
                    <View style={styles.bannerTagRow}>
                      <View style={styles.quoteReviewHomeTag}>
                        <Text style={styles.quoteReviewHomeText}>QUOTE REVIEW</Text>
                      </View>
                    </View>
                    <Text style={styles.quoteBannerTitle}>
                      {job.title || "Additional Work Quoted"}
                    </Text>
                    {quoteAmt ? (
                      <Text style={styles.quoteAmountHomeText}>Extra: €{quoteAmt}</Text>
                    ) : null}
                    <Text style={[styles.quoteBannerSubtitle, { marginBottom: 12 }]}>
                      {job.message || "Your technician requested approval for additional work."}
                    </Text>
                    <TouchableOpacity
                      style={styles.reviewQuoteHomeBtn}
                      onPress={() => router.push({
                        pathname: "/user-job/[id]",
                        params: {
                          id: job.booking_id || job.id || 1,
                          quote_id: job.quote?.quote_id || job.quote?.id,
                          quote_amount: job.quote?.amount,
                          quote_reason: job.quote?.reason,
                        }
                      })}
                    >
                      <Ionicons name="receipt-outline" size={18} color="#92400e" style={{ marginRight: 6 }} />
                      <Text style={styles.reviewQuoteHomeBtnText}>Review Quote</Text>
                    </TouchableOpacity>
                  </View>
                );
              } else {
                const assignedTitle = job.service_name
                  ? `We have found you a technician for your ${job.service_name}`
                  : (job.title || "We've found a technician for you");

                return (
                  <View key={index} style={[styles.foundBanner, { width: 300, marginRight: 16, marginBottom: 0 }]}>
                    <Text style={styles.searchingBannerTitle}>{assignedTitle}</Text>
                    {techName ? (
                      <Text style={[styles.searchingBannerSubtitle, { marginBottom: 4, fontFamily: 'Lato-Bold', color: '#7DD3FC' }]}>
                        Technician: {techName}
                      </Text>
                    ) : null}
                    {job.message ? (
                      <Text style={[styles.searchingBannerSubtitle, { marginBottom: 8 }]}>{job.message}</Text>
                    ) : null}
                    <TouchableOpacity
                      style={styles.confirmBookingBtn}
                      onPress={() => router.push({
                        pathname: "/user-job/[id]",
                        params: { id: job.booking_id || job.id || 1 }
                      })}
                    >
                      <Text style={styles.confirmBookingText}>View Details</Text>
                    </TouchableOpacity>
                  </View>
                );
              }
            })}
          </ScrollView>
        )}

        {/* Categories Grid (Image 3) */}
        <View style={styles.grid}>
          {loading ? (
            <ActivityIndicator size="large" color="#1A6B6B" style={{ marginVertical: 40, width: '100%' }} />
          ) : services.length > 0 ? (
            services.map((service) => {
              const { icon, bg } = getCategoryIconDetails(service.id?.toString());
              return (
                <TouchableOpacity
                  key={service.id}
                  style={styles.card}
                  activeOpacity={0.8}
                  onPress={() => {
                    if (service.min_price) {
                      resetBooking();
                      setServiceId(service.id.toString());
                      setCategoryInfo(service.category_id?.toString() || service.id.toString(), service.name);
                      setPriceEstimate(service.min_price?.toString() || '', service.max_price?.toString() || '');
                      router.push("/booking/details");
                    } else {
                      router.push({
                        pathname: "/category/[id]",
                        params: { id: service.id, name: service.name }
                      });
                    }
                  }}
                >
                  <View style={[styles.iconContainer, { backgroundColor: bg }]}>
                    {icon}
                  </View>
                  <Text style={styles.cardTitle}>{service.name}</Text>
                  <Text style={styles.cardSubtitle} numberOfLines={2}>{service.description}</Text>
                  {service.min_price ? (
                    <Text style={styles.priceRange}>€{service.min_price} - €{service.max_price}</Text>
                  ) : null}
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={{ width: '100%', alignItems: 'center', marginVertical: 12 }}>
              <Text style={styles.noServicesText}>No services found.</Text>
              <TouchableOpacity
                style={styles.retryServicesBtn}
                onPress={fetchDefaultServices}
                activeOpacity={0.7}
              >
                <Ionicons name="reload" size={15} color="#1A6B6B" style={{ marginRight: 6 }} />
                <Text style={styles.retryServicesBtnText}>Tap to reload services</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* OR Divider (Image 3) */}
        <View style={styles.orDividerContainer}>
          <View style={styles.orLine} />
          <Text style={styles.orText}>OR</Text>
          <View style={styles.orLine} />
        </View>

        {/* Describe your issue Banner (Image 3) */}
        <TouchableOpacity
          style={styles.describeCard}
          activeOpacity={0.85}
          onPress={() => {
            resetBooking();
            setServiceId("0");
            setCategoryInfo("0", "General Request");
            router.push("/booking/details" as any);
          }}
        >
          <View style={styles.describeTextContainer}>
            <Text style={styles.describeTitle}>Not sure which service you need?</Text>
            <Text style={styles.describeSubtitle}>
              Tell us what is happening and we'll help match you with the appropriate technician
            </Text>
          </View>
          <View style={styles.describeButton}>
            <Ionicons name="pencil" size={20} color="#ffffff" />
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* Cancellation Preview & Confirmation Modal */}
      <Modal
        visible={cancelModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          if (!isConfirmingCancel) {
            setCancelModalVisible(false);
          }
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContentCard}>
              {/* Modal Header */}
              <View style={styles.modalHeaderRow}>
                <View style={styles.modalHeaderIconContainer}>
                  <Ionicons name="alert-circle" size={24} color="#DC2626" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.modalTitle}>Cancel Booking</Text>
                  {cancelPreviewData?.cancellation?.booking_code ? (
                    <Text style={styles.modalCodeText}>
                      Ref: #{cancelPreviewData.cancellation.booking_code}
                    </Text>
                  ) : null}
                </View>
                <TouchableOpacity
                  onPress={() => setCancelModalVisible(false)}
                  disabled={isConfirmingCancel}
                  style={styles.modalCloseBtn}
                >
                  <Ionicons name="close" size={22} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                style={{ maxHeight: 420 }}
                contentContainerStyle={{ paddingBottom: 8 }}
              >
                {/* Subtitle */}
                <Text style={styles.modalSubtitle}>
                  Are you sure you want to cancel this booking? Please review the refund breakdown below before confirming.
                </Text>

                {/* Refund Breakdown Card */}
                {cancelPreviewData?.cancellation && (
                  <View style={styles.breakdownCard}>
                    <View style={styles.breakdownHeader}>
                      <Text style={styles.breakdownHeaderTitle}>Cancellation Breakdown</Text>
                      {cancelPreviewData.cancellation.status_label ? (
                        <View style={styles.statusBadge}>
                          <Text style={styles.statusBadgeText}>
                            {cancelPreviewData.cancellation.status_label}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Paid */}
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>Amount Paid</Text>
                      <Text style={styles.breakdownValue}>
                        {getCurrencySymbol(cancelPreviewData.cancellation.currency)}
                        {formatAmount(cancelPreviewData.cancellation.amount_paid)}
                      </Text>
                    </View>

                    {/* Refund Tier */}
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>Refund Tier</Text>
                      <View style={styles.tierPill}>
                        <Text style={styles.tierPillText}>
                          {cancelPreviewData.cancellation.refund_percent ?? 100}%
                        </Text>
                      </View>
                    </View>

                    {/* Amount Retained */}
                    {Number(cancelPreviewData.cancellation.amount_retained) > 0 && (
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>Fee Retained</Text>
                        <Text style={[styles.breakdownValue, { color: "#DC2626" }]}>
                          -{getCurrencySymbol(cancelPreviewData.cancellation.currency)}
                          {formatAmount(cancelPreviewData.cancellation.amount_retained)}
                        </Text>
                      </View>
                    )}

                    {/* Held Released */}
                    {Number(cancelPreviewData.cancellation.held_released) > 0 && (
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>Hold Released</Text>
                        <Text style={styles.breakdownValue}>
                          {getCurrencySymbol(cancelPreviewData.cancellation.currency)}
                          {formatAmount(cancelPreviewData.cancellation.held_released)}
                        </Text>
                      </View>
                    )}

                    <View style={styles.breakdownDivider} />

                    {/* Estimated Refund Total */}
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownTotalLabel}>Estimated Refund</Text>
                      <Text style={styles.breakdownTotalValue}>
                        {getCurrencySymbol(cancelPreviewData.cancellation.currency)}
                        {formatAmount(cancelPreviewData.cancellation.refund_amount)}
                      </Text>
                    </View>

                    {cancelPreviewData.cancellation.refund_method ? (
                      <View style={[styles.breakdownRow, { marginTop: 6 }]}>
                        <Text style={styles.refundMethodLabel}>Refund Method</Text>
                        <Text style={styles.refundMethodValue}>
                          {cancelPreviewData.cancellation.refund_method}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                )}

                {/* Server Notice Message if any */}
                {cancelPreviewData?.msg ? (
                  <View style={styles.serverNoticeBox}>
                    <Ionicons name="information-circle-outline" size={16} color="#0369A1" style={{ marginRight: 6 }} />
                    <Text style={styles.serverNoticeText}>{cancelPreviewData.msg}</Text>
                  </View>
                ) : null}

                {/* Optional Reason Input */}
                <View style={styles.reasonSection}>
                  <Text style={styles.reasonLabel}>Reason for cancellation (optional):</Text>
                  <TextInput
                    style={styles.reasonInput}
                    placeholder="e.g. Schedule changed, booked by mistake..."
                    placeholderTextColor="#9CA3AF"
                    value={cancelReason}
                    onChangeText={setCancelReason}
                    multiline
                    numberOfLines={3}
                    maxLength={250}
                  />
                </View>
              </ScrollView>

              {/* Action Buttons */}
              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={styles.keepBookingBtn}
                  onPress={() => setCancelModalVisible(false)}
                  disabled={isConfirmingCancel}
                >
                  <Text style={styles.keepBookingBtnText}>Keep Booking</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.confirmCancelBtn}
                  onPress={handleConfirmCancel}
                  disabled={isConfirmingCancel}
                >
                  {isConfirmingCancel ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.confirmCancelBtnText}>Confirm Cancellation</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
    paddingTop: Platform.OS === 'android' ? 40 : 0,
  },
  container: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  headerLeft: {
    flex: 1,
  },
  greetingPrompt: {
    fontSize: 22,
    fontWeight: "bold",
    fontFamily: "DemoOsbert-Bold",
    color: "#1f2937",
    lineHeight: 28,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  greetingName: {
    fontSize: 22,
    fontWeight: "bold",
    fontFamily: "DemoOsbert-Bold",
    color: "#1f2937",
    lineHeight: 28,
  },
  wavingHand: {
    fontSize: 20,
  },
  greetingSubtitle: {
    fontSize: 15,
    fontFamily: "Lato",
    color: "#6b7280",
    marginTop: 6,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 4,
  },
  toggleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E8F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  notificationIcon: {
    padding: 8,
    position: "relative",
  },
  notificationBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  statusCardsContainer: {
    paddingBottom: 20,
    paddingRight: 24,
  },
  searchingBanner: {
    backgroundColor: "#1A6B6B",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    position: "relative",
    overflow: "hidden",
  },
  foundBanner: {
    backgroundColor: "#1A6B6B",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    position: "relative",
    overflow: "hidden",
    alignItems: "flex-start",
  },
  confirmBookingBtn: {
    backgroundColor: "#7DD3FC",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 16,
    marginTop: 12,
  },
  confirmBookingText: {
    color: "#0369A1",
    fontSize: 13,
    fontFamily: "Lato-Bold",
  },
  searchingBannerTitle: {
    color: "#ffffff",
    fontSize: 17,
    fontFamily: "Lato-Bold",
    marginBottom: 6,
    zIndex: 2,
  },
  searchingBannerSubtitle: {
    color: "#ffffff",
    fontSize: 14,
    fontFamily: "Lato",
    lineHeight: 20,
    opacity: 0.95,
    zIndex: 2,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 16,
    marginTop: 8,
  },
  card: {
    width: "47%",
    backgroundColor: "#ffffff",
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f1f5f9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: "DemoOsbert-Bold",
    color: "#1f2937",
    marginBottom: 6,
    textAlign: "center",
  },
  cardSubtitle: {
    fontSize: 12,
    fontFamily: "Lato",
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 16,
  },
  priceRange: {
    fontSize: 13,
    fontFamily: "Lato-Bold",
    color: "#1A6B6B",
    textAlign: "center",
    marginTop: 6,
  },
  orDividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 26,
    width: "100%",
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e5e7eb",
  },
  orText: {
    marginHorizontal: 16,
    fontSize: 13,
    fontFamily: "Lato-Bold",
    color: "#9ca3af",
    letterSpacing: 1,
  },
  describeCard: {
    backgroundColor: "#F0FDFA",
    borderWidth: 1,
    borderColor: "#CCFBF1",
    borderRadius: 16,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  describeTextContainer: {
    flex: 1,
    paddingRight: 14,
  },
  describeTitle: {
    fontSize: 16,
    fontFamily: "Lato-Bold",
    color: "#0f172a",
    marginBottom: 4,
  },
  describeSubtitle: {
    fontSize: 13,
    fontFamily: "Lato",
    color: "#475569",
    lineHeight: 18,
  },
  describeButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#1A6B6B",
    alignItems: "center",
    justifyContent: "center",
  },
  noServicesText: {
    width: "100%",
    textAlign: "center",
    fontFamily: "Lato",
    color: "#6b7280",
    marginTop: 20,
  },
  bannerTagRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  actionRequiredHomeTag: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  actionRequiredHomeText: {
    fontSize: 10,
    fontFamily: "Lato-Bold",
    color: "#166534",
    letterSpacing: 0.5,
  },
  completionBanner: {
    backgroundColor: "#f0fdf4",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    borderColor: "#86efac",
    shadowColor: "#15803d",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  completionBannerTitle: {
    fontSize: 16,
    fontFamily: "Lato-Bold",
    color: "#14532d",
    marginBottom: 4,
  },
  completionBannerSubtitle: {
    fontSize: 13,
    fontFamily: "Lato",
    color: "#166534",
    lineHeight: 18,
  },
  confirmCompletionHomeBtn: {
    flexDirection: "row",
    backgroundColor: "#16a34a",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  confirmCompletionHomeBtnText: {
    color: "#ffffff",
    fontFamily: "Lato-Bold",
    fontSize: 13,
  },
  quoteReviewHomeTag: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  quoteReviewHomeText: {
    fontSize: 10,
    fontFamily: "Lato-Bold",
    color: "#b45309",
    letterSpacing: 0.5,
  },
  quoteBanner: {
    backgroundColor: "#fffbeb",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    borderColor: "#fde68a",
    shadowColor: "#d97706",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  quoteBannerTitle: {
    fontSize: 16,
    fontFamily: "Lato-Bold",
    color: "#92400e",
    marginBottom: 2,
  },
  quoteAmountHomeText: {
    fontSize: 15,
    fontFamily: "DemoOsbert-Bold",
    color: "#d97706",
    marginBottom: 4,
  },
  quoteBannerSubtitle: {
    fontSize: 13,
    fontFamily: "Lato",
    color: "#78350f",
    lineHeight: 18,
  },
  reviewQuoteHomeBtn: {
    flexDirection: "row",
    backgroundColor: "#fef3c7",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fde68a",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  reviewQuoteHomeBtnText: {
    color: "#92400e",
    fontFamily: "Lato-Bold",
    fontSize: 13,
  },
  payDepositBtn: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 14,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  payDepositBtnText: {
    color: "#1A6B6B",
    fontSize: 13,
    fontFamily: "Lato-Bold",
  },
  retryServicesBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F5F5",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 10,
  },
  retryServicesBtnText: {
    color: "#1A6B6B",
    fontFamily: "Lato-Bold",
    fontSize: 13,
  },
  bannerActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    gap: 10,
    zIndex: 2,
    flexWrap: "wrap",
  },
  cancelBannerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  cancelBannerBtnText: {
    color: "#DC2626",
    fontSize: 13,
    fontFamily: "Lato-Bold",
  },
  modalOverlay: {
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContentCard: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  modalHeaderIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: "Lato-Bold",
    color: "#111827",
  },
  modalCodeText: {
    fontSize: 12,
    fontFamily: "Lato",
    color: "#6B7280",
    marginTop: 1,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    fontFamily: "Lato",
    color: "#4B5563",
    lineHeight: 18,
    marginBottom: 14,
  },
  breakdownCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    marginBottom: 14,
  },
  breakdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  breakdownHeaderTitle: {
    fontSize: 13,
    fontFamily: "Lato-Bold",
    color: "#334155",
  },
  statusBadge: {
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontFamily: "Lato-Bold",
    color: "#0369A1",
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  breakdownLabel: {
    fontSize: 13,
    fontFamily: "Lato",
    color: "#64748B",
  },
  breakdownValue: {
    fontSize: 13,
    fontFamily: "Lato-Bold",
    color: "#1E293B",
  },
  tierPill: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tierPillText: {
    fontSize: 12,
    fontFamily: "Lato-Bold",
    color: "#15803D",
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 8,
  },
  breakdownTotalLabel: {
    fontSize: 14,
    fontFamily: "Lato-Bold",
    color: "#0F172A",
  },
  breakdownTotalValue: {
    fontSize: 17,
    fontFamily: "Lato-Bold",
    color: "#16A34A",
  },
  refundMethodLabel: {
    fontSize: 11,
    fontFamily: "Lato",
    color: "#94A3B8",
  },
  refundMethodValue: {
    fontSize: 11,
    fontFamily: "Lato-Bold",
    color: "#64748B",
    textTransform: "capitalize",
  },
  serverNoticeBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  serverNoticeText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Lato",
    color: "#0369A1",
    lineHeight: 16,
  },
  reasonSection: {
    marginBottom: 16,
  },
  reasonLabel: {
    fontSize: 12,
    fontFamily: "Lato-Bold",
    color: "#374151",
    marginBottom: 6,
  },
  reasonInput: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    fontFamily: "Lato",
    color: "#111827",
    textAlignVertical: "top",
    minHeight: 65,
  },
  modalBtnRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 8,
  },
  keepBookingBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  keepBookingBtnText: {
    fontSize: 14,
    fontFamily: "Lato-Bold",
    color: "#374151",
  },
  confirmCancelBtn: {
    flex: 1.3,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  confirmCancelBtnText: {
    fontSize: 14,
    fontFamily: "Lato-Bold",
    color: "#ffffff",
  },
});
