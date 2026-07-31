import React, { useState } from "react";
import { View, Text, StyleSheet, SafeAreaView, Platform, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TechJobReject() {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState("It's too far");

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Why can't you take the job</Text>

        <Text style={styles.label}>I can't take this job cause</Text>
        
        <TouchableOpacity 
          style={styles.dropdownButton} 
          onPress={() => setDropdownOpen(!dropdownOpen)}
        >
          <Text style={styles.dropdownText}>{selectedReason}</Text>
          <Ionicons name="chevron-down" size={20} color="#9ca3af" />
        </TouchableOpacity>

        {dropdownOpen && (
          <View style={styles.dropdownMenu}>
            {["It's too far", "I'm busy", "Not my expertise", "Other"].map((reason) => (
              <TouchableOpacity 
                key={reason}
                style={styles.dropdownItem}
                onPress={() => {
                  setSelectedReason(reason);
                  setDropdownOpen(false);
                }}
              >
                <Text style={styles.dropdownItemText}>{reason}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => router.replace("/(technician-tabs)" as any)}
        >
          <Text style={styles.actionButtonText}>Back to Dashboard</Text>
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
    marginBottom: 40,
  },
  label: {
    fontSize: 14,
    fontFamily: "Lato",
    color: "#6b7280",
    marginBottom: 8,
  },
  dropdownButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 16,
    height: 50,
  },
  dropdownText: {
    fontSize: 14,
    fontFamily: "Lato",
    color: "#9ca3af",
  },
  dropdownMenu: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    marginTop: 4,
    backgroundColor: "#ffffff",
  },
  dropdownItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  dropdownItemText: {
    fontSize: 14,
    fontFamily: "Lato",
    color: "#4b5563",
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
