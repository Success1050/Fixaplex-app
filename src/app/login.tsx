import axios from "axios";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { BASE_URL } from "../config/api";
import { useAuthStore } from "../store/useAuthStore";

export default function Login() {
  const router = useRouter();
  const setUserData = useAuthStore(state => state.setUserData);
  const setRoleStore = useAuthStore(state => state.setRole);

  const [role, setRole] = useState<'client' | 'technician'>('client');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      // API requires user_name instead of email
      formData.append("user_name", email);
      formData.append("password", password);

      const endpoint = role === 'client'
        ? `${BASE_URL}/clients/account/login.php`
        : `${BASE_URL}/technicians/accounts/login.php`;

      const response = await axios.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('--- LOGIN API RESPONSE ---');
      console.log(JSON.stringify(response.data, null, 2));

      if (response.data.success && response.data.token) {
        // Securely store the bearer token
        await SecureStore.setItemAsync('userToken', response.data.token);
        if (response.data.expires) {
          await SecureStore.setItemAsync('userExpires', response.data.expires);
        }
        await SecureStore.setItemAsync('userRole', role);

        // Save the user profile data into Zustand and SecureStore
        if (response.data.userData) {
          await SecureStore.setItemAsync('userData', JSON.stringify(response.data.userData));
          setUserData(response.data.userData);
        }

        // Sync the internal store role
        setRoleStore(role === 'client' ? 'user' : 'technician');

        Alert.alert("Success", response.data.msg || "Login successful!");

        // Clear the navigation stack to prevent back-button loops
        if (router.canDismiss()) {
          router.dismissAll();
        }

        // Navigate to the correct dashboard
        if (role === 'client') {
          router.replace("/(tabs)" as any);
        } else {
          router.replace("/(technician-tabs)" as any);
        }
      } else {
        Alert.alert("Login Failed", response.data.msg || "Invalid credentials.");
      }
    } catch (error: any) {
      console.error(error);
      const serverMsg = error.response?.data?.msg || error.message;
      Alert.alert("Error", serverMsg || "Network error or server unavailable.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Login to your account to continue</Text>
      </View>

      {/* Role Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, role === 'client' && styles.activeTab]}
          onPress={() => setRole('client')}
        >
          <Text style={[styles.tabText, role === 'client' && styles.activeTabText]}>Client</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, role === 'technician' && styles.activeTab]}
          onPress={() => setRole('technician')}
        >
          <Text style={[styles.tabText, role === 'technician' && styles.activeTabText]}>Technician</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            placeholderTextColor="#9ca3af"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            placeholderTextColor="#9ca3af"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Login as {role === 'client' ? 'Client' : 'Technician'}</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Don't have an account? </Text>
        <TouchableOpacity onPress={() => router.push("/role-selection" as any)}>
          <Text style={styles.link}>Register</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    padding: 24,
    justifyContent: "center",
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontFamily: "DemoOsbert-Bold",
    color: "#1f2937",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Lato",
    color: "#6b7280",
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#1A6B6B',
  },
  tabText: {
    fontFamily: 'Lato-Bold',
    fontSize: 14,
    color: '#6b7280',
  },
  activeTabText: {
    color: '#ffffff',
  },
  form: {
    gap: 20,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontFamily: "Lato-Bold",
    color: "#374151",
  },
  input: {
    height: 56,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: "Lato",
    backgroundColor: "#f9fafb",
    color: "#1f2937",
  },
  button: {
    height: 56,
    backgroundColor: "#1A6B6B",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontSize: 16,
    fontFamily: "Lato-Bold",
    color: "#ffffff",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 40,
  },
  footerText: {
    color: "#6b7280",
    fontSize: 15,
    fontFamily: "Lato",
  },
  link: {
    color: "#1A6B6B",
    fontSize: 15,
    fontFamily: "Lato-Bold",
  },
});
