import React from "react";
import { View, Text, StyleSheet, SafeAreaView, Platform, TouchableOpacity, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useBookingStore } from "../../store/useBookingStore";

export default function JobDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  const submittedJobs = useBookingStore(state => state.submittedJobs);
  const job = submittedJobs.find(j => j.id === id);

  if (!job) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Job Details</Text>
        </View>
        <View style={styles.notFoundContainer}>
          <Text style={styles.notFoundText}>Job not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Generate a mock technician since they aren't assigned at booking time yet
  const mockTechnician = {
    name: "Alex Johnson",
    rating: "4.8",
    jobsCompleted: 142,
  };

  const dateObj = new Date(job.createdAt);
  const formattedDate = isNaN(dateObj.getTime()) ? "recently" : dateObj.toLocaleDateString('en-GB', { 
    day: 'numeric', month: 'short', year: 'numeric' 
  });

  const getStatusStyle = (status: string) => {
    switch(status?.toLowerCase()) {
      case 'pending': return { bg: '#fef3c7', text: '#D97706' };
      case 'in progress': return { bg: '#dbeafe', text: '#3B82F6' };
      case 'completed': return { bg: '#d1fae5', text: '#059669' };
      case 'cancelled': return { bg: '#fee2e2', text: '#DC2626' };
      default: return { bg: '#f3f4f6', text: '#4b5563' };
    }
  };

  const getTimingDisplay = (item: any) => {
    if (item.timingType === 'Future') {
      const dateStr = item.selectedDate ? item.selectedDate : "TBD";
      const timeStr = item.selectedTime ? item.selectedTime : "TBD";
      return `${dateStr} at ${timeStr}`;
    }
    if (item.timingType === 'Tomorrow') {
      const timeStr = item.selectedTime ? item.selectedTime : "TBD";
      return `Tomorrow at ${timeStr}`;
    }
    return item.timingType || "ASAP";
  };

  const statusStyle = getStatusStyle(job.status);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job Details</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Job Summary */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{job.categoryName || "Service"}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
              <Text style={[styles.statusText, { color: statusStyle.text }]}>{job.status || "Pending"}</Text>
            </View>
          </View>
          
          <Text style={styles.servicesText}>{job.selectedServices?.join(", ")}</Text>
          
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={20} color="#6b7280" style={styles.detailIcon} />
            <Text style={styles.detailText}>
              {getTimingDisplay(job)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={20} color="#6b7280" style={styles.detailIcon} />
            <Text style={styles.detailText}>{job.address}</Text>
          </View>

          <Text style={styles.dateText}>Requested on {formattedDate}</Text>
        </View>

        {/* Technician Section */}
        <Text style={styles.sectionTitle}>Assigned Technician</Text>
        <View style={styles.technicianCard}>
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarFallbackText}>A</Text>
          </View>
          <View style={styles.technicianInfo}>
            <Text style={styles.technicianName}>{mockTechnician.name}</Text>
            <View style={styles.ratingRow}>
              <Text style={styles.jobsText}>{mockTechnician.jobsCompleted} jobs completed</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.callButton}>
            <Ionicons name="call" size={20} color="#0d9488" />
          </TouchableOpacity>
        </View>

        {/* Action Sections */}
        <Text style={styles.sectionTitle}>Support & Feedback</Text>
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => router.push({
              pathname: "/job/feedback",
              params: { booking_id: id }
            })}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#dcfce7' }]}>
              <Ionicons name="star-outline" size={24} color="#16a34a" />
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>Leave Feedback</Text>
              <Text style={styles.actionSubtitle}>Rate your experience</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => router.push({
              pathname: "/job/dispute",
              params: { booking_id: id, booking_technician_id: id }
            })}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#fee2e2' }]}>
              <Ionicons name="warning-outline" size={24} color="#ef4444" />
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>Raise a Dispute</Text>
              <Text style={styles.actionSubtitle}>Report an issue with this job</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f9fafb",
    paddingTop: Platform.OS === 'android' ? 40 : 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#ffffff",
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
  notFoundContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  notFoundText: {
    fontSize: 16,
    fontFamily: "Lato",
    color: "#6b7280",
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: "Lato-Bold",
    color: "#0d9488",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontFamily: "Lato-Bold",
  },
  servicesText: {
    fontSize: 22,
    fontFamily: "DemoOsbert-Bold",
    color: "#1f2937",
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  detailIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  detailText: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Lato",
    color: "#4b5563",
    lineHeight: 24,
  },
  dateText: {
    fontSize: 13,
    fontFamily: "Lato",
    color: "#9ca3af",
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Lato-Bold",
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  technicianCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#0d9488",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  avatarFallbackText: {
    fontSize: 20,
    fontFamily: "DemoOsbert-Bold",
    color: "#ffffff",
  },
  technicianInfo: {
    flex: 1,
  },
  technicianName: {
    fontSize: 16,
    fontFamily: "Lato-Bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  jobsText: {
    fontSize: 13,
    fontFamily: "Lato",
    color: "#9ca3af",
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ccfbf1",
    alignItems: "center",
    justifyContent: "center",
  },
  actionsContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    overflow: "hidden",
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontFamily: "Lato-Bold",
    color: "#1f2937",
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 13,
    fontFamily: "Lato",
    color: "#6b7280",
  },
});
