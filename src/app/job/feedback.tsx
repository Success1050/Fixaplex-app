import React, { useState } from "react";
import { View, Text, StyleSheet, SafeAreaView, Platform, TouchableOpacity, TextInput, KeyboardAvoidingView, ScrollView, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import axios from "axios";
import { BASE_URL } from "../../config/api";

export default function Feedback() {
  const router = useRouter();
  const { booking_id, technician_id } = useLocalSearchParams();
  const [rating, setRating] = useState(0);
  const [comments, setComments] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert("Hold on", "Please select a rating before submitting.");
      return;
    }
    
    try {
      setLoading(true);
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) return;

      const formData = new FormData();
      formData.append('booking_id', String(booking_id));
      formData.append('rating', String(rating));
      if (technician_id) formData.append('technician_id', String(technician_id));
      if (comments.trim()) formData.append('comment', comments.trim());

      const res = await axios.post(`${BASE_URL}/clients/jobs/save_feedback.php`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (res.data?.success) {
        Alert.alert(
          "Feedback Submitted", 
          res.data.msg || "Thank you for sharing your experience! Your feedback helps us improve.",
          [{ text: "OK", onPress: () => router.back() }]
        );
      } else {
        Alert.alert("Error", res.data?.msg || "Failed to submit feedback.");
      }
    } catch (err) {
      console.error("Failed to submit feedback:", err);
      Alert.alert("Error", "A network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Leave Feedback</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="star" size={48} color="#0d9488" />
            </View>
            <Text style={styles.title}>How would you rate your experience with Fixaplex?</Text>
            <Text style={styles.subtitle}>Rate the technician and the overall service quality.</Text>
          </View>

          <View style={styles.ratingContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setRating(star)} style={styles.starButton}>
                <Ionicons 
                  name={star <= rating ? "star" : "star-outline"} 
                  size={40} 
                  color={star <= rating ? "#f59e0b" : "#d1d5db"} 
                />
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>What would you like us to improve on?</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Tell us what went well, or what could be improved..."
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            value={comments}
            onChangeText={setComments}
          />
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.submitButton, (rating === 0 || loading) && styles.submitButtonDisabled]} 
            disabled={rating === 0 || loading}
            onPress={handleSubmit}
          >
            <Text style={styles.submitButtonText}>{loading ? "Submitting..." : "Submit Feedback"}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  },
  scrollContent: {
    padding: 24,
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 32,
    marginTop: 16,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#ccfbf1",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontFamily: "DemoOsbert-Bold",
    color: "#1f2937",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Lato",
    color: "#6b7280",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  ratingContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 40,
  },
  starButton: {
    paddingHorizontal: 8,
  },
  label: {
    fontSize: 14,
    fontFamily: "Lato-Bold",
    color: "#4b5563",
    marginBottom: 12,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: "Lato",
    color: "#1f2937",
    backgroundColor: "#f9fafb",
    minHeight: 120,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    backgroundColor: "#ffffff",
  },
  submitButton: {
    backgroundColor: "#0d9488",
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
  },
  submitButtonDisabled: {
    backgroundColor: "#d1d5db",
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: "Lato-Bold",
    color: "#ffffff",
  },
});
