import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, SafeAreaView, Platform, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons, FontAwesome5, MaterialIcons } from "@expo/vector-icons";
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import * as DocumentPicker from "expo-document-picker";
import { BASE_URL } from "../config/api";
import { useAuthStore } from "../store/useAuthStore";

export default function TechOnboarding() {
  const router = useRouter();
  const userData = useAuthStore(state => state.userData);
  const setUserData = useAuthStore(state => state.setUserData);
  
  const [loadingServices, setLoadingServices] = useState(true);
  const [services, setServices] = useState<any[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [areas, setAreas] = useState("");
  const [govIdDoc, setGovIdDoc] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const res = await axios.post(`${BASE_URL}/clients/home/services.php`);
      if (res.data && res.data.success && Array.isArray(res.data.services)) {
        setServices(res.data.services);
      }
    } catch (err) {
      console.error("Failed to fetch services:", err);
    } finally {
      setLoadingServices(false);
    }
  };

  const toggleService = (id: string) => {
    if (selectedServices.includes(id)) {
      setSelectedServices(prev => prev.filter(item => item !== id));
    } else {
      setSelectedServices(prev => [...prev, id]);
    }
  };

  const getCategoryIconDetails = (categoryId: string) => {
    const id = parseInt(categoryId, 10);
    if ([2, 3, 4].includes(id)) {
      return { icon: <Ionicons name="water-outline" size={32} color="#0284c7" />, bg: "#e0f2fe" };
    }
    if ([8].includes(id)) {
      return { icon: <Ionicons name="flash-outline" size={32} color="#d97706" />, bg: "#fef3c7" };
    }
    if ([16].includes(id)) {
      return { icon: <MaterialIcons name="cleaning-services" size={32} color="#16a34a" />, bg: "#dcfce7" };
    }
    return { icon: <FontAwesome5 name="tools" size={28} color="#9333ea" />, bg: "#f3e8ff" };
  };

  const pickDoc = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*", "application/pdf"],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setGovIdDoc(result.assets[0]);
      }
    } catch (err) {
      console.error("Error picking document:", err);
    }
  };

  const handleSwitchAccount = async () => {
    if (selectedServices.length === 0) {
      Alert.alert("Missing Services", "Please select at least one service.");
      return;
    }
    if (!govIdDoc) {
      Alert.alert("Missing Document", "Please upload your Government Issued ID.");
      return;
    }

    setSubmitting(true);
    try {
      const token = await SecureStore.getItemAsync("userToken");
      
      const formData = new FormData();
      selectedServices.forEach((serviceId, index) => {
        formData.append(`services[${index}]`, serviceId);
      });
      
      const formattedArea = /^\d+/.test(areas.trim()) ? areas.trim() : "1";
      formData.append('areas[]', String(formattedArea));
      
      const docExt = govIdDoc.uri.split('.').pop() || 'jpg';
      formData.append('documents[]', {
        uri: Platform.OS === 'ios' ? govIdDoc.uri.replace('file://', '') : govIdDoc.uri,
        name: govIdDoc.name || `document.${docExt}`,
        type: govIdDoc.mimeType || `image/${docExt}`,
      } as any);

      const response = await axios.post(`${BASE_URL}/technicians/accounts/switch_account.php`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
      });

      if (response.data && response.data.success) {
        Alert.alert("Success", "Account successfully upgraded to technician!");
        
        // Update local user data type to '2' so they don't have to onboard again
        if (userData) {
          const updatedUser = { ...userData, type: '2' };
          setUserData(updatedUser);
          await SecureStore.setItemAsync('userData', JSON.stringify(updatedUser));
        }
        
        router.replace("/(technician-tabs)" as any);
      } else {
        Alert.alert("Error", response.data.msg || "Failed to switch account.");
      }
    } catch (err: any) {
      console.error("Switch account error:", err);
      Alert.alert("Error", err?.response?.data?.msg || "An error occurred while upgrading your account.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Get Started</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>Complete your profile to start earning as a technician.</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. What do you do?</Text>
          
          {loadingServices ? (
            <ActivityIndicator size="large" color="#1A6B6B" style={{ marginVertical: 40 }} />
          ) : (
            <View style={styles.servicesGrid}>
              {services.map((item) => {
                const sId = item.id.toString();
                const isSelected = selectedServices.includes(sId);
                const title = item.name || item.title;
                const { icon, bg } = getCategoryIconDetails(item.category_id?.toString() || "0");

                return (
                  <TouchableOpacity 
                    key={sId}
                    style={[styles.serviceCard, isSelected && styles.serviceCardSelected]}
                    onPress={() => toggleService(sId)}
                    activeOpacity={0.8}
                  >
                    {isSelected && (
                      <View style={styles.checkmarkBadge}>
                        <Ionicons name="checkmark-circle" size={20} color="#1A6B6B" />
                      </View>
                    )}
                    <View style={[styles.serviceIconCircle, { backgroundColor: bg }]}>
                      {icon}
                    </View>
                    <Text style={styles.serviceCardTitle} numberOfLines={2}>{title}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Service Areas (Optional)</Text>
          <TextInput 
            style={styles.textInput} 
            placeholder="e.g. Dublin 4, City Center" 
            placeholderTextColor="#9ca3af" 
            value={areas} 
            onChangeText={setAreas} 
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Submit Government ID</Text>
          <TouchableOpacity 
            style={[styles.docUploadCard, govIdDoc && styles.docUploadCardActive]} 
            onPress={pickDoc}
            activeOpacity={0.8}
          >
            <View style={styles.docIconBox}>
              <Ionicons name="card-outline" size={28} color={govIdDoc ? "#1A6B6B" : "#6b7280"} />
            </View>
            <View style={styles.docInfoBox}>
              <Text style={styles.docTitle}>Government Issued ID</Text>
              <Text style={styles.docSubtitle} numberOfLines={1}>
                {govIdDoc ? govIdDoc.name : "Tap to upload (JPG, PNG, PDF)"}
              </Text>
            </View>
            {govIdDoc && (
              <Ionicons name="checkmark-circle" size={24} color="#1A6B6B" />
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.primaryButton, (selectedServices.length === 0 || !govIdDoc || submitting) && styles.buttonDisabled]}
          onPress={handleSwitchAccount}
          disabled={selectedServices.length === 0 || !govIdDoc || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.primaryButtonText}>Upgrade to Technician</Text>
          )}
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  pageTitle: {
    fontSize: 20,
    fontFamily: 'DemoOsbert-Bold',
    color: '#1f2937',
  },
  container: {
    padding: 24,
    paddingBottom: 40,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Lato',
    color: '#4b5563',
    marginBottom: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'DemoOsbert-Bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  serviceCard: {
    width: '47%',
    height: 150,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  serviceCardSelected: {
    borderColor: '#1A6B6B',
    borderWidth: 2,
    backgroundColor: '#f0fdfa',
  },
  checkmarkBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  serviceIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  serviceCardTitle: {
    fontSize: 14,
    fontFamily: 'DemoOsbert-Bold',
    color: '#1f2937',
    textAlign: 'center',
  },
  docUploadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    padding: 16,
    backgroundColor: '#ffffff',
  },
  docUploadCardActive: {
    borderColor: '#1A6B6B',
    backgroundColor: '#f0fdfa',
  },
  docIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  docInfoBox: {
    flex: 1,
    marginRight: 8,
  },
  docTitle: {
    fontSize: 15,
    fontFamily: 'Lato-Bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  docSubtitle: {
    fontSize: 12,
    fontFamily: 'Lato',
    color: '#9ca3af',
  },
  footer: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    backgroundColor: '#ffffff',
  },
  primaryButton: {
    height: 54,
    backgroundColor: "#1A6B6B",
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontFamily: "Lato-Bold",
  },
  textInput: {
    height: 54,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    fontFamily: 'Lato',
    color: '#1f2937',
    backgroundColor: '#ffffff',
  }
});
