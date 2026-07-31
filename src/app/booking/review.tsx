import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform, ScrollView, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useBookingStore } from "../../store/useBookingStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { BASE_URL } from "../../config/api";

export default function Review() {
  const router = useRouter();
  const userData = useAuthStore(state => state.userData);
  
  const { 
    serviceId, addressLine1, addressLine2, addressLine3, town, county, postcode, categoryName, selectedServices, timingType, 
    selectedDate, selectedTime, issueDescription, images, reset, addSubmittedJob
  } = useBookingStore();

  const fullAddress = [addressLine1, addressLine2, addressLine3, town, county, postcode].filter(Boolean).join(", ");
  const firstName = userData?.full_name?.split(' ')[0] || userData?.name?.split(' ')[0] || 'User';

  const getTimingText = () => {
    if (timingType === 'Future') {
      return `${selectedDate} at ${selectedTime}`;
    }
    if (timingType === 'Tomorrow') {
      return `Tomorrow at ${selectedTime}`;
    }
    return timingType; // ASAP
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const token = await SecureStore.getItemAsync('userToken');
      
      const formData = new FormData();
      formData.append('service_id', serviceId || '1');
      formData.append('notes', issueDescription || '');
      formData.append('address_line1', addressLine1 || '');
      if (addressLine2) formData.append('address_line2', addressLine2);
      if (addressLine3) formData.append('address_line3', addressLine3);
      formData.append('town', town || '');
      if (county) formData.append('county', county);
      if (postcode) formData.append('postcode', postcode);
      
      formData.append('schedule_type', timingType || 'ASAP');
      
      if (timingType === 'Tomorrow' || timingType === 'Future') {
        if (selectedTime) formData.append('booking_time', selectedTime);
      }
      if (timingType === 'Future' && selectedDate) {
        formData.append('booking_date', selectedDate);
      }

      // Attach images (up to 6)
      if (images && images.length > 0) {
        images.forEach((imgAsset, idx) => {
          formData.append('images[]', {
            uri: String(imgAsset.uri),
            name: String(imgAsset.fileName || `issue_photo_${idx + 1}.jpg`),
            type: String(imgAsset.mimeType || 'image/jpeg'),
          } as any);
        });
      }

      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // DO NOT set Content-Type header manually - let axios handle multipart boundary
      const response = await axios.post(`${BASE_URL}/clients/jobs/book_service.php`, formData, { headers });
      return response.data;
    },
    onSuccess: (data) => {
      if (data && (data.success || data.bookingData)) {
        Alert.alert(
          "Request Sent!", 
          data.msg || "Your booking request has been successfully submitted.",
          [
            { 
              text: "OK", 
              onPress: () => {
                addSubmittedJob({ 
                  id: data.bookingData?.id || Math.random().toString(), 
                  serviceId,
                  address: fullAddress, 
                  categoryName, 
                  status: 'Pending', 
                  createdAt: new Date().toISOString() 
                });
                reset();
                router.replace("/(tabs)");
              } 
            }
          ]
        );
      } else {
        Alert.alert("Booking Failed", data?.msg || "Unable to complete booking. Please try again.");
      }
    },
    onError: (error: any) => {
      console.error("Booking error:", error);
      const serverMsg = error?.response?.data?.msg || error?.message || "There was an issue sending your request.";
      Alert.alert("Error", serverMsg);
    }
  });

  const handleSendRequest = () => {
    mutation.mutate();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Did we miss anything,{"\n"}{firstName}.</Text>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Ionicons name="location-outline" size={24} color="#6b7280" style={styles.icon} />
            <Text style={styles.summaryText}>{fullAddress || "Address not provided"}</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.summaryRow}>
            <Ionicons name="person-outline" size={24} color="#6b7280" style={styles.icon} />
            <Text style={styles.summaryText}>{categoryName || "Service"}</Text>
          </View>

          <View style={styles.divider} />
          
          <View style={styles.summaryRow}>
            <Ionicons name="document-outline" size={24} color="#6b7280" style={styles.icon} />
            <Text style={styles.summaryText}>
              {issueDescription ? issueDescription : (selectedServices.length > 0 ? selectedServices.join(", ") : "Issue description provided")}
            </Text>
          </View>

          <View style={styles.divider} />
          
          <View style={styles.summaryRow}>
            <Ionicons name="calendar-outline" size={24} color="#6b7280" style={styles.icon} />
            <Text style={styles.summaryText}>{getTimingText()}</Text>
          </View>
        </View>

      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.submitButton}
          onPress={handleSendRequest}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.submitButtonText}>Send Request</Text>
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
  container: {
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontFamily: "DemoOsbert-Bold",
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 24,
    lineHeight: 32,
  },
  summaryCard: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 16,
    backgroundColor: "#ffffff",
    padding: 8,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  icon: {
    marginRight: 16,
  },
  summaryText: {
    fontSize: 16,
    fontFamily: "Lato",
    color: "#1f2937",
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: "#f3f4f6",
    marginHorizontal: 12,
  },
  footer: {
    padding: 24,
    backgroundColor: "#ffffff",
  },
  submitButton: {
    backgroundColor: "#3b82f6", // Blue color for active button
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: "Lato-Bold",
    color: "#ffffff",
  }
});

