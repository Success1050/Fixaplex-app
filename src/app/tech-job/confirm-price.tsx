import React, { useState } from "react";
import { View, Text, StyleSheet, SafeAreaView, Platform, TouchableOpacity, ScrollView, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function ConfirmPrice() {
  const router = useRouter();
  const [price, setPrice] = useState("€ 110");

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Confirm your price</Text>
        
        <Text style={styles.subtitle}>
          Please review and confirm your final quoted price before proceeding. This amount will be locked in.
        </Text>

        <Text style={styles.label}>Original Estimate Price</Text>
        <Text style={styles.estimatePrice}>€ 90 - € 130</Text>

        <Text style={styles.label}>Your Final Price</Text>
        <View style={styles.inputContainer}>
          <TextInput 
            style={styles.input}
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
          />
          <Ionicons name="pencil-outline" size={20} color="#9ca3af" />
        </View>

      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={() => router.push("/tech-job/complete" as any)}
        >
          <Text style={styles.primaryButtonText}>Confirm Price</Text>
        </TouchableOpacity>

        <View style={styles.orContainer}>
          <View style={styles.orLine} />
          <Text style={styles.orText}>OR</Text>
          <View style={styles.orLine} />
        </View>

        <TouchableOpacity 
          style={styles.secondaryButton}
          onPress={() => router.push("/tech-job/adjust-price" as any)}
        >
          <Text style={styles.secondaryButtonText}>The job is different - adjust price</Text>
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
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontFamily: "DemoOsbert-Bold",
    color: "#1f2937",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Lato",
    color: "#9ca3af",
    lineHeight: 22,
    marginBottom: 32,
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
    color: "#1f2937",
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
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Lato",
    color: "#1f2937",
  },
  footer: {
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  primaryButton: {
    backgroundColor: "#1A6B6B",
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontFamily: "Lato-Bold",
  },
  orContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e5e7eb",
  },
  orText: {
    marginHorizontal: 16,
    fontSize: 12,
    fontFamily: "Lato-Bold",
    color: "#9ca3af",
  },
  secondaryButton: {
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#1A6B6B",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: "#1A6B6B",
    fontSize: 14,
    fontFamily: "Lato-Bold",
  }
});
