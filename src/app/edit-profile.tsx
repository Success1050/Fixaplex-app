import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, SafeAreaView, Platform, TouchableOpacity, TextInput, KeyboardAvoidingView, ScrollView, Alert, ActivityIndicator, Image } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { BASE_URL, IMAGE_BASE_URL } from "../config/api";
import { useAuthStore } from "../store/useAuthStore";

export default function EditProfile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const userData = useAuthStore(state => state.userData);
  const setUserData = useAuthStore(state => state.setUserData);

  const [name, setName] = useState(userData?.full_name || "");
  const [email, setEmail] = useState(userData?.email || "");
  const [phone, setPhone] = useState(userData?.phone || "");
  const [address, setAddress] = useState(userData?.address || "");
  const [password, setPassword] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userData?.address !== undefined) {
      setAddress(userData.address || "");
    }
  }, [userData?.address]);

  const getImageUrl = (url: string) => {
    if (!url) return '';
    return url.startsWith('http') ? url : `${IMAGE_BASE_URL}/${url}`;
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!name || !email) {
      Alert.alert("Hold on", "Name and Email are required.");
      return;
    }
    
    try {
      setLoading(true);
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) return;

      const formData = new FormData();
      formData.append('name', name);
      formData.append('email', email);
      formData.append('phone', phone);
      formData.append('address', address);
      
      if (password.trim() !== "") {
        formData.append('password', password);
      }

      if (imageUri) {
        const filename = imageUri.split('/').pop() || 'profile.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;

        formData.append('profile_pic', {
          uri: imageUri,
          name: filename,
          type
        } as any);
      }

      const res = await axios.post(`${BASE_URL}/clients/account/edit.php`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (res.data?.success) {
        // Update local state
        const updatedUserData = {
          ...userData,
          full_name: name,
          email: email,
          phone: phone,
          address: address,
          // If the backend returns the new image path, use it, otherwise we'd need to refresh from server 
          // or assume it's updated. Usually APIs return the updated user object or image path.
          ...(res.data.pic ? { pic: res.data.pic } : {}),
          ...(res.data.userData ? res.data.userData : {})
        };

        setUserData(updatedUserData);
        await SecureStore.setItemAsync('userData', JSON.stringify(updatedUserData));

        Alert.alert("Success", res.data.msg || "Profile updated successfully!", [
          { text: "OK", onPress: () => router.back() }
        ]);
      } else {
        Alert.alert("Error", res.data?.msg || "Failed to update profile.");
      }
    } catch (err: any) {
      console.error("Failed to update profile:", err);
      Alert.alert("Error", err?.response?.data?.msg || "A network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          <View style={styles.avatarSection}>
            <TouchableOpacity style={styles.avatarWrapper} onPress={pickImage}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.avatarImage} />
              ) : userData?.pic ? (
                <Image source={{ uri: getImageUrl(userData.pic) }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarFallbackText}>{name ? name.charAt(0).toUpperCase() : 'U'}</Text>
                </View>
              )}
              <View style={styles.editBadge}>
                <Ionicons name="camera" size={14} color="#ffffff" />
              </View>
            </TouchableOpacity>
            <Text style={styles.changePhotoText}>Tap to change photo</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                placeholderTextColor="#9ca3af"
                value={name}
                onChangeText={setName}
              />
            </View>

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
              <Text style={styles.label}>Mobile Number</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your mobile number"
                placeholderTextColor="#9ca3af"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Address</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your address"
                placeholderTextColor="#9ca3af"
                value={address}
                onChangeText={setAddress}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>New Password (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Leave blank to keep current password"
                placeholderTextColor="#9ca3af"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 12, Platform.OS === 'android' ? 28 : 16) }]}>
          <TouchableOpacity 
            style={[styles.submitButton, loading && styles.submitButtonDisabled]} 
            disabled={loading}
            onPress={handleSave}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
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
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "DemoOsbert-Bold",
    color: "#1f2937",
  },
  scrollContent: {
    padding: 24,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  avatarWrapper: {
    position: "relative",
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f3f4f6',
  },
  avatarFallback: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#0d9488",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: {
    fontSize: 40,
    fontFamily: "DemoOsbert-Bold",
    color: "#ffffff",
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#1f2937",
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#ffffff",
  },
  changePhotoText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: "Lato",
    color: "#6b7280",
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
    color: "#4b5563",
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    fontSize: 16,
    fontFamily: "Lato",
    color: "#1f2937",
    backgroundColor: "#f9fafb",
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    backgroundColor: "#ffffff",
  },
  submitButton: {
    backgroundColor: "#0d9488",
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: "Lato-Bold",
    color: "#ffffff",
  },
});
