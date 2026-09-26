import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  ScrollView,
  TextInput,
  Linking,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import axios from "axios";
import { BASE_URL } from "../config/api";

interface FAQItem {
  id: number | string;
  question: string;
  answer: string;
  category?: string;
}

const FAQ_FALLBACK: FAQItem[] = [
  {
    id: 1,
    question: "What services does Fixaplex provide?",
    answer:
      "Fixaplex currently connects customers with technicians for plumbing, electrical, handyman and cleaning services in selected areas of Dublin, with potential scale-up and business expansion into other counties.",
  },
  {
    id: 2,
    question: "How much will my job cost?",
    answer:
      "The amount shown during booking is an initial estimate based on the information you provide. Your technician will assess the job on-site and provide a final quote before work begins.",
  },
  {
    id: 3,
    question: "Why do I pay €25 when booking?",
    answer:
      "The €25 booking fee secures your appointment and helps protect the technician's time and attendance. The booking fee is applied according to Fixaplex's applicable payment and refund terms.",
  },
  {
    id: 4,
    question: "Is the €25 the full cost?",
    answer:
      "No. The €25 booking fee is not the full cost of the job. After assessing the job, the technician will provide a final quote. You will be asked to approve the final quote before work begins.",
  },
  {
    id: 5,
    question: "Can I cancel my booking?",
    answer:
      "Yes. Cancellation is subject to Fixaplex's cancellation and refund terms. The amount refunded may depend on when you cancel and whether a technician has already been assigned, dispatched or attended the property.",
  },
];

export default function FAQScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [faqs, setFaqs] = useState<FAQItem[]>(FAQ_FALLBACK);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<number | string | null>(null);
  const [contacts, setContacts] = useState<{ whatsapp?: string; phone?: string } | null>(null);

  useEffect(() => {
    const fetchFaqs = async () => {
      try {
        setLoading(true);
        const res = await axios.post(`${BASE_URL}/faq/get_faq.php`);
        console.log("FAQ API response:", res.data?.faqs?.length);
        if (res.data?.success && Array.isArray(res.data?.faqs) && res.data.faqs.length > 0) {
          setFaqs(res.data.faqs);
        }
      } catch (err) {
        console.error("Failed to fetch FAQs:", err);
      } finally {
        setLoading(false);
      }
    };

    const fetchContacts = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/technicians/accounts/get_contacts.php`);
        if (res.data?.success && res.data?.data) {
          setContacts(res.data.data);
        }
      } catch (err) {
        console.error("Failed to fetch contacts in FAQ screen:", err);
      }
    };

    fetchFaqs();
    fetchContacts();
  }, []);

  const toggleItem = (id: number | string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleWhatsApp = () => {
    const phoneNum = contacts?.whatsapp || "08065433356";
    const clean = phoneNum.replace(/[^0-9]/g, "");
    const intlNumber = clean.startsWith("0") ? "353" + clean.slice(1) : clean;
    Linking.openURL(`https://wa.me/${intlNumber}`).catch(() => {
      Linking.openURL(`https://api.whatsapp.com/send?phone=${clean}`);
    });
  };

  const handlePhoneCall = () => {
    const phoneNum = contacts?.phone || "09065456754";
    Linking.openURL(`tel:${phoneNum}`);
  };

  const filteredFaqs = faqs.filter(
    (faq) =>
      faq.question?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support (FAQ)</Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingBottom: Math.max(insets.bottom + 24, Platform.OS === "android" ? 36 : 24) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search FAQs..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {loading && faqs.length === 0 ? (
          <ActivityIndicator size="large" color="#1A6B6B" style={{ marginVertical: 30 }} />
        ) : (
          <View style={styles.faqList}>
            {filteredFaqs.map((faq) => {
              const isExpanded = expandedId === faq.id;
              return (
                <View key={faq.id} style={styles.faqCard}>
                  <TouchableOpacity
                    style={styles.faqQuestionRow}
                    activeOpacity={0.7}
                    onPress={() => toggleItem(faq.id)}
                  >
                    <Text style={[styles.faqQuestion, isExpanded && styles.faqQuestionActive]}>
                      {faq.question}
                    </Text>
                    <Ionicons
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={20}
                      color={isExpanded ? "#1A6B6B" : "#9ca3af"}
                    />
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.faqAnswerContainer}>
                      <Text style={styles.faqAnswer}>{faq.answer}</Text>
                    </View>
                  )}
                </View>
              );
            })}

            {filteredFaqs.length === 0 && (
              <View style={styles.emptyContainer}>
                <Ionicons name="help-circle-outline" size={48} color="#d1d5db" />
                <Text style={styles.emptyTitle}>No matching answers found</Text>
                <Text style={styles.emptySubtitle}>
                  Try adjusting your search terms or contact our support team below.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Contact Support Banner */}
        <View style={styles.supportBanner}>
          <View style={styles.supportBannerHeader}>
            <View style={styles.supportIconWrapper}>
              <Ionicons name="headset-outline" size={24} color="#0F766E" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.supportBannerTitle}>Still need assistance?</Text>
              <Text style={styles.supportBannerSubtitle}>
                Our friendly support team is available to assist you.
              </Text>
            </View>
          </View>

          <View style={styles.supportButtonsRow}>
            <TouchableOpacity
              style={[styles.contactActionBtn, { backgroundColor: "#25D366" }]}
              onPress={handleWhatsApp}
            >
              <Ionicons name="logo-whatsapp" size={16} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.contactActionBtnText}>WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.contactActionBtn, { backgroundColor: "#1A6B6B" }]}
              onPress={handlePhoneCall}
            >
              <Ionicons name="call" size={16} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.contactActionBtnText}>Call Us</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.contactActionBtn, { backgroundColor: "#0284c7" }]}
              onPress={() => Linking.openURL("mailto:support@fixaplex.ie")}
            >
              <Ionicons name="mail" size={16} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.contactActionBtnText}>Email</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    marginBottom: 20,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Lato",
    color: "#1f2937",
  },
  faqList: {
    gap: 12,
  },
  faqCard: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    backgroundColor: "#ffffff",
    overflow: "hidden",
  },
  faqQuestionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  faqQuestion: {
    fontSize: 15,
    fontFamily: "Lato-Bold",
    color: "#1f2937",
    flex: 1,
    lineHeight: 20,
  },
  faqQuestionActive: {
    color: "#1A6B6B",
  },
  faqAnswerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: "#f9fafb",
  },
  faqAnswer: {
    fontSize: 14,
    fontFamily: "Lato",
    color: "#4b5563",
    lineHeight: 21,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "Lato-Bold",
    color: "#4b5563",
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: "Lato",
    color: "#9ca3af",
    textAlign: "center",
  },
  supportBanner: {
    backgroundColor: "#F0FDFA",
    borderWidth: 1,
    borderColor: "#CCFBF1",
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
    gap: 14,
  },
  supportBannerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  supportIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#CCFBF1",
    alignItems: "center",
    justifyContent: "center",
  },
  supportBannerTitle: {
    fontSize: 15,
    fontFamily: "Lato-Bold",
    color: "#0F766E",
    marginBottom: 2,
  },
  supportBannerSubtitle: {
    fontSize: 12,
    fontFamily: "Lato",
    color: "#134E4A",
    lineHeight: 16,
  },
  supportButtonsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  contactActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  contactActionBtnText: {
    fontSize: 12,
    fontFamily: "Lato-Bold",
    color: "#ffffff",
  },
});
