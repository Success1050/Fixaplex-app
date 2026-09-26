import axios from "axios";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BASE_URL } from "../config/api";
import { useAuthStore } from "../store/useAuthStore";

export default function Login() {
  const router = useRouter();
  const setUserData = useAuthStore(state => state.setUserData);
  const setRoleStore = useAuthStore(state => state.setRole);

  const [role, setRole] = useState<'client' | 'technician'>('client');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter your email and password.");
      return;
    }

    if (password.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters.");
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

        // Check if technician is awaiting approval/verification
        if (role === 'technician') {
          const uData = response.data.userData;
          const isRejected = uData?.status === -1 || uData?.status === '-1';
          if (isRejected) {
            Alert.alert(
              "Application Rejected",
              response.data.msg || "Your technician application was not approved. You can view the reason and re-apply.",
              [
                {
                  text: "View Status & Re-apply",
                  onPress: () => {
                    if (router.canDismiss()) router.dismissAll();
                    router.replace("/awaiting-approval" as any);
                  },
                },
              ]
            );
            return;
          }

          const isPending = 
            uData?.status === 0 || 
            uData?.status === '0' || 
            uData?.is_verified === 0 || 
            uData?.is_verified === '0' || 
            uData?.status === 'pending' || 
            String(uData?.type) === '3';

          if (isPending) {
            Alert.alert(
              "Waiting for Verification", 
              response.data.msg || "Your technician application is awaiting verification. You will have full access once approved.",
              [
                { 
                  text: "View Status", 
                  onPress: () => {
                    if (router.canDismiss()) router.dismissAll();
                    router.replace("/awaiting-approval" as any);
                  } 
                }
              ]
            );
            return;
          }
        }

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
        const msg = response.data?.msg || "Invalid credentials.";
        if (role === 'technician' && (msg.toLowerCase().includes("verif") || msg.toLowerCase().includes("pending") || msg.toLowerCase().includes("approv"))) {
          Alert.alert(
            "Waiting for Verification", 
            msg || "Your account is awaiting approval. Please wait for an administrator to verify your credentials.",
            [
              { text: "View Status", onPress: () => router.push("/awaiting-approval" as any) },
              { text: "OK", style: "cancel" }
            ]
          );
        } else {
          Alert.alert("Login Failed", "Email address or password is incorrect. Please try again.");
        }
      }
    } catch (error: any) {
      console.error(error);
      const serverMsg = error.response?.data?.msg || error.message;
      if (role === 'technician' && serverMsg && (serverMsg.toLowerCase().includes("verif") || serverMsg.toLowerCase().includes("pending") || serverMsg.toLowerCase().includes("approv"))) {
        Alert.alert(
          "Waiting for Verification",
          serverMsg,
          [
            { text: "View Status", onPress: () => router.push("/awaiting-approval" as any) },
            { text: "OK", style: "cancel" }
          ]
        );
      } else {
        Alert.alert("Login Failed", "Email address or password is incorrect. Please try again.");
      }
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
        <Text style={styles.title}>Home Services, Made Easy</Text>
        <Text style={styles.subtitle}>
          {role === 'client' 
            ? "Login to Connect with a Verified Local Technician" 
            : "Login to Earn on Fixaplex"}
        </Text>
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
          <View style={styles.passwordWrapper}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Enter your password"
              placeholderTextColor="#9ca3af"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity 
              style={styles.eyeButton} 
              onPress={() => setShowPassword(!showPassword)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons 
                name={showPassword ? "eye-off-outline" : "eye-outline"} 
                size={22} 
                color="#6b7280" 
              />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.forgotPasswordContainer}
          onPress={() => router.push("/forgot-password" as any)}
        >
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
        </TouchableOpacity>

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
  passwordWrapper: {
    height: 56,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    backgroundColor: "#f9fafb",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  passwordInput: {
    flex: 1,
    height: "100%",
    fontSize: 16,
    fontFamily: "Lato",
    color: "#1f2937",
  },
  eyeButton: {
    padding: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  forgotPasswordContainer: {
    alignSelf: "flex-end",
    marginTop: -4,
    marginBottom: 4,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontFamily: "Lato-Bold",
    color: "#1A6B6B",
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
