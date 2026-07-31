import { FontAwesome5, Ionicons, MaterialIcons } from "@expo/vector-icons";
import axios from "axios";
import { useFocusEffect, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { BASE_URL } from "../../config/api";
import { useAuthStore } from "../../store/useAuthStore";
import { useBookingStore } from "../../store/useBookingStore";

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
};

export default function Dashboard() {
  const router = useRouter();
  const setRole = useAuthStore(state => state.setRole);
  const userData = useAuthStore(state => state.userData);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeJobs, setActiveJobs] = useState<any[]>([]);

  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const resetBooking = useBookingStore(state => state.reset);
  const setServiceId = useBookingStore(state => state.setServiceId);
  const setCategoryInfo = useBookingStore(state => state.setCategoryInfo);


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

  useEffect(() => {
    const fetchDefaultServices = async () => {
      try {
        setLoading(true);
        const res = await axios.post(`${BASE_URL}/clients/home/categories.php`);
        console.log("Categories response:", JSON.stringify(res.data).slice(0, 200));
        if (res.data.success) {
          setServices(res.data.categories || []);
        }
      } catch (err) {
        console.error("Failed to fetch default categories:", err);
      } finally {
        setLoading(false);
      }
    };

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

  const getCategoryIconDetails = (categoryId: string) => {
    const id = parseInt(categoryId, 10);
    // Rough grouping based on API category IDs
    if ([2, 3, 4].includes(id)) {
      return { icon: <Ionicons name="water-outline" size={32} color="#0284c7" />, bg: "#e0f2fe" };
    }
    if ([8].includes(id)) {
      return { icon: <Ionicons name="flash-outline" size={32} color="#d97706" />, bg: "#fef3c7" };
    }
    if ([16].includes(id)) {
      return { icon: <MaterialIcons name="cleaning-services" size={32} color="#16a34a" />, bg: "#dcfce7" };
    }
    // Default / Handyman
    return { icon: <FontAwesome5 name="tools" size={28} color="#9333ea" />, bg: "#f3e8ff" };
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
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.greeting}>{getGreeting()},{"\n"}{userData?.full_name?.split(' ')[0] || 'User'}</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.toggleButton} onPress={handleRoleToggle}>
              <Ionicons name="people-outline" size={24} color="#1A6B6B" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.notificationIcon} onPress={() => router.push("/notifications" as any)}>
              <Ionicons name="notifications-outline" size={24} color="#1f2937" />
              {unreadCount > 0 && <View style={styles.notificationBadge} />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Dynamic Status Cards (Sliding from Right) */}
        {activeJobs && activeJobs.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusCardsContainer}>
            {activeJobs.map((job, index) => {
              const statusNum = Number(job.status);
              const techName = job.technician?.name;

              if (statusNum === 0) {
                return (
                  <View key={index} style={[styles.searchingBanner, { width: 300, marginRight: 16, marginBottom: 0 }]}>
                    <Text style={styles.searchingBannerTitle}>{job.title || "We're finding your technician"}</Text>
                    <Text style={styles.searchingBannerSubtitle}>{job.message || "We'll notify you as soon as someone is matched."}</Text>
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

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for services..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.grid}>
          {loading ? (
            <ActivityIndicator size="large" color="#1A6B6B" style={{ marginVertical: 40, width: '100%' }} />
          ) : services.length > 0 ? (
            services.map((service) => {
              const { icon, bg } = getCategoryIconDetails(service.category_id);
              return (
                <TouchableOpacity
                  key={service.id}
                  style={styles.card}
                  onPress={() => {
                    if (service.min_price) {
                      resetBooking();
                      setServiceId(service.id.toString());
                      setCategoryInfo(service.category_id?.toString() || service.id.toString(), service.name);
                      router.push("/booking/schedule");
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
            <Text style={styles.noServicesText}>No services found.</Text>
          )}
        </View>
      </ScrollView>
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
    marginBottom: 32,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  greeting: {
    fontSize: 24,
    fontWeight: "bold",
    fontFamily: "DemoOsbert-Bold",
    color: "#1f2937",
    lineHeight: 32,
  },
  toggleButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
    paddingBottom: 24,
    paddingRight: 24, // for the last item margin
  },
  searchingBanner: {
    backgroundColor: "#1A6B6B",
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    position: "relative",
    overflow: "hidden",
  },
  foundBanner: {
    backgroundColor: "#1A6B6B",
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    position: "relative",
    overflow: "hidden",
    alignItems: "flex-start",
  },
  confirmBookingBtn: {
    backgroundColor: "#7DD3FC", // light blue
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginTop: 12,
  },
  confirmBookingText: {
    color: "#0369A1",
    fontSize: 12,
    fontFamily: "Lato-Bold",
  },
  searchingBannerTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontFamily: "Lato-Bold",
    marginBottom: 4,
    zIndex: 2,
  },
  searchingBannerSubtitle: {
    color: "#ffffff",
    fontSize: 12,
    fontFamily: "Lato",
    opacity: 0.9,
    zIndex: 2,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
    marginBottom: 32,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Lato",
    color: "#1f2937",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 16,
  },
  card: {
    width: "47%",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f3f4f6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 8,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
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
    marginBottom: 8,
  },
  priceRange: {
    fontSize: 13,
    fontFamily: "Lato-Bold",
    color: "#1A6B6B",
    textAlign: "center",
    marginTop: "auto", // Push to bottom if description heights vary
  },
  noServicesText: {
    width: "100%",
    textAlign: "center",
    fontFamily: "Lato",
    color: "#6b7280",
    marginTop: 20,
  },
});
