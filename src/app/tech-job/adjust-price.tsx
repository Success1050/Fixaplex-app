import React, { useState } from "react";
import { View, Text, StyleSheet, SafeAreaView, Platform, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as SecureStore from "expo-secure-store";
import axios from "axios";
import { BASE_URL } from "../../config/api";
import { Ionicons } from "@expo/vector-icons";

export default function AdjustPrice() {
  const router = useRouter();
  const { assignment_id, base_price, price_range } = useLocalSearchParams();
  
  const [price, setPrice] = useState(base_price ? String(base_price) : "");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!price.trim()) {
      Alert.alert("Error", "Please enter a valid price.");
      return;
    }
    
    try {
      setLoading(true);
      const token = await SecureStore.getItemAsync("userToken");
      const formData = new FormData();
      formData.append("assignment_id", assignment_id as string);
      formData.append("amount_paid", price);
      formData.append("reason", reason);

      const res = await axios.post(`${BASE_URL}/technicians/jobs/change_price.php`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        }
      });

      if (res.data?.success) {
        Alert.alert("Success", res.data?.msg || "Quote submitted successfully!");
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace("/(technician-tabs)/jobs");
        }
      } else {
        Alert.alert("Error", res.data?.msg || "Failed to submit quote.");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "A network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Submit Final Quote</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        <Text style={styles.label}>Original Estimated Quote</Text>
        <Text style={styles.estimatePrice}>
          {price_range ? String(price_range) : `€ ${base_price || "0.00"}`}
        </Text>

        <Text style={styles.label}>Your Final Quote</Text>
        <View style={styles.inputContainer}>
          <Text style={styles.currencyPrefix}>€</Text>
          <TextInput 
            style={styles.input}
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
            placeholder="0.00"
          />
        </View>

        <Text style={styles.label}>Reason for Quote Adjustment (Optional)</Text>
        <View style={styles.textAreaContainer}>
          <TextInput 
            style={styles.textArea}
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            placeholder="e.g. Extra materials were required..."
          />
        </View>
        <Text style={styles.helpText}>This is sent directly to the client.</Text>

      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.primaryButton, price.trim() ? styles.primaryButtonActive : {}]}
          onPress={handleSubmit}
          disabled={loading || !price.trim()}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.primaryButtonText}>Submit Final Quote</Text>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
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
  container: {
    padding: 24,
    paddingBottom: 40,
  },
  label: {
    fontSize: 14,
    fontFamily: "Lato",
    color: "#6b7280",
    marginBottom: 8,
  },
  estimatePrice: {
    fontSize: 18,
    fontFamily: "Lato-Bold",
    color: "#1A6B6B",
    marginBottom: 32,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 16,
    height: 50,
    marginBottom: 32,
  },
  currencyPrefix: {
    fontSize: 16,
    fontFamily: "Lato-Bold",
    color: "#1f2937",
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Lato",
    color: "#1f2937",
  },
  textAreaContainer: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    height: 120,
    marginBottom: 8,
  },
  textArea: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Lato",
    color: "#1f2937",
  },
  helpText: {
    fontSize: 12,
    fontFamily: "Lato",
    color: "#6b7280",
  },
  footer: {
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  primaryButton: {
    backgroundColor: "#cbd5e1", 
    height: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonActive: {
    backgroundColor: "#1A6B6B",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontFamily: "Lato-Bold",
  }
});
