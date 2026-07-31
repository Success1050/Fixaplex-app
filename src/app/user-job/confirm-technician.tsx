import { View, Text, StyleSheet, SafeAreaView, Platform, TouchableOpacity, ScrollView, Image, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";

export default function ConfirmTechnician() {
  const router = useRouter();
  const { jobData } = useLocalSearchParams();
  
  let job: any = null;
  try {
    if (jobData) {
      job = JSON.parse(jobData as string);
    }
  } catch (e) {
    console.error("Failed to parse job data", e);
  }

  const tech = job?.technician || {};
  const avatarUri = tech.pic_url || tech.pic;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Technician Details</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{job?.title || "We found someone for you"}</Text>

        {job ? (
          <View style={styles.card}>
            {/* Technician Profile Header */}
            <View style={styles.cardHeader}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={28} color="#ffffff" />
                </View>
              )}
              <View style={styles.infoContainer}>
                <Text style={styles.techName}>{tech.name || "Technician"}</Text>
                <Text style={styles.techSubtitle}>{job.service_name || "Service"}</Text>
                
                <View style={styles.metaRow}>
                  {tech.avg_rating !== undefined && (
                    <View style={styles.ratingBadge}>
                      <Ionicons name="star" size={14} color="#f59e0b" />
                      <Text style={styles.ratingText}>{tech.avg_rating || "5.0"}</Text>
                    </View>
                  )}
                  <View style={styles.jobCountContainer}>
                    <Ionicons name="briefcase-outline" size={14} color="#1A6B6B" />
                    <Text style={styles.jobCountText}>{tech.jobs_completed || 0} jobs completed</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Price Quote */}
            <View style={styles.detailSection}>
              <Text style={styles.sectionLabel}>Price Quote</Text>
              <Text style={styles.priceText}>
                {tech.final_price 
                  ? `€${tech.final_price}` 
                  : (job.booking_charges 
                      ? `€${job.booking_charges}` 
                      : (job.service_min_price ? `€${job.service_min_price} - €${job.service_max_price}` : "To be estimated"))}
              </Text>
              {tech.price_reason ? (
                <Text style={styles.priceReasonText}>{tech.price_reason}</Text>
              ) : null}
            </View>

            <View style={styles.divider} />

            {/* Job Information */}
            <View style={styles.detailSection}>
              <Text style={styles.sectionLabel}>Job Information</Text>
              
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={18} color="#6b7280" style={styles.infoIcon} />
                <Text style={styles.infoText}>{job.address || "Location not provided"}</Text>
              </View>

              {job.booking_date ? (
                <View style={styles.infoRow}>
                  <Ionicons name="calendar-outline" size={18} color="#6b7280" style={styles.infoIcon} />
                  <Text style={styles.infoText}>{job.booking_date}</Text>
                </View>
              ) : null}

              {job.notes ? (
                <View style={styles.infoRow}>
                  <Ionicons name="document-text-outline" size={18} color="#6b7280" style={styles.infoIcon} />
                  <Text style={styles.infoText}>{job.notes}</Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : (
          <Text style={styles.emptyText}>No job details available.</Text>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.rejectButton}
          onPress={() => router.back()}
        >
          <Ionicons name="close-circle-outline" size={20} color="#DC2626" style={styles.btnIcon} />
          <Text style={styles.rejectText}>Reject</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.confirmButton}
          onPress={() => {
            Alert.alert("Technician Confirmed", "Your booking has been confirmed with the technician.");
            router.replace("/(tabs)" as any);
          }}
        >
          <Ionicons name="checkmark-circle-outline" size={20} color="#ffffff" style={styles.btnIcon} />
          <Text style={styles.confirmText}>Confirm</Text>
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
    paddingHorizontal: 20,
    paddingVertical: 12,
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
    fontSize: 18,
    fontFamily: "DemoOsbert-Bold",
    color: "#1f2937",
  },
  container: {
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontFamily: "DemoOsbert-Bold",
    color: "#1f2937",
    marginBottom: 20,
  },
  card: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 16,
    backgroundColor: "#ffffff",
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 16,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1A6B6B",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  infoContainer: {
    flex: 1,
  },
  techName: {
    fontSize: 18,
    fontFamily: "Lato-Bold",
    color: "#1f2937",
    marginBottom: 2,
  },
  techSubtitle: {
    fontSize: 14,
    fontFamily: "Lato",
    color: "#6b7280",
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    fontFamily: "Lato-Bold",
    color: "#1f2937",
  },
  jobCountContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  jobCountText: {
    fontSize: 13,
    fontFamily: "Lato",
    color: "#6b7280",
  },
  divider: {
    height: 1,
    backgroundColor: "#f3f4f6",
    marginVertical: 16,
  },
  detailSection: {
    gap: 6,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Lato-Bold",
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  priceText: {
    fontSize: 22,
    fontFamily: "Lato-Bold",
    color: "#1A6B6B",
  },
  priceReasonText: {
    fontSize: 13,
    fontFamily: "Lato",
    color: "#6b7280",
    marginTop: 2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 6,
  },
  infoIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  infoText: {
    fontSize: 14,
    fontFamily: "Lato",
    color: "#374151",
    flex: 1,
    lineHeight: 20,
  },
  emptyText: {
    textAlign: "center",
    color: "#6b7280",
    fontFamily: "Lato",
    marginTop: 40,
  },
  footer: {
    flexDirection: "row",
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    backgroundColor: "#ffffff",
  },
  rejectButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#DC2626",
    height: 52,
    borderRadius: 26,
  },
  rejectText: {
    color: "#DC2626",
    fontSize: 16,
    fontFamily: "Lato-Bold",
  },
  confirmButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1A6B6B",
    height: 52,
    borderRadius: 26,
  },
  confirmText: {
    color: "#ffffff",
    fontSize: 16,
    fontFamily: "Lato-Bold",
  },
  btnIcon: {
    marginRight: 8,
  }
});
