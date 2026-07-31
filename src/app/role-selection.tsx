import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../store/useAuthStore";

export default function RoleSelection() {
  const router = useRouter();
  const setRole = useAuthStore(state => state.setRole);
  
  const [selectedRole, setSelectedRole] = useState<'user' | 'technician'>('user');

  const handleContinue = () => {
    setRole(selectedRole);
    router.push("/register" as any);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>What do you want to do</Text>

        <View style={styles.cardsContainer}>
          <TouchableOpacity 
            style={[styles.card, selectedRole === 'user' && styles.cardActive]}
            onPress={() => setSelectedRole('user')}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="people" size={32} color="#ffffff" />
            </View>
            <Text style={styles.cardTitle}>Request Service</Text>
            <Text style={styles.cardSubtitle}>
              Find trusted professionals for your home repair needs.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.card, selectedRole === 'technician' && styles.cardActive]}
            onPress={() => setSelectedRole('technician')}
          >
            <View style={[styles.iconContainer, { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#1A6B6B' }]}>
              <Ionicons name="cash-outline" size={32} color="#1A6B6B" />
            </View>
            <Text style={styles.cardTitle}>Earn on Fixaplex</Text>
            <Text style={styles.cardSubtitle}>
              Join as a technician and earn on your own schedule.
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.button} onPress={handleContinue}>
          <Text style={styles.buttonText}>Set Up Account</Text>
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
    flex: 1,
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontFamily: "DemoOsbert-Bold",
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 60,
  },
  cardsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
  },
  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  cardActive: {
    backgroundColor: "#E8F5F5",
    borderColor: "#1A6B6B",
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: "#1A6B6B",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: "Lato-Bold",
    color: "#1f2937",
    marginBottom: 8,
    textAlign: "center",
  },
  cardSubtitle: {
    fontSize: 12,
    fontFamily: "Lato",
    color: "#9ca3af",
    textAlign: "center",
    lineHeight: 18,
  },
  footer: {
    padding: 24,
    paddingBottom: 40,
  },
  button: {
    backgroundColor: "#1A6B6B",
    height: 56,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontFamily: "Lato-Bold",
  }
});
