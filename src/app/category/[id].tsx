import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator, Platform, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import axios from "axios";
import { BASE_URL } from "../../config/api";
import { useBookingStore } from "../../store/useBookingStore";

export default function CategoryServicesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, name } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({});
  const [initialExpandedId, setInitialExpandedId] = useState<string | null>(null);
  const [hasScrolled, setHasScrolled] = useState(false);
  const scrollViewRef = React.useRef<ScrollView>(null);
  
  // Radio button state (only one service can be selected)
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedServiceName, setSelectedServiceName] = useState<string | null>(null);
  const [selectedMinPrice, setSelectedMinPrice] = useState<string>("");
  const [selectedMaxPrice, setSelectedMaxPrice] = useState<string>("");

  const setServiceId = useBookingStore(state => state.setServiceId);
  const resetBooking = useBookingStore(state => state.reset);
  const setCategoryInfo = useBookingStore(state => state.setCategoryInfo);
  const setPriceEstimate = useBookingStore(state => state.setPriceEstimate);

  useEffect(() => {
    const fetchCategoryServices = async () => {
      try {
        setLoading(true);
        const formData = new FormData();
        formData.append("category", id as string);
        
        const res = await axios.post(`${BASE_URL}/clients/home/category_services.php`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        console.log(`[CategoryServices category=${id}] Response:`, JSON.stringify(res.data, null, 2).slice(0, 500));
        
        setData(res.data);
        
        // Auto-expand first section so services are immediately visible and selectable
        let firstId: string | null = null;
        if (Array.isArray(res.data) && res.data.length > 0) {
          firstId = String(res.data[0].id);
        } else if (res.data?.categories && res.data.categories.length > 0) {
          firstId = String(res.data.categories[0].id);
        } else if (res.data?.sub_categories && res.data.sub_categories.length > 0) {
          firstId = String(res.data.sub_categories[0].id);
        } else if (res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
          firstId = String(res.data.data[0].id);
        }
        if (firstId) {
          setExpandedSections({ [firstId]: true });
          setInitialExpandedId(firstId);
        } else {
          setExpandedSections({});
        }
      } catch (err) {
        console.error("Failed to fetch category services:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryServices();
  }, [id]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const handleNext = () => {
    if (!selectedServiceId) {
      Alert.alert(
        "Service Selection Required",
        "Please select a service from the options below before proceeding."
      );
      return;
    }
    
    resetBooking();
    setServiceId(selectedServiceId);
    setCategoryInfo(id as string, selectedServiceName || name as string);
    setPriceEstimate(selectedMinPrice, selectedMaxPrice);
    router.push("/booking/details");
  };

  let sectionsToRender = [];
  if (Array.isArray(data)) {
    sectionsToRender = data;
  } else if (data?.categories) {
    sectionsToRender = data.categories;
  } else if (data?.sub_categories) {
    sectionsToRender = data.sub_categories;
  } else if (data?.services) {
    sectionsToRender = [data]; 
  } else if (data?.data) {
    sectionsToRender = Array.isArray(data.data) ? data.data : [data.data];
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>What services do you need?</Text>
      </View>

      <ScrollView ref={scrollViewRef} contentContainerStyle={styles.container}>
        {/* Prominent Mandatory Service Selection Notice at the beginning of the Category page */}
        <View style={styles.mandatoryNoticeBanner}>
          <View style={styles.mandatoryNoticeRow}>
            <Ionicons name="alert-circle" size={20} color="#1A6B6B" />
            <Text style={styles.mandatoryNoticeTitle}>
              Service Selection Required <Text style={styles.requiredAsterisk}>*</Text>
            </Text>
          </View>
          <Text style={styles.mandatoryNoticeSubtitle}>
            Please select one service from the categories below before proceeding with your booking.
          </Text>
          {selectedServiceName ? (
            <View style={styles.selectedServiceBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#059669" />
              <Text style={styles.selectedServiceText}>
                Selected: <Text style={{ fontFamily: "Lato-Bold" }}>{selectedServiceName}</Text>
              </Text>
            </View>
          ) : null}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#1A6B6B" style={{ marginTop: 40 }} />
        ) : sectionsToRender.length > 0 ? (
          <View style={styles.accordionCard}>
            {sectionsToRender.map((section: any, index: number) => {
              const isExpanded = expandedSections[section.id];
              const isLast = index === sectionsToRender.length - 1;
              const services = section.services || [];
              
              return (
                <View 
                  key={section.id} 
                  style={[styles.sectionContainer, !isLast && styles.sectionBorder]}
                  onLayout={(event) => {
                    if (!hasScrolled && initialExpandedId === section.id.toString()) {
                      const y = event.nativeEvent.layout.y;
                      setTimeout(() => {
                        scrollViewRef.current?.scrollTo({ y: Math.max(0, y - 24), animated: true });
                        setHasScrolled(true);
                      }, 100);
                    }
                  }}
                >
                  <TouchableOpacity 
                    style={styles.sectionHeader} 
                    onPress={() => toggleSection(section.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.sectionTitle, isExpanded && { color: '#9ca3af' }]}>{section.name}</Text>
                    <Ionicons 
                      name={isExpanded ? "chevron-up" : "chevron-down"} 
                      size={20} 
                      color="#9ca3af" 
                    />
                  </TouchableOpacity>
                  
                  {isExpanded && services.length > 0 && (
                    <View style={styles.servicesList}>
                      {services.map((service: any) => {
                        const isSelected = selectedServiceId === service.id.toString();
                        return (
                          <TouchableOpacity 
                            key={service.id} 
                            style={styles.serviceItem}
                            onPress={() => {
                              setSelectedServiceId(service.id.toString());
                              setSelectedServiceName(service.name);
                              setSelectedMinPrice(service.min_price?.toString() || "");
                              setSelectedMaxPrice(service.max_price?.toString() || "");
                            }}
                            activeOpacity={0.7}
                          >
                            <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                              {isSelected && <View style={styles.radioInner} />}
                            </View>
                            <View style={styles.serviceTextContainer}>
                              <Text style={[styles.serviceName, isSelected && { color: '#1f2937' }]}>{service.name}</Text>
                              <Text style={styles.servicePrice}>€{service.min_price} - €{service.max_price}</Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                  {isExpanded && services.length === 0 && (
                    <View style={styles.servicesList}>
                      <Text style={styles.noServicesText}>No services available</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={styles.noDataText}>No categories found.</Text>
        )}
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom + 16, Platform.OS === "android" ? 36 : 24) },
        ]}
      >
        <TouchableOpacity 
          style={[styles.nextButton, selectedServiceId ? styles.nextButtonActive : styles.nextButtonDisabled]} 
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <Text style={styles.nextButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
    paddingTop: Platform.OS === 'android' ? 40 : 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "DemoOsbert-Bold",
    color: "#1f2937",
    marginLeft: 8,
  },
  container: {
    padding: 24,
    paddingBottom: 40,
  },
  mandatoryNoticeBanner: {
    backgroundColor: "#f0fdfa",
    borderWidth: 1.5,
    borderColor: "#99f6e4",
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  mandatoryNoticeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  mandatoryNoticeTitle: {
    fontSize: 15,
    fontFamily: "Lato-Bold",
    color: "#0f766e",
    marginLeft: 8,
  },
  requiredAsterisk: {
    color: "#ef4444",
    fontSize: 16,
  },
  mandatoryNoticeSubtitle: {
    fontSize: 13,
    fontFamily: "Lato",
    color: "#134e48",
    lineHeight: 18,
  },
  selectedServiceBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#a7f3d0",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 10,
    alignSelf: "flex-start",
  },
  selectedServiceText: {
    fontSize: 13,
    fontFamily: "Lato",
    color: "#065f46",
    marginLeft: 6,
  },
  accordionCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  sectionContainer: {
    backgroundColor: '#ffffff',
  },
  sectionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Lato-Bold',
    color: '#334155',
  },
  servicesList: {
    paddingHorizontal: 18,
    paddingBottom: 16,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    marginRight: 14,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: {
    borderColor: '#1A6B6B',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1A6B6B',
  },
  serviceTextContainer: {
    flex: 1,
  },
  serviceName: {
    fontSize: 15,
    fontFamily: 'Lato',
    color: '#64748b',
    marginBottom: 4,
  },
  servicePrice: {
    fontSize: 13,
    fontFamily: 'Lato',
    color: '#94a3b8',
  },
  noServicesText: {
    fontFamily: 'Lato',
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  noDataText: {
    textAlign: 'center',
    marginTop: 40,
    fontFamily: 'Lato',
    color: '#64748b',
  },
  footer: {
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    backgroundColor: '#ffffff',
  },
  nextButton: {
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: "center",
  },
  nextButtonActive: {
    backgroundColor: "#1A6B6B",
  },
  nextButtonDisabled: {
    backgroundColor: "#cbd5e1",
  },
  nextButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontFamily: "Lato-Bold",
  }
});
