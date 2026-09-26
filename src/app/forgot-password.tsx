import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { BASE_URL } from "../config/api";

export default function ForgotPassword() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string }>();

  // If a deep link contains ?token=xyz, start directly on 'reset' step
  const [step, setStep] = useState<"request" | "reset">(params.token ? "reset" : "request");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState(params.token || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (params.token) {
      setToken(params.token);
      setStep("reset");
    }
  }, [params.token]);

  // Action 1: request_reset (POST /forget-password/resend-password.php)
  const handleRequestReset = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      Alert.alert("Error", "Please enter your email address.");
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("action", "request_reset");
      formData.append("email", trimmedEmail);
      formData.append("user_name", trimmedEmail);

      const res = await axios.post(
        `${BASE_URL}/forget-password/resend-password.php`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      if (res.data?.success) {
        Alert.alert(
          "Check Your Email",
          res.data?.msg ||
            "Password reset instructions have been sent to your email. Please check your inbox or Spam folder.",
          [
            {
              text: "Enter Code",
              onPress: () => setStep("reset"),
            },
          ]
        );
        // Switch to reset step so the user can enter the code from their email
        setStep("reset");
      } else {
        Alert.alert(
          "Request Failed",
          res.data?.msg || "Could not send password reset email. Please try again."
        );
      }
    } catch (err: any) {
      console.error("Forgot password request error:", err);
      const msg =
        err.response?.data?.msg || err.message || "A network error occurred. Please try again.";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  // Action 2: reset_password (POST /forget-password/resend-password.php)
  const handleResetPassword = async () => {
    const trimmedToken = token.trim();
    if (!trimmedToken) {
      Alert.alert("Error", "Please enter the reset code or token from your email.");
      return;
    }

    if (!newPassword) {
      Alert.alert("Error", "Please enter a new password.");
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match. Please verify and try again.");
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("action", "reset_password");
      formData.append("token", trimmedToken);
      formData.append("new_password", newPassword);
      formData.append("confirm_password", confirmPassword);

      const res = await axios.post(
        `${BASE_URL}/forget-password/resend-password.php`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      if (res.data?.success) {
        Alert.alert(
          "Password Changed",
          res.data?.msg ||
            "Your password has been successfully reset. Please log in with your new password.",
          [
            {
              text: "Log In",
              onPress: () => router.replace("/login" as any),
            },
          ]
        );
      } else {
        Alert.alert(
          "Reset Failed",
          res.data?.msg || "Invalid or expired reset token. Please request a new one."
        );
      }
    } catch (err: any) {
      console.error("Password reset error:", err);
      const msg =
        err.response?.data?.msg || err.message || "A network error occurred. Please try again.";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#1f2937" />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {step === "request" ? (
          <>
            <View style={styles.header}>
              <Text style={styles.title}>Forgot Password?</Text>
              <Text style={styles.subtitle}>
                Enter the email address associated with your Fixaplex account. We'll send you a link and verification code to reset your password.
              </Text>
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

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleRequestReset}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.buttonText}>Send Reset Link</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.switchStepBtn}
                onPress={() => setStep("reset")}
                disabled={loading}
              >
                <Text style={styles.switchStepText}>
                  Already have a reset code? <Text style={styles.switchStepHighlight}>Enter Code</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <View style={styles.header}>
              <Text style={styles.title}>Set New Password</Text>
              <Text style={styles.subtitle}>
                Enter the verification code from your email and choose a new password for your account.
              </Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Reset Code / Token</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Paste or enter reset code"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={token}
                  onChangeText={setToken}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>New Password</Text>
                <View style={styles.passwordWrapper}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Enter new password"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={!showNewPassword}
                    value={newPassword}
                    onChangeText={setNewPassword}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowNewPassword(!showNewPassword)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name={showNewPassword ? "eye-off-outline" : "eye-outline"}
                      size={22}
                      color="#6b7280"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Confirm Password</Text>
                <View style={styles.passwordWrapper}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Confirm new password"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={!showConfirmPassword}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                      size={22}
                      color="#6b7280"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleResetPassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.buttonText}>Reset Password</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.switchStepBtn}
                onPress={() => setStep("request")}
                disabled={loading}
              >
                <Text style={styles.switchStepText}>
                  Didn't receive a code? <Text style={styles.switchStepHighlight}>Resend Email</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        <View style={styles.footer}>
          <TouchableOpacity onPress={() => router.replace("/login" as any)}>
            <Text style={styles.link}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: "center",
    paddingTop: Platform.OS === "ios" ? 80 : 70,
    paddingBottom: 40,
  },
  backButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 54 : 35,
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    marginBottom: 28,
  },
  title: {
    fontSize: 28,
    fontFamily: "DemoOsbert-Bold",
    color: "#1A6B6B",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Lato",
    color: "#6b7280",
    lineHeight: 22,
  },
  form: {
    gap: 18,
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
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
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
  },
  button: {
    height: 56,
    backgroundColor: "#1A6B6B",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontSize: 16,
    fontFamily: "Lato-Bold",
    color: "#ffffff",
  },
  switchStepBtn: {
    alignItems: "center",
    paddingVertical: 10,
  },
  switchStepText: {
    fontSize: 14,
    fontFamily: "Lato",
    color: "#6b7280",
  },
  switchStepHighlight: {
    fontFamily: "Lato-Bold",
    color: "#1A6B6B",
  },
  footer: {
    alignItems: "center",
    marginTop: 28,
  },
  link: {
    color: "#0284C7",
    fontSize: 15,
    fontFamily: "Lato-Bold",
  },
});
