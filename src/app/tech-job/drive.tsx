import React from "react";
import { View, Text, StyleSheet, SafeAreaView, Platform, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TechJobDrive() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#6b7280" />
        </TouchableOpacity>

        <View style={styles.illustrationContainer}>
          <View style={styles.scooterPlaceholder}>
            <Ionicons name="bicycle" size={80} color="#1A6B6B" />
          </View>
        </View>

        <Text style={styles.title}>Drive Safe!</Text>
        <Text style={styles.subtitle}>
          Sandra has been notified. You can update your status again once you arrive.
        </Text>

        <View style={styles.stepperContainer}>
          <View style={styles.step}>
            <View style={styles.stepIndicatorCompleted}>
              <Ionicons name="checkmark" size={14} color="#ffffff" />
            </View>
            <Text style={styles.stepText}>View Job</Text>
            <View style={styles.stepLineCompleted} />
          </View>

          <View style={styles.step}>
            <View style={styles.stepIndicatorCompleted}>
              <Ionicons name="checkmark" size={14} color="#ffffff" />
            </View>
            <Text style={styles.stepText}>I'm on my way</Text>
            <View style={styles.stepLinePending} />
          </View>

          <View style={[styles.step, { marginBottom: 0 }]}>
            <View style={styles.stepIndicatorPending}>
              <Text style={styles.stepIndicatorPendingText}>3</Text>
            </View>
            <Text style={styles.stepText}>I've Arrived</Text>
          </View>
        </View>

      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => router.push("/tech-job/confirm-price" as any)}
        >
          <Text style={styles.actionButtonText}>I've Arrived</Text>
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  illustrationContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  scooterPlaceholder: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "#E8F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontFamily: "DemoOsbert-Bold",
    color: "#1f2937",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Lato",
    color: "#9ca3af",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  stepperContainer: {
    paddingHorizontal: 20,
  },
  step: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 40, // space for the line
    position: 'relative',
  },
  stepIndicatorCompleted: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#1A6B6B",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
    zIndex: 2,
  },
  stepIndicatorPending: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#d1d5db",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
    zIndex: 2,
  },
  stepIndicatorPendingText: {
    color: "#ffffff",
    fontSize: 12,
    fontFamily: "Lato-Bold",
  },
  stepText: {
    fontSize: 14,
    fontFamily: "Lato",
    color: "#1f2937",
    marginTop: 2,
  },
  stepLineCompleted: {
    position: "absolute",
    left: 11,
    top: 24,
    width: 2,
    height: 40,
    backgroundColor: "#1A6B6B",
    zIndex: 1,
  },
  stepLinePending: {
    position: "absolute",
    left: 11,
    top: 24,
    width: 2,
    height: 40,
    backgroundColor: "#d1d5db",
    zIndex: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: "#9ca3af", // dash effect fallback
  },
  footer: {
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  actionButton: {
    backgroundColor: "#1A6B6B",
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontFamily: "Lato-Bold",
  }
});
