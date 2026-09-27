import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Linking
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStripe, initStripe } from "@stripe/stripe-react-native";
import { BASE_URL, IMAGE_BASE_URL, STRIPE_PUBLISHABLE_KEY } from "../../config/api";

export default function BookingDetails() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, quote_id, quote_amount, quote_reason } = useLocalSearchParams();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<any>(null);
  const [statusCard, setStatusCard] = useState<any>(null);

  // Actions state
  const [actionLoading, setActionLoading] = useState(false);
  const [declineModalVisible, setDeclineModalVisible] = useState(false);
  const [zoomModalVisible, setZoomModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [declineType, setDeclineType] = useState<'tech' | 'price' | 'quote' | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | number | null>(null);
  const [priceDecisions, setPriceDecisions] = useState<Record<string, 'accept' | 'decline'>>({});
  const [additionalQuoteDecisions, setAdditionalQuoteDecisions] = useState<Record<string, 'accept' | 'decline'>>({});

  const fetchBookingDetails = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) return;

      let resolvedBookingId = id as string;
      if (id && isNaN(Number(id))) {
        try {
          const cardsRes = await axios.post(`${BASE_URL}/clients/home/status_cards.php`, {}, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const list = cardsRes.data?.cards || cardsRes.data?.data || cardsRes.data || [];
          const match = Array.isArray(list) ? list.find((c: any) =>
            String(c.booking_code || '').toUpperCase() === String(id).toUpperCase() ||
            String(c.booking_id || c.id) === String(id)
          ) : null;
          if (match) {
            resolvedBookingId = String(match.booking_id || match.id);
          }
        } catch (e) {}
      }

      const formData = new FormData();
      formData.append('booking_id', resolvedBookingId);

      const [detailsRes, cardsRes] = await Promise.all([
        axios.post(`${BASE_URL}/clients/jobs/get_booking_details.php`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }),
        axios.post(`${BASE_URL}/clients/home/status_cards.php`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch((err) => {
          console.warn("Could not fetch status cards:", err);
          return { data: null };
        })
      ]);

      console.log('client job detail', detailsRes.data);

      if (detailsRes.data && detailsRes.data.success) {
        setDetails(detailsRes.data);

        // Populate decisions from server or local SecureStore
        const serverPriceDecisions: Record<string, 'accept' | 'decline'> = {};
        if (Array.isArray(detailsRes.data.assignedTechs)) {
          detailsRes.data.assignedTechs.forEach((t: any) => {
            const dec = t.price_decision || 
              (String(t.price_status) === '1' || String(t.price_status) === 'accepted' ? 'accept' : 
               String(t.price_status) === '2' || String(t.price_status) === 'declined' ? 'decline' : null) ||
              (String(t.quote_status) === '1' || String(t.quote_status) === 'accepted' ? 'accept' : 
               String(t.quote_status) === '2' || String(t.quote_status) === 'declined' ? 'decline' : null);
            if (dec) serverPriceDecisions[String(t.id)] = dec as 'accept' | 'decline';
          });
        }
        try {
          const storedPrice = await SecureStore.getItemAsync(`quote_decisions_${id}`);
          if (storedPrice) {
            Object.assign(serverPriceDecisions, JSON.parse(storedPrice));
          }
        } catch (e) {}
        setPriceDecisions(prev => ({ ...serverPriceDecisions, ...prev }));

        try {
          const storedAdd = await SecureStore.getItemAsync(`add_quote_decisions_${id}`);
          if (storedAdd) {
            setAdditionalQuoteDecisions(prev => ({ ...JSON.parse(storedAdd), ...prev }));
          }
        } catch (e) {}
      } else {
        Alert.alert("Error", detailsRes.data?.msg || "Could not fetch booking details");
      }

      if (cardsRes?.data) {
        const cardsList = Array.isArray(cardsRes.data.cards)
          ? cardsRes.data.cards
          : Array.isArray(cardsRes.data.data)
          ? cardsRes.data.data
          : Array.isArray(cardsRes.data)
          ? cardsRes.data
          : [];
        const match = cardsList.find((c: any) => String(c.booking_id || c.id) === String(id));
        if (match) {
          console.log('[statusCard] Matched active card for booking:', match);
          setStatusCard(match);
        }
      }
    } catch (err) {
      console.error("Failed to fetch booking details:", err);
      Alert.alert("Error", "A network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchBookingDetails();
    }
  }, [id]);

  const handlePayDeposit = async () => {
    try {
      setActionLoading(true);
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) {
        Alert.alert("Login Required", "Please log in to complete your payment.");
        setActionLoading(false);
        return;
      }

      let payment = details?.payment || statusCard?.payment;
      let clientSecret =
        payment?.payment_intent_client_secret ||
        payment?.client_secret;
      let ephemeralKey = payment?.ephemeral_key;
      let customerId = payment?.customer_id;
      let publishableKey = payment?.publishable_key || STRIPE_PUBLISHABLE_KEY;

      if (!clientSecret) {
        const b = booking || {};
        const bookFormData = new FormData();
        bookFormData.append("booking_id", String(id));
        bookFormData.append("service_id", String(b.service_id || "1"));
        bookFormData.append("area_id", String(b.area_id || "0"));
        bookFormData.append("full_name", String(b.full_name || ""));
        bookFormData.append("phone_number", String(b.phone_number || ""));
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

        if (bookRes.data?.payment?.payment_intent_client_secret) {
          payment = bookRes.data.payment;
          clientSecret = payment.payment_intent_client_secret;
          ephemeralKey = payment.ephemeral_key;
          customerId = payment.customer_id;
          if (payment.publishable_key) publishableKey = payment.publishable_key;
        }
      }

      if (!clientSecret) {
        Alert.alert("Error", "Could not prepare payment for this booking.");
        setActionLoading(false);
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
        Alert.alert("Payment Error", initError.message || "Failed to initialize payment sheet.");
        setActionLoading(false);
        return;
      }

      setActionLoading(false);

      const { error: presentError } = await presentPaymentSheet();
      if (presentError) {
        if (presentError.code === "Canceled") {
          Alert.alert(
            "Payment Incomplete",
            "Your booking is saved in pending status. You can complete the deposit at any time."
          );
        } else {
          Alert.alert("Payment Failed", presentError.message || "Could not complete payment.");
        }
        return;
      }

      Alert.alert(
        "Payment Successful",
        "Your deposit payment has been confirmed! We will now find a technician for your booking.",
        [{ text: "OK", onPress: () => fetchBookingDetails() }]
      );
      fetchBookingDetails();
    } catch (err: any) {
      console.error("Failed to process deposit payment:", err);
      Alert.alert("Payment Error", err.response?.data?.msg || err.message || "Failed to process payment.");
      setActionLoading(false);
    }
  };

  // Handle Technician acceptance/rejection and Price Quote acceptance/rejection (Status 2 and 7)
  const handleConfirm = async (type: 'tech' | 'price', decision: 'accept' | 'decline', assignmentId: string, reason?: string) => {
    try {
      setActionLoading(true);
      const token = await SecureStore.getItemAsync('userToken');
      const formData = new FormData();
      formData.append('assignment_id', assignmentId);
      formData.append('decision', decision);
      if (reason) formData.append('reason', reason);
      if (type === 'price') {
        formData.append('stripe_version', '2020-08-27');
      }

      const endpoint = type === 'tech' ? 'confirm_technician.php' : 'confirm_price.php';
      const res = await axios.post(`${BASE_URL}/clients/jobs/${endpoint}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      console.log('the output', res.data);

      if (res.data?.success) {
        // If price accepted and backend requires card hold authorization
        if (type === 'price' && decision === 'accept' && res.data?.payment?.required) {
          const payment = res.data.payment;
          const clientSecret = payment.payment_intent_client_secret || payment.client_secret;
          if (clientSecret) {
            const pubKey = payment.publishable_key || payment.publishableKey;
            if (pubKey) {
              await initStripe({
                publishableKey: pubKey,
                merchantIdentifier: "merchant.com.john_1050.ibb",
                urlScheme: "ibb",
              });
            }
            const { error: initError } = await initPaymentSheet({
              paymentIntentClientSecret: clientSecret,
              merchantDisplayName: "Fixaplex",
              customerId: payment.customer_id ? String(payment.customer_id) : undefined,
              customerEphemeralKeySecret: payment.ephemeral_key ? String(payment.ephemeral_key) : undefined,
              allowsDelayedPaymentMethods: true,
              returnURL: "ibb://stripe-redirect",
            });

            if (initError) {
              Alert.alert("Payment Error", initError.message || "Failed to initialize payment sheet.");
              return;
            }

            const { error: presentError } = await presentPaymentSheet();
            if (presentError) {
              Alert.alert("Payment Notice", presentError.message || "Price quote card hold was not completed.");
              return;
            }
          }
        }

        if (type === 'price') {
          const updated = { ...priceDecisions, [String(assignmentId)]: decision };
          setPriceDecisions(updated);
          try {
            await SecureStore.setItemAsync(`quote_decisions_${id}`, JSON.stringify(updated));
          } catch (e) {}
        }

        Alert.alert("Success", res.data?.msg || "Action completed successfully.");
        setDeclineModalVisible(false);
        setDeclineReason("");
        fetchBookingDetails(); // Refresh details to show updated status
      } else {
        Alert.alert("Error", res.data?.msg || "Failed to process request.");
      }
    } catch (err: any) {
      console.error(err);
      Alert.alert("Error", err?.response?.data?.msg || "A network error occurred.");
    } finally {
      setActionLoading(false);
    }
  };

  // POST /clients/jobs/confirm_additional_quote.php (Images 1 & 2)
  const handleConfirmAdditionalQuote = async (
    quoteId: number | string,
    decision: 'accept' | 'decline',
    reason?: string
  ) => {
    try {
      setActionLoading(true);
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) return;

      const formData = new FormData();
      formData.append('quote_id', String(quoteId));
      formData.append('decision', decision);
      if (reason) formData.append('reason', reason);
      formData.append('stripe_version', '2020-08-27');

      console.log('[confirm_additional_quote] Submitting...', { quoteId, decision, reason });
      const res = await axios.post(`${BASE_URL}/clients/jobs/confirm_additional_quote.php`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('[confirm_additional_quote] Response:', res.data);

      if (res.data?.success === false) {
        Alert.alert("Error", res.data?.msg || "Failed to process additional quote.");
        return;
      }

      if (decision === 'decline') {
        const updated = { ...additionalQuoteDecisions, [String(quoteId)]: 'decline' as const };
        setAdditionalQuoteDecisions(updated);
        try {
          await SecureStore.setItemAsync(`add_quote_decisions_${id}`, JSON.stringify(updated));
        } catch (e) {}

        Alert.alert(
          "Quote Declined",
          res.data?.msg || "The additional quote has been declined. The technician will continue with the original work."
        );
        setDeclineModalVisible(false);
        setDeclineReason("");
        setSelectedQuoteId(null);
        fetchBookingDetails();
        return;
      }

      // Decision is 'accept': hold extra amount on card
      const payment = res.data?.payment;
      if (payment && payment.required) {
        const clientSecret = payment.payment_intent_client_secret || payment.client_secret;
        if (clientSecret) {
          const pubKey = payment.publishable_key || payment.publishableKey;
          if (pubKey) {
            await initStripe({
              publishableKey: pubKey,
              merchantIdentifier: "merchant.com.john_1050.ibb",
              urlScheme: "ibb",
            });
          }
          console.log('[Stripe] Initializing Payment Sheet for additional quote hold...');
          const { error: initError } = await initPaymentSheet({
            paymentIntentClientSecret: clientSecret,
            merchantDisplayName: "Fixaplex",
            customerId: payment.customer_id ? String(payment.customer_id) : undefined,
            customerEphemeralKeySecret: payment.ephemeral_key ? String(payment.ephemeral_key) : undefined,
            allowsDelayedPaymentMethods: true,
            returnURL: "ibb://stripe-redirect",
          });

          if (initError) {
            Alert.alert("Payment Error", initError.message || "Failed to initialize payment sheet.");
            return;
          }

          const { error: presentError } = await presentPaymentSheet();
          if (presentError) {
            if (presentError.code === "Canceled") {
              Alert.alert(
                "Hold Incomplete",
                "The card hold for the additional quote was canceled. You can try accepting it again."
              );
            } else {
              Alert.alert("Payment Error", presentError.message || "Could not authorize card hold.");
            }
            return;
          }

          Alert.alert(
            "Quote Accepted",
            "The additional quote has been approved! The extra amount is held on your card and will be captured at final sign-off."
          );
          fetchBookingDetails();
          return;
        }
      }

      const updated = { ...additionalQuoteDecisions, [String(quoteId)]: 'accept' as const };
      setAdditionalQuoteDecisions(updated);
      try {
        await SecureStore.setItemAsync(`add_quote_decisions_${id}`, JSON.stringify(updated));
      } catch (e) {}

      Alert.alert("Quote Accepted", res.data?.msg || "Additional quote accepted successfully.");
      fetchBookingDetails();
    } catch (err: any) {
      console.error('[confirm_additional_quote] Error:', err);
      Alert.alert("Error", err?.response?.data?.msg || "A network error occurred.");
    } finally {
      setActionLoading(false);
    }
  };

  // POST /clients/jobs/confirm_completion.php (Images 3 & 4)
  const handleConfirmCompletion = async (bookingId: number | string) => {
    try {
      setActionLoading(true);
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) return;

      const formData = new FormData();
      formData.append('booking_id', String(bookingId));
      formData.append('stripe_version', '2020-08-27');

      console.log('[confirm_completion] Submitting for booking:', bookingId);
      const res = await axios.post(`${BASE_URL}/clients/jobs/confirm_completion.php`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('[confirm_completion] Response:', res.data);

      if (res.data?.success === false) {
        Alert.alert(
          "Unable to Sign Off",
          res.data?.msg || "The job could not be completed. The balance was not authorised."
        );
        return;
      }

      const payment = res.data?.payment;
      const newStatus = Number(res.data?.status);

      // Outcome: Status 8 with payment.required = true and reason = authorisation_expired
      if (newStatus === 8 && payment?.required && payment?.reason === 'authorisation_expired') {
        const clientSecret = payment.payment_intent_client_secret || payment.client_secret;
        if (clientSecret) {
          Alert.alert(
            "Payment Authorization Expired",
            "The previous card hold expired. Please authorize payment to sign off the job.",
            [
              {
                text: "Authorize Payment",
                onPress: async () => {
                  const pubKey = payment.publishable_key || payment.publishableKey;
                  if (pubKey) {
                    await initStripe({
                      publishableKey: pubKey,
                      merchantIdentifier: "merchant.com.john_1050.ibb",
                      urlScheme: "ibb",
                    });
                  }
                  const { error: initError } = await initPaymentSheet({
                    paymentIntentClientSecret: clientSecret,
                    merchantDisplayName: "Fixaplex",
                    customerId: payment.customer_id ? String(payment.customer_id) : undefined,
                    customerEphemeralKeySecret: payment.ephemeral_key ? String(payment.ephemeral_key) : undefined,
                    allowsDelayedPaymentMethods: true,
                    returnURL: "ibb://stripe-redirect",
                  });

                  if (initError) {
                    Alert.alert("Payment Error", initError.message || "Failed to initialize payment sheet.");
                    return;
                  }

                  const { error: presentError } = await presentPaymentSheet();
                  if (presentError) {
                    Alert.alert("Payment Incomplete", presentError.message || "Payment authorization was not completed.");
                    return;
                  }

                  // After paying the new charge, call confirm_completion again
                  handleConfirmCompletion(bookingId);
                }
              },
              { text: "Cancel", style: "cancel" }
            ]
          );
          return;
        }
      }

      // Outcome: Status 8 with payment.state = processing
      if (newStatus === 8 && (payment?.state === 'processing' || res.data?.state === 'processing')) {
        Alert.alert(
          "Payment Processing",
          res.data?.msg || "Capture sent to Stripe. The job will finalize once confirmation lands.",
          [{ text: "OK", onPress: () => fetchBookingDetails() }]
        );
        fetchBookingDetails();
        return;
      }

      // Outcome: Status 4 (Done!)
      if (newStatus === 4 || res.data?.success) {
        Alert.alert(
          "Job Completed!",
          res.data?.msg || "Thank you! The job has been signed off and payment released to your technician.",
          [
            {
              text: "Leave Feedback",
              onPress: () => {
                const techRecord = details?.assignedTechs?.find((t: any) => String(t.user_status) === "1") || details?.assignedTechs?.[0];
                router.push({
                  pathname: "/job/feedback",
                  params: {
                    booking_id: details?.booking?.id || id,
                    technician_id: techRecord?.technician_id,
                  },
                });
              },
            },
            {
              text: "Close",
              onPress: () => fetchBookingDetails(),
              style: "cancel",
            },
          ]
        );
        fetchBookingDetails();
        return;
      }

      fetchBookingDetails();
    } catch (err: any) {
      console.error('[confirm_completion] Error:', err);
      Alert.alert("Error", err?.response?.data?.msg || "A network error occurred while signing off.");
    } finally {
      setActionLoading(false);
    }
  };

  const promptDecline = (type: 'tech' | 'price' | 'quote', targetId: string | number) => {
    if (type === 'tech') {
      Alert.alert(
        "Decline Technician?",
        "Are you sure you want to decline this technician? We will search for another available professional.",
        [
          { text: "Keep Technician", style: "cancel" },
          {
            text: "Decline",
            style: "destructive",
            onPress: () => {
              setDeclineType('tech');
              setSelectedAssignmentId(String(targetId));
              setDeclineReason("");
              setDeclineModalVisible(true);
            }
          }
        ]
      );
    } else if (type === 'price') {
      Alert.alert(
        "Decline Final Quote?",
        "Are you sure you want to decline this final quote? On-site inspection and call-out terms apply.",
        [
          { text: "Keep Quote", style: "cancel" },
          {
            text: "Decline",
            style: "destructive",
            onPress: () => {
              setDeclineType('price');
              setSelectedAssignmentId(String(targetId));
              setDeclineReason("");
              setDeclineModalVisible(true);
            }
          }
        ]
      );
    } else {
      Alert.alert(
        "Decline Additional Quote?",
        "Are you sure you want to decline this additional work? The technician will continue with only the originally agreed scope.",
        [
          { text: "Keep Reviewing", style: "cancel" },
          {
            text: "Decline Work",
            style: "destructive",
            onPress: () => {
              setDeclineType('quote');
              setSelectedQuoteId(targetId);
              setDeclineReason("");
              setDeclineModalVisible(true);
            }
          }
        ]
      );
    }
  };

  const submitDecline = () => {
    if (declineType === 'quote' && selectedQuoteId) {
      handleConfirmAdditionalQuote(selectedQuoteId, 'decline', declineReason);
    } else if (selectedAssignmentId && (declineType === 'tech' || declineType === 'price')) {
      handleConfirm(declineType, 'decline', selectedAssignmentId, declineReason);
    }
  };

  const handleCancelBooking = () => {
    const currentStatus = Number(details?.booking?.status);
    if (currentStatus === 8 || currentStatus === 4) {
      Alert.alert(
        "Cannot Cancel",
        "This job cannot be cancelled because the technician has already completed the work. If you have an issue, please raise a dispute or contact support."
      );
      return;
    }

    Alert.alert(
      "Cancel Booking?",
      "Are you sure you want to cancel this booking? Cancellation and refund terms apply.",
      [
        { text: "Keep Booking", style: "cancel" },
        {
          text: "Check Refund & Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              setActionLoading(true);
              const token = await SecureStore.getItemAsync('userToken');
              const previewData = new FormData();
              previewData.append('booking_id', id as string);

              // 2-step cancellation preview
              const previewRes = await axios.post(`${BASE_URL}/clients/jobs/cancel_booking.php`, previewData, {
                headers: { Authorization: `Bearer ${token}` }
              });

              const c = previewRes.data?.cancellation;
              const refundAmt = c?.refund_amount !== undefined ? c.refund_amount : previewRes.data?.refund_amount;
              const refundPct = c?.refund_percent !== undefined ? `${c.refund_percent}%` : "";
              const curr = c?.currency || "EUR";
              const sym = curr.toUpperCase() === "EUR" ? "€" : curr.toUpperCase() === "GBP" ? "£" : "$";

              let refundNotice = "";
              if (refundAmt !== undefined) {
                refundNotice += `Estimated Refund: ${sym}${Number(refundAmt).toFixed(2)}${refundPct ? ` (${refundPct})` : ""}.\n`;
              }
              if (c?.amount_retained && Number(c.amount_retained) > 0) {
                refundNotice += `Cancellation fee retained: ${sym}${Number(c.amount_retained).toFixed(2)}.\n`;
              }
              if (previewRes.data?.msg) {
                refundNotice += `${previewRes.data.msg}\n`;
              }
              if (!refundNotice) {
                refundNotice = "Cancellation terms apply.";
              }

              Alert.alert(
                "Confirm Cancellation",
                refundNotice,
                [
                  { text: "Don't Cancel", style: "cancel" },
                  {
                    text: "Confirm Cancellation",
                    style: "destructive",
                    onPress: async () => {
                      try {
                        setActionLoading(true);
                        const confirmData = new FormData();
                        confirmData.append('booking_id', id as string);
                        confirmData.append('confirm', '1');

                        const cancelRes = await axios.post(`${BASE_URL}/clients/jobs/cancel_booking.php`, confirmData, {
                          headers: { Authorization: `Bearer ${token}` }
                        });

                        const refund = cancelRes.data?.refund;
                        const refundMsg = refund?.amount !== undefined
                          ? ` Refund of €${Number(refund.amount).toFixed(2)} is ${refund.status || 'processing'}.`
                          : "";

                        Alert.alert("Booking Cancelled", (cancelRes.data?.msg || "Your booking has been cancelled.") + refundMsg);
                        fetchBookingDetails();
                      } catch (err: any) {
                        Alert.alert("Cancellation Notice", err?.response?.data?.msg || "Booking cancellation processed.");
                        fetchBookingDetails();
                      } finally {
                        setActionLoading(false);
                      }
                    }
                  }
                ]
              );
            } catch (e: any) {
              Alert.alert("Notice", e?.response?.data?.msg || "Cancellation request could not be processed.");
            } finally {
              setActionLoading(false);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1A6B6B" />
      </SafeAreaView>
    );
  }

  if (!details || !details.booking) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.errorText}>Booking not found.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const { booking, assignedTechs, images, completion_images, disputes, feedback } = details;

  const getImageUrl = (url: string) => {
    if (!url) return '';
    return url.startsWith('http') ? url : `${IMAGE_BASE_URL}/${url}`;
  };

  const getStatusStyle = (statusNum: number | string) => {
    const s = Number(statusNum);
    switch (s) {
      case 0: return { bg: '#fef3c7', text: '#D97706', label: 'Searching' };
      case 1: return { bg: '#dbeafe', text: '#3B82F6', label: 'Matched' };
      case 2: return { bg: '#d1fae5', text: '#059669', label: 'Tech Assigned' };
      case 3: return { bg: '#d1fae5', text: '#059669', label: 'In Progress' };
      case 4: return { bg: '#d1fae5', text: '#059669', label: 'Completed' };
      case 5: return { bg: '#e0e7ff', text: '#4338ca', label: 'On My Way' };
      case 6: return { bg: '#dcfce7', text: '#15803d', label: 'Arrived' };
      case 7: return { bg: '#fef3c7', text: '#D97706', label: 'Price Review' };
      case 8: return { bg: '#e0f2fe', text: '#0284c7', label: 'Awaiting Sign-Off' };
      case -1: return { bg: '#fee2e2', text: '#DC2626', label: 'Cancelled' };
      default: return { bg: '#f3f4f6', text: '#4b5563', label: `Status ${s}` };
    }
  };

  const statusStyle = getStatusStyle(booking.status);

  const isCancelled =
    Number(booking.status) === -1 ||
    String(booking.status).toLowerCase() === 'cancelled' ||
    statusStyle.label.toLowerCase() === 'cancelled';

  const isCompleted =
    Number(booking.status) === 4 ||
    String(booking.status).toLowerCase() === 'completed';

  const isRefunded =
    String(booking.payment_status).toLowerCase() === 'refunded';

  const activeQuote = statusCard?.quote || 
    details?.quote || 
    details?.additional_quote || 
    (Array.isArray(details?.additional_quotes) ? details?.additional_quotes[0] : null) ||
    (Array.isArray(details?.quotes) ? details?.quotes[0] : null) ||
    (quote_id ? { quote_id: quote_id, amount: quote_amount, reason: quote_reason } : null);

  const resolvedQuoteId = activeQuote?.quote_id || activeQuote?.id || quote_id;
  const resolvedQuoteAmount = activeQuote?.amount || activeQuote?.quote_amount || quote_amount;
  const resolvedQuoteReason = activeQuote?.reason || activeQuote?.quote_reason || quote_reason;

  const renderTimeline = (currentStatus: number) => {
    const s = Number(currentStatus);
    const steps = [
      { title: "Confirmed", active: s >= 2 },
      { title: "On My Way", active: [5, 6, 7, 3, 8, 4].includes(s) },
      { title: "Arrived", active: [6, 7, 3, 8, 4].includes(s) },
      { title: "In Progress", active: [3, 8, 4].includes(s) },
      { title: "Sign-Off", active: [8, 4].includes(s) },
      { title: "Completed", active: s === 4 },
    ];

    return (
      <View style={styles.timelineContainer}>
        {steps.map((step, index) => (
          <View key={index} style={styles.timelineStep}>
            <View style={styles.timelineIndicatorWrapper}>
              <View style={[styles.timelineDot, step.active && styles.timelineDotActive]}>
                {step.active && <Ionicons name="checkmark" size={12} color="#ffffff" />}
              </View>
              {index < steps.length - 1 && (
                <View style={[styles.timelineLine, step.active && steps[index + 1].active && styles.timelineLineActive]} />
              )}
            </View>
            <View style={styles.timelineTextContainer}>
              <Text style={[styles.timelineText, step.active && styles.timelineTextActive]}>{step.title}</Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        contentContainerStyle={[
          styles.scrollContent, 
          { paddingBottom: Math.max(insets.bottom + 24, Platform.OS === 'android' ? 36 : 24) }
        ]} 
        showsVerticalScrollIndicator={false}
      >

        {/* Main Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.bookingCode}>{booking.booking_code || `ID: ${booking.booking_id}`}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
              <Text style={[styles.statusText, { color: statusStyle.text }]}>{statusStyle.label}</Text>
            </View>
          </View>

          <Text style={styles.serviceTitle}>{booking.service_name || booking.title || "Service Request"}</Text>

          {booking.price_range ? (
            <Text style={styles.priceText}>Price Range: {String(booking.price_range).startsWith('€') ? booking.price_range : `€${booking.price_range}`}</Text>
          ) : (booking.service_min_price && booking.service_max_price) ? (
            <Text style={styles.priceText}>Price Range: €{booking.service_min_price} - €{booking.service_max_price}</Text>
          ) : (booking.min_price && booking.max_price) ? (
            <Text style={styles.priceText}>Price Range: €{booking.min_price} - €{booking.max_price}</Text>
          ) : booking.booking_charges ? (
            <Text style={styles.priceText}>Base Charges: €{booking.booking_charges}</Text>
          ) : null}

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="calendar-outline" size={18} color="#1A6B6B" />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Date</Text>
              <Text style={styles.infoValue}>{booking.booking_date || booking.date_added || "TBD"}</Text>
            </View>
          </View>

          {booking.address ? (
            <View style={styles.infoRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="location-outline" size={18} color="#1A6B6B" />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Address</Text>
                <Text style={styles.infoValue}>{booking.address}</Text>
              </View>
            </View>
          ) : null}

          {booking.notes ? (
            <View style={styles.infoRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="document-text-outline" size={18} color="#1A6B6B" />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Notes</Text>
                <Text style={styles.infoValue}>{booking.notes}</Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* Cancelled Booking Banner */}
        {isCancelled && (
          <View style={styles.cancelledBookingBanner}>
            <Ionicons name="close-circle" size={24} color="#DC2626" />
            <View style={{ flex: 1 }}>
              <Text style={styles.cancelledBookingTitle}>Booking Cancelled</Text>
              <Text style={styles.cancelledBookingText}>
                This booking has been cancelled and any applicable refund has been processed.
              </Text>
            </View>
          </View>
        )}

        {/* Payment Pending Banner (PDF 2 §16) */}
        {!isCancelled && !isCompleted && !isRefunded && (Number(booking.status) === 0 || Number(booking.status) === 1 || !booking.status) && (
          ((booking.payment_status && String(booking.payment_status) !== '1' && String(booking.payment_status).toLowerCase() !== 'paid') || booking.is_paid === 0 || booking.is_paid === '0')
        ) && (
          <View style={styles.paymentPendingBanner}>
            <Ionicons name="alert-circle" size={22} color="#b45309" />
            <View style={{ flex: 1 }}>
              <Text style={styles.paymentPendingTitle}>Payment Pending</Text>
              <Text style={styles.paymentPendingText}>
                Your booking deposit has not been finalized. Please complete the booking fee to enable technician matching.
              </Text>
              <TouchableOpacity
                style={styles.payPendingDepositBtn}
                onPress={handlePayDeposit}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="card" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                    <Text style={styles.payPendingDepositBtnText}>Pay Deposit €25.00</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Technician Arrived Notification Banner (Status 6, PDF 2 §24) */}
        {Number(booking.status) === 6 && (
          <View style={styles.arrivedBanner}>
            <View style={styles.arrivedHeaderRow}>
              <Ionicons name="checkmark-done-circle" size={26} color="#15803d" />
              <Text style={styles.arrivedTitle}>Technician Has Arrived</Text>
            </View>
            <Text style={styles.arrivedText}>
              Your technician has arrived at the property and is preparing for on-site inspection.
            </Text>
          </View>
        )}

        {/* Status 7: Quote Review / Quote Accepted Banner (Image 1) */}
        {Number(booking.status) === 7 && (
          Object.values(priceDecisions).some(d => d === 'accept') ? (
            <View style={[styles.arrivedBanner, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
              <View style={styles.arrivedHeaderRow}>
                <Ionicons name="checkmark-circle" size={26} color="#15803d" />
                <Text style={[styles.arrivedTitle, { color: '#166534' }]}>Quote Accepted</Text>
              </View>
              <Text style={[styles.arrivedText, { color: '#14532d' }]}>
                You have accepted the final quote. Your technician will now set the job to In Progress and begin the work.
              </Text>
            </View>
          ) : (
            <View style={[styles.arrivedBanner, { backgroundColor: '#fffbeb', borderColor: '#fde68a' }]}>
              <View style={styles.arrivedHeaderRow}>
                <Ionicons name="receipt-outline" size={26} color="#d97706" />
                <Text style={[styles.arrivedTitle, { color: '#b45309' }]}>Inspection & Quote Review</Text>
              </View>
              <Text style={[styles.arrivedText, { color: '#78350f' }]}>
                Technician has arrived and inspecting the job. You can Accept/Decline the final quote.
              </Text>
            </View>
          )
        )}

        {/* Status 8: Sign Off Finished Job (Images 3 & 4) */}
        {(Number(booking.status) === 8 || statusCard?.stage === 'confirm_completion') && (
          <View style={styles.completionSignOffCard}>
            <View style={styles.completionSignOffHeader}>
              <View style={styles.completionIconBadge}>
                <Ionicons name="checkmark-done" size={24} color="#15803d" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.actionRequiredBadge}>
                  <Text style={styles.actionRequiredText}>SIGN OFF REQUIRED</Text>
                </View>
                <Text style={styles.completionSignOffTitle}>Work Finished & Ready for Sign-Off</Text>
              </View>
            </View>

            <Text style={styles.completionSignOffDesc}>
              Your technician has completed all work on this job. Please review the completion photos below, then sign off to capture the held card balance and release the technician's payment.
            </Text>

            {/* Completion Photos Preview */}
            {completion_images && completion_images.length > 0 && (
              <View style={styles.completionPhotosPreview}>
                <Text style={styles.completionPhotosTitle}>Technician's Completion Photos:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryContent}>
                  {completion_images.map((img: any, idx: number) => (
                    <TouchableOpacity 
                      key={idx} 
                      style={styles.completionThumbWrapper}
                      onPress={() => {
                        setSelectedImage(getImageUrl(typeof img === 'string' ? img : img.url));
                        setZoomModalVisible(true);
                      }}
                    >
                      <Image source={{ uri: getImageUrl(typeof img === 'string' ? img : img.url) }} style={styles.galleryImage} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Charges Summary */}
            <View style={styles.completionSummaryBox}>
              {booking.booking_charges ? (
                <View style={styles.summaryLine}>
                  <Text style={styles.summaryLineLabel}>Base Job Charges:</Text>
                  <Text style={styles.summaryLineValue}>€{booking.booking_charges}</Text>
                </View>
              ) : null}
              {booking.additional_charges && Number(booking.additional_charges) > 0 ? (
                <View style={styles.summaryLine}>
                  <Text style={styles.summaryLineLabel}>Additional Work Approved:</Text>
                  <Text style={styles.summaryLineValue}>€{booking.additional_charges}</Text>
                </View>
              ) : null}
              <View style={[styles.summaryLine, styles.summaryTotalLine]}>
                <Text style={styles.summaryTotalLabel}>Total to Sign-Off & Capture:</Text>
                <Text style={styles.summaryTotalValue}>
                  €{booking.total_amount || booking.final_amount || booking.booking_charges || "0"}
                </Text>
              </View>
            </View>

            {/* Sign Off Button */}
            <TouchableOpacity
              style={[styles.confirmSignOffBtn, actionLoading && styles.btnDisabled]}
              onPress={() => {
                Alert.alert(
                  "Confirm Completion & Sign Off",
                  `Are you satisfied with the completed work? This will capture €${booking.total_amount || booking.final_amount || booking.booking_charges || ""} on your card and release payment to the technician.`,
                  [
                    { text: "Review More", style: "cancel" },
                    {
                      text: "Sign Off & Release Payment",
                      onPress: () => handleConfirmCompletion(booking.booking_id || booking.id || id),
                    }
                  ]
                );
              }}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <View style={styles.btnRow}>
                  <Ionicons name="card-outline" size={20} color="#ffffff" />
                  <Text style={styles.confirmSignOffBtnText}>Confirm Completion & Release Payment</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Status 3 / Additional Quote Review Section (Images 1 & 2) */}
        {(Number(booking.status) === 3 || statusCard?.stage === 'additional_quote_review') && (resolvedQuoteId || resolvedQuoteAmount) && (
          <View style={styles.additionalQuoteCard}>
            <View style={styles.additionalQuoteHeader}>
              <View style={[styles.completionIconBadge, { backgroundColor: '#fef3c7' }]}>
                <Ionicons name="receipt-outline" size={22} color="#d97706" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.quoteReviewBadge}>
                  <Text style={styles.quoteReviewBadgeText}>ADDITIONAL WORK QUOTED</Text>
                </View>
                <Text style={styles.additionalQuoteTitle}>Additional Quote Review</Text>
              </View>
            </View>

            <View style={styles.additionalQuotePriceRow}>
              <Text style={styles.additionalQuotePriceLabel}>Extra Amount:</Text>
              <Text style={styles.additionalQuotePriceValue}>€{resolvedQuoteAmount || "0"}</Text>
            </View>

            <View style={styles.additionalQuoteReasonBox}>
              <Text style={styles.additionalQuoteReasonLabel}>Technician's Explanation:</Text>
              <Text style={styles.additionalQuoteReasonText}>
                {resolvedQuoteReason || "Additional parts, materials or labor required to complete the job."}
              </Text>
            </View>

            <Text style={styles.additionalQuoteNotice}>
              <Ionicons name="information-circle-outline" size={14} color="#b45309" /> If accepted, this extra amount is held on your card and will be captured together with the balance at final completion sign-off. If declined, the technician continues the main job only.
            </Text>

            {additionalQuoteDecisions[String(resolvedQuoteId || 1)] === 'accept' ? (
              <View style={styles.decisionStatusBoxAccepted}>
                <View style={styles.decisionStatusHeader}>
                  <Ionicons name="checkmark-circle" size={20} color="#15803d" />
                  <Text style={styles.decisionStatusAcceptedText}>Additional Quote Accepted (€{resolvedQuoteAmount || "0"})</Text>
                </View>
                <Text style={styles.decisionStatusSubtext}>
                  You have accepted this additional quote. The technician will proceed with this work.
                </Text>
              </View>
            ) : additionalQuoteDecisions[String(resolvedQuoteId || 1)] === 'decline' ? (
              <View style={styles.decisionStatusBoxDeclined}>
                <View style={styles.decisionStatusHeader}>
                  <Ionicons name="close-circle" size={20} color="#dc2626" />
                  <Text style={styles.decisionStatusDeclinedText}>Additional Quote Declined</Text>
                </View>
                <Text style={styles.decisionStatusSubtext}>
                  You declined this additional work. The technician will continue with only the originally agreed scope.
                </Text>
              </View>
            ) : (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.declineBtn, actionLoading && styles.btnDisabled]}
                  onPress={() => promptDecline('quote', resolvedQuoteId || 1)}
                  disabled={actionLoading}
                >
                  <Text style={styles.declineBtnText}>Decline Work</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.acceptBtn, actionLoading && styles.btnDisabled]}
                  onPress={() => handleConfirmAdditionalQuote(resolvedQuoteId || 1, 'accept')}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.acceptBtnText}>Accept €{resolvedQuoteAmount || "0"}</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Final Quote Review Section (Status 7 - Image 1) */}
        {Number(booking.status) === 7 && assignedTechs && assignedTechs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Final Quote Review</Text>
            {assignedTechs.map((tech: any, index: number) => {
              const techDecision = priceDecisions[String(tech.id)] || 
                (String(tech.price_decision) === 'accept' ? 'accept' : String(tech.price_decision) === 'decline' ? 'decline' : null) ||
                (String(tech.price_status) === '1' || String(tech.price_status) === 'accepted' ? 'accept' : 
                 String(tech.price_status) === '2' || String(tech.price_status) === 'declined' ? 'decline' : null) ||
                (String(tech.quote_status) === '1' || String(tech.quote_status) === 'accepted' ? 'accept' : 
                 String(tech.quote_status) === '2' || String(tech.quote_status) === 'declined' ? 'decline' : null);

              return (
                <View key={index} style={styles.priceReviewCard}>
                  <View style={styles.priceReviewHeader}>
                    <Text style={styles.priceReviewTitle}>New Quoted Amount</Text>
                    <Text style={styles.priceReviewValue}>€{tech.amount_paid}</Text>
                  </View>
                  {tech.price_reason || tech.reason ? (
                    <View style={styles.priceReasonBox}>
                      <Text style={styles.priceReasonLabel}>Technician's Reason:</Text>
                      <Text style={styles.priceReasonText}>{tech.price_reason || tech.reason}</Text>
                    </View>
                  ) : null}

                  {techDecision === 'accept' ? (
                    <View style={styles.decisionStatusBoxAccepted}>
                      <View style={styles.decisionStatusHeader}>
                        <Ionicons name="checkmark-circle" size={20} color="#15803d" />
                        <Text style={styles.decisionStatusAcceptedText}>Quote Accepted (€{tech.amount_paid})</Text>
                      </View>
                      <Text style={styles.decisionStatusSubtext}>
                        You have accepted this final quote. Your technician has been notified to set the job to In Progress and begin work.
                      </Text>
                    </View>
                  ) : techDecision === 'decline' ? (
                    <View style={styles.decisionStatusBoxDeclined}>
                      <View style={styles.decisionStatusHeader}>
                        <Ionicons name="close-circle" size={20} color="#dc2626" />
                        <Text style={styles.decisionStatusDeclinedText}>Quote Declined</Text>
                      </View>
                      <Text style={styles.decisionStatusSubtext}>
                        You have declined this quote. Your technician has been notified to discuss and submit a revised quote.
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.declineBtn, actionLoading && styles.btnDisabled]}
                        onPress={() => promptDecline('price', tech.id)}
                        disabled={actionLoading}
                      >
                        <Text style={styles.declineBtnText}>Decline Quote</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.acceptBtn, actionLoading && styles.btnDisabled]}
                        onPress={() => handleConfirm('price', 'accept', tech.id)}
                        disabled={actionLoading}
                      >
                        {actionLoading ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <Text style={styles.acceptBtnText}>Accept Quote</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Assigned Technicians */}
        {Number(booking.status) >= 2 && assignedTechs && assignedTechs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Assigned Technician</Text>
            {assignedTechs.map((tech: any, index: number) => (
              <View key={index} style={styles.techCardWrapper}>
                <View style={styles.techCard}>
                  <Image
                    source={{ uri: tech.tech_photo ? getImageUrl(tech.tech_photo) : "https://ui-avatars.com/api/?name=" + encodeURIComponent(tech.tech_name || "Tech") }}
                    style={styles.techAvatar}
                  />
                  <View style={styles.techInfo}>
                    <Text style={styles.techName}>{tech.tech_name || "Technician"}</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.callButton} 
                    onPress={() => {
                      if (tech.tech_phone) {
                        Linking.openURL(`tel:${tech.tech_phone}`);
                      } else {
                        Alert.alert("No Phone Number", "This technician doesn't have a phone number listed.");
                      }
                    }}
                  >
                    <Ionicons name="call" size={20} color="#ffffff" />
                  </TouchableOpacity>
                </View>

                {/* Accept/Decline Technician (Status 2) */}
                {Number(booking.status) === 2 && String(tech.user_status) === "0" && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.declineBtn, actionLoading && styles.btnDisabled]}
                      onPress={() => promptDecline('tech', tech.id)}
                      disabled={actionLoading}
                    >
                      <Text style={styles.declineBtnText}>Decline</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.acceptBtn, actionLoading && styles.btnDisabled]}
                      onPress={() => handleConfirm('tech', 'accept', tech.id)}
                      disabled={actionLoading}
                    >
                      {actionLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.acceptBtnText}>Accept</Text>}
                    </TouchableOpacity>
                  </View>
                )}

                {/* Timeline tracking (if confirmed) */}
                {String(tech.user_status) === "1" && (
                  <View style={styles.timelineSection}>
                    {renderTimeline(tech.status)}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Images */}
        {images && images.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Problem Photos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryContent}>
              {images.map((img: any, idx: number) => (
                <TouchableOpacity 
                  key={idx} 
                  style={styles.imageWrapper}
                  onPress={() => {
                    setSelectedImage(getImageUrl(typeof img === 'string' ? img : img.url));
                    setZoomModalVisible(true);
                  }}
                >
                  <Image source={{ uri: getImageUrl(typeof img === 'string' ? img : img.url) }} style={styles.galleryImage} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {completion_images && completion_images.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Completion Photos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryContent}>
              {completion_images.map((img: any, idx: number) => (
                <TouchableOpacity 
                  key={idx} 
                  style={styles.imageWrapper}
                  onPress={() => {
                    setSelectedImage(getImageUrl(typeof img === 'string' ? img : img.url));
                    setZoomModalVisible(true);
                  }}
                >
                  <Image source={{ uri: getImageUrl(typeof img === 'string' ? img : img.url) }} style={styles.galleryImage} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Support & Feedback Section */}
        {([3, 8, 4].includes(Number(booking.status))) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Support & Feedback</Text>
            <View style={styles.supportContainer}>
              <TouchableOpacity
                style={styles.supportActionBtn}
                onPress={() => {
                  const techRecord = assignedTechs?.find((t: any) => String(t.user_status) === "1") || assignedTechs?.[0];
                  const assignmentId = techRecord?.id || booking?.assignment_id || booking?.booking_technician_id;
                  router.push({
                    pathname: "/job/dispute",
                    params: { 
                      booking_technician_id: assignmentId,
                      booking_id: booking?.id || id,
                      booking_code: booking?.booking_code,
                      service_name: booking?.service_name || booking?.title,
                      tech_name: techRecord?.tech_name || techRecord?.name,
                    }
                  });
                }}
              >
                <View style={styles.supportIconWrapper}>
                  <Ionicons name="warning-outline" size={24} color="#ea580c" />
                </View>
                <View style={styles.supportTextWrapper}>
                  <Text style={styles.supportActionTitle}>Raise a Dispute</Text>
                  <Text style={styles.supportActionSubtitle}>Report an issue with this job</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </TouchableOpacity>

              {Number(booking.status) === 4 && (
                <>
                  <View style={styles.supportDivider} />
                  <TouchableOpacity
                    style={styles.supportActionBtn}
                    onPress={() => {
                      const techRecord = assignedTechs?.find((t: any) => String(t.user_status) === "1") || assignedTechs?.[0];
                      const techId = techRecord?.technician_id || techRecord?.tech_id || techRecord?.user_id;
                      router.push({
                        pathname: "/job/feedback",
                        params: { 
                          booking_id: booking?.id || id,
                          technician_id: techId,
                          booking_code: booking?.booking_code,
                          service_name: booking?.service_name || booking?.title,
                          tech_name: techRecord?.tech_name || techRecord?.name,
                        }
                      });
                    }}
                  >
                    <View style={[styles.supportIconWrapper, { backgroundColor: "#dbeafe" }]}>
                      <Ionicons name="star-outline" size={24} color="#3b82f6" />
                    </View>
                    <View style={styles.supportTextWrapper}>
                      <Text style={styles.supportActionTitle}>Leave Feedback</Text>
                      <Text style={styles.supportActionSubtitle}>Rate your experience</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        )}

        {/* Cancel Booking option for active, non-completed bookings (PDF 2 §40) */}
        {Number(booking.status) >= 0 && Number(booking.status) <= 2 && (
          <View style={styles.cancelBookingSection}>
            <TouchableOpacity
              style={styles.cancelBookingBtn}
              onPress={handleCancelBooking}
              disabled={actionLoading}
            >
              <Text style={styles.cancelBookingBtnText}>Cancel Booking</Text>
            </TouchableOpacity>
            <Text style={styles.cancelBookingHint}>Cancellation and refund terms apply.</Text>
          </View>
        )}

      </ScrollView>

      {/* Decline Reason Modal */}
      <Modal
        visible={declineModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeclineModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {declineType === 'tech'
                ? 'Decline Technician'
                : declineType === 'quote'
                ? 'Decline Additional Quote'
                : 'Decline Final Quote'}
            </Text>
            <Text style={styles.modalSubtitle}>
              {declineType === 'quote'
                ? 'Please provide an optional reason for declining this additional work. The technician will continue with only the originally agreed scope.'
                : 'Please provide an optional reason for your decision.'}
            </Text>

            <TextInput
              style={styles.textInput}
              placeholder="e.g. Price is too high, prefer someone else..."
              value={declineReason}
              onChangeText={setDeclineReason}
              multiline
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setDeclineModalVisible(false)}
                disabled={actionLoading}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={submitDecline}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.modalSubmitText}>Submit Decline</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Zoom Image Modal */}
      <Modal visible={zoomModalVisible} transparent={true} animationType="fade" onRequestClose={() => setZoomModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity style={{ position: 'absolute', top: Platform.OS === 'ios' ? 50 : 30, right: 20, zIndex: 10, padding: 10 }} onPress={() => setZoomModalVisible(false)}>
            <Ionicons name="close" size={32} color="#fff" />
          </TouchableOpacity>
          {selectedImage && (
            <Image source={{ uri: selectedImage }} style={{ width: '100%', height: '80%', resizeMode: 'contain' }} />
          )}
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f9fafb",
    paddingTop: Platform.OS === 'android' ? 40 : 0,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#f9fafb",
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontSize: 16,
    fontFamily: "Lato",
    color: "#4b5563",
    marginBottom: 16,
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#1A6B6B",
    borderRadius: 8,
  },
  backBtnText: {
    color: "#ffffff",
    fontFamily: "Lato-Bold",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "DemoOsbert-Bold",
    color: "#1f2937",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  bookingCode: {
    fontSize: 14,
    fontFamily: "Lato-Bold",
    color: "#1A6B6B",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontFamily: "Lato-Bold",
  },
  serviceTitle: {
    fontSize: 22,
    fontFamily: "DemoOsbert-Bold",
    color: "#1f2937",
    marginBottom: 8,
  },
  priceText: {
    fontSize: 16,
    fontFamily: "Lato-Bold",
    color: "#1f2937",
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: "#f3f4f6",
    marginVertical: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f0fdfa",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontFamily: "Lato",
    color: "#6b7280",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontFamily: "Lato-Bold",
    color: "#1f2937",
    lineHeight: 22,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "DemoOsbert-Bold",
    color: "#1f2937",
    marginBottom: 12,
  },
  techCardWrapper: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 12,
    overflow: 'hidden',
  },
  techCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  techAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  techInfo: {
    flex: 1,
  },
  techName: {
    fontSize: 16,
    fontFamily: "Lato-Bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  techStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  techRating: {
    fontSize: 13,
    fontFamily: "Lato",
    color: "#6b7280",
    marginLeft: 4,
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1A6B6B",
    alignItems: "center",
    justifyContent: "center",
  },
  priceReviewCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 12,
    padding: 16,
  },
  priceReviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  priceReviewTitle: {
    fontSize: 16,
    fontFamily: "Lato-Bold",
    color: "#1f2937",
  },
  priceReviewValue: {
    fontSize: 20,
    fontFamily: "DemoOsbert-Bold",
    color: "#10b981",
  },
  priceReasonBox: {
    backgroundColor: "#f9fafb",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  priceReasonLabel: {
    fontSize: 12,
    fontFamily: "Lato-Bold",
    color: "#6b7280",
    marginBottom: 4,
  },
  priceReasonText: {
    fontSize: 14,
    fontFamily: "Lato",
    color: "#4b5563",
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  declineBtn: {
    backgroundColor: "#fee2e2",
  },
  declineBtnText: {
    color: "#DC2626",
    fontFamily: "Lato-Bold",
    fontSize: 14,
  },
  acceptBtn: {
    backgroundColor: "#10b981",
  },
  acceptBtnText: {
    color: "#ffffff",
    fontFamily: "Lato-Bold",
    fontSize: 14,
  },
  galleryContent: {
    gap: 12,
  },
  imageWrapper: {
    width: 140,
    height: 140,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  galleryImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  timelineSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
  },
  timelineContainer: {
    flexDirection: 'column',
  },
  timelineStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 40,
  },
  timelineIndicatorWrapper: {
    alignItems: 'center',
    width: 20,
    marginRight: 12,
  },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
  },
  timelineDotActive: {
    backgroundColor: "#10b981",
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: "#e5e7eb",
    marginTop: 4,
    marginBottom: 4,
  },
  timelineLineActive: {
    backgroundColor: "#10b981",
  },
  timelineTextContainer: {
    flex: 1,
    paddingTop: 1,
  },
  timelineText: {
    fontSize: 14,
    fontFamily: "Lato",
    color: "#6b7280",
  },
  timelineTextActive: {
    fontFamily: "Lato-Bold",
    color: "#1f2937",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'DemoOsbert-Bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: 'Lato',
    color: '#6b7280',
    marginBottom: 20,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontFamily: 'Lato',
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalCancelText: {
    color: '#6b7280',
    fontFamily: 'Lato-Bold',
  },
  modalSubmitBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#DC2626',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  modalSubmitText: {
    color: '#ffffff',
    fontFamily: 'Lato-Bold',
  },
  supportContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    overflow: "hidden",
    marginTop: 8,
  },
  supportActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#ffffff",
  },
  supportIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#ffedd5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  supportTextWrapper: {
    flex: 1,
  },
  supportActionTitle: {
    fontSize: 16,
    fontFamily: "Lato-Bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  supportActionSubtitle: {
    fontSize: 13,
    fontFamily: "Lato",
    color: "#6b7280",
  },
  supportDivider: {
    height: 1,
    backgroundColor: "#f3f4f6",
    marginLeft: 80,
  },
  cancelledBookingBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  cancelledBookingTitle: {
    fontSize: 16,
    fontFamily: "Lato-Bold",
    color: "#991B1B",
    marginBottom: 4,
  },
  cancelledBookingText: {
    fontSize: 14,
    fontFamily: "Lato",
    color: "#B91C1C",
    lineHeight: 20,
  },
  paymentPendingBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    gap: 12,
  },
  paymentPendingTitle: {
    fontSize: 15,
    fontFamily: "Lato-Bold",
    color: "#92400E",
    marginBottom: 2,
  },
  paymentPendingText: {
    fontSize: 13,
    fontFamily: "Lato",
    color: "#78350F",
    lineHeight: 18,
  },
  payPendingDepositBtn: {
    flexDirection: "row",
    backgroundColor: "#b45309",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    marginTop: 10,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  payPendingDepositBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontFamily: "Lato-Bold",
  },
  arrivedBanner: {
    backgroundColor: "#DCFCE7",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  arrivedHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },
  arrivedTitle: {
    fontSize: 17,
    fontFamily: "Lato-Bold",
    color: "#166534",
  },
  arrivedText: {
    fontSize: 15,
    fontFamily: "Lato",
    color: "#14532D",
    lineHeight: 22,
  },
  cancelBookingSection: {
    marginTop: 8,
    marginBottom: 24,
    alignItems: "center",
  },
  cancelBookingBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    width: "100%",
  },
  cancelBookingBtnText: {
    fontSize: 15,
    fontFamily: "Lato-Bold",
    color: "#DC2626",
  },
  cancelBookingHint: {
    fontSize: 12,
    fontFamily: "Lato",
    color: "#6b7280",
    marginTop: 6,
  },
  completionSignOffCard: {
    backgroundColor: "#f0fdf4",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#86efac",
    padding: 18,
    marginBottom: 20,
    shadowColor: "#15803d",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  completionSignOffHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  completionIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
  },
  actionRequiredBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 4,
  },
  actionRequiredText: {
    fontSize: 11,
    fontFamily: "Lato-Bold",
    color: "#166534",
    letterSpacing: 0.5,
  },
  completionSignOffTitle: {
    fontSize: 17,
    fontFamily: "Lato-Bold",
    color: "#14532d",
  },
  completionSignOffDesc: {
    fontSize: 14,
    fontFamily: "Lato",
    color: "#166534",
    lineHeight: 20,
    marginBottom: 14,
  },
  completionPhotosPreview: {
    marginBottom: 14,
  },
  completionPhotosTitle: {
    fontSize: 13,
    fontFamily: "Lato-Bold",
    color: "#166534",
    marginBottom: 8,
  },
  completionThumbWrapper: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  completionSummaryBox: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#dcfce7",
  },
  summaryLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  summaryLineLabel: {
    fontSize: 13,
    fontFamily: "Lato",
    color: "#4b5563",
  },
  summaryLineValue: {
    fontSize: 14,
    fontFamily: "Lato-Bold",
    color: "#1f2937",
  },
  summaryTotalLine: {
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    marginTop: 6,
    paddingTop: 8,
  },
  summaryTotalLabel: {
    fontSize: 14,
    fontFamily: "Lato-Bold",
    color: "#14532d",
  },
  summaryTotalValue: {
    fontSize: 18,
    fontFamily: "DemoOsbert-Bold",
    color: "#15803d",
  },
  confirmSignOffBtn: {
    backgroundColor: "#16a34a",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmSignOffBtnText: {
    color: "#ffffff",
    fontFamily: "Lato-Bold",
    fontSize: 15,
  },
  btnRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  additionalQuoteCard: {
    backgroundColor: "#fffbeb",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#fde68a",
    padding: 18,
    marginBottom: 20,
    shadowColor: "#d97706",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  additionalQuoteHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  quoteReviewBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#fef3c7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 4,
  },
  quoteReviewBadgeText: {
    fontSize: 11,
    fontFamily: "Lato-Bold",
    color: "#b45309",
    letterSpacing: 0.5,
  },
  additionalQuoteTitle: {
    fontSize: 17,
    fontFamily: "Lato-Bold",
    color: "#92400e",
  },
  additionalQuotePriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#fef3c7",
  },
  additionalQuotePriceLabel: {
    fontSize: 14,
    fontFamily: "Lato-Bold",
    color: "#78350f",
  },
  additionalQuotePriceValue: {
    fontSize: 20,
    fontFamily: "DemoOsbert-Bold",
    color: "#d97706",
  },
  additionalQuoteReasonBox: {
    backgroundColor: "#ffffff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#fef3c7",
  },
  additionalQuoteReasonLabel: {
    fontSize: 12,
    fontFamily: "Lato-Bold",
    color: "#92400e",
    marginBottom: 4,
  },
  additionalQuoteReasonText: {
    fontSize: 14,
    fontFamily: "Lato",
    color: "#4b5563",
    lineHeight: 20,
  },
  additionalQuoteNotice: {
    fontSize: 12,
    fontFamily: "Lato",
    color: "#92400e",
    lineHeight: 18,
    marginBottom: 16,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  decisionStatusBoxAccepted: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1.5,
    borderColor: "#86efac",
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
  decisionStatusBoxDeclined: {
    backgroundColor: "#fef2f2",
    borderWidth: 1.5,
    borderColor: "#fca5a5",
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
  decisionStatusHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  decisionStatusAcceptedText: {
    fontSize: 15,
    fontFamily: "Lato-Bold",
    color: "#15803d",
  },
  decisionStatusDeclinedText: {
    fontSize: 15,
    fontFamily: "Lato-Bold",
    color: "#dc2626",
  },
  decisionStatusSubtext: {
    fontSize: 13,
    fontFamily: "Lato",
    color: "#4b5563",
    lineHeight: 19,
  },
});
