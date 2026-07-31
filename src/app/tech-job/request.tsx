import React from "react";
import { View, Text, StyleSheet, SafeAreaView, Platform, TouchableOpacity, Image, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TechJobRequest() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#6b7280" />
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Client Description</Text>
        <View style={styles.quoteBlock}>
          <Text style={styles.descriptionText}>
            " Please review the job details below and confirm if you are available to take on this request. "
          </Text>
        </View>
        <View style={styles.divider} />

        <View style={styles.imagesGrid}>
          {[1, 2, 3, 4].map((item, idx) => (
            <View key={idx} style={styles.imagePlaceholder}>
              <Ionicons name="image-outline" size={32} color="#9ca3af" />
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Client Location</Text>
        <Text style={styles.locationText}>Phibsborough, Dublin 2</Text>

      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.rejectButton}
          onPress={() => router.push("/tech-job/reject" as any)}
        >
          <Ionicons name="close-circle-outline" size={20} color="#DC2626" style={styles.btnIcon} />
          <Text style={styles.rejectText}>Reject</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.acceptButton}
          onPress={() => router.push("/tech-job/accept" as any)}
        >
          <Ionicons name="checkmark-circle-outline" size={20} color="#ffffff" style={styles.btnIcon} />
          <Text style={styles.acceptText}>Accept</Text>
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Lato-Bold",
    color: "#1f2937",
    marginBottom: 16,
  },
  quoteBlock: {
    marginBottom: 24,
  },
  descriptionText: {
    fontSize: 14,
    fontFamily: "Lato",
    color: "#6b7280",
    lineHeight: 22,
  },
  divider: {
    width: 40,
    height: 4,
    backgroundColor: "#d1d5db",
    borderRadius: 2,
    marginBottom: 32,
  },
  imagesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 40,
  },
  imagePlaceholder: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  locationText: {
    fontSize: 14,
    fontFamily: "Lato",
    color: "#6b7280",
  },
  footer: {
    flexDirection: "row",
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    gap: 16,
  },
  rejectButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#DC2626",
    height: 56,
    borderRadius: 28,
  },
  rejectText: {
    color: "#DC2626",
    fontSize: 16,
    fontFamily: "Lato-Bold",
  },
  acceptButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1A6B6B", // Primary Brand Colour
    height: 56,
    borderRadius: 28,
  },
  acceptText: {
    color: "#ffffff",
    fontSize: 16,
    fontFamily: "Lato-Bold",
  },
  btnIcon: {
    marginRight: 8,
  }
});
