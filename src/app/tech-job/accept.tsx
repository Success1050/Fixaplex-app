import React from "react";
import { View, Text, StyleSheet, SafeAreaView, Platform, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TechJobAccept() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#6b7280" />
        </TouchableOpacity>

        <View style={styles.successHeader}>
          <Ionicons name="checkmark-circle" size={54} color="#10b981" style={{ marginBottom: 12 }} />
          <Text style={styles.successTitle}>Job Accepted</Text>
          <Text style={styles.successSubtitle}>
            You have successfully accepted this request. Please review the details and start your journey.
          </Text>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="locate-outline" size={20} color="#6b7280" style={styles.icon} />
            <Text style={styles.infoText}>Apartment 5B Riverside Court 42 North Circular Road Phibsborough</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={20} color="#6b7280" style={styles.icon} />
            <Text style={styles.infoText}>Dublin 2</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Ionicons name="document-text-outline" size={20} color="#6b7280" style={styles.icon} />
            <Text style={styles.infoText}>Leaking Tap Repair</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color="#6b7280" style={styles.icon} />
            <Text style={styles.infoText}>ASAP</Text>
          </View>
        </View>

      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => router.push("/tech-job/drive" as any)}
        >
          <Text style={styles.actionButtonText}>I'm on my way</Text>
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
  successHeader: {
    alignItems: "center",
    marginBottom: 28,
    paddingHorizontal: 16,
  },
  successTitle: {
    fontSize: 22,
    fontFamily: "DemoOsbert-Bold",
    color: "#1f2937",
    marginBottom: 8,
    textAlign: "center",
  },
  successSubtitle: {
    fontSize: 14,
    fontFamily: "Lato",
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
  },
  infoCard: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    backgroundColor: "#ffffff",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
  },
  icon: {
    marginRight: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Lato",
    color: "#1f2937",
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: "#f3f4f6",
    marginHorizontal: 20,
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
