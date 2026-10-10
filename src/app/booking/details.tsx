import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  Image,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBookingStore } from "../../store/useBookingStore";

export default function Details() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const serviceId = useBookingStore((state) => state.serviceId);
  const issueDescription = useBookingStore((state) => state.issueDescription);
  const setIssueDescription = useBookingStore((state) => state.setIssueDescription);
  const images = useBookingStore((state) => state.images);
  const addImage = useBookingStore((state) => state.addImage);
  const removeImage = useBookingStore((state) => state.removeImage);

  // Validate service selection immediately at beginning of booking flow
  useEffect(() => {
    if (!serviceId || serviceId === "0" || serviceId.trim() === "") {
      Alert.alert(
        "Service Selection Required",
        "Please select a service before continuing with your booking.",
        [
          {
            text: "Select Service",
            onPress: () => router.replace("/(tabs)" as any),
          },
        ]
      );
    }
  }, [serviceId]);

  const isFormValid = issueDescription.trim().length > 0 && images.length >= 3;

  const pickImageFromLibrary = async () => {
    if (images.length >= 6) {
      Alert.alert("Limit reached", "You can upload a maximum of 6 images.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsMultipleSelection: false,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      addImage(result.assets[0]);
    }
  };

  const takePhotoWithCamera = async () => {
    if (images.length >= 6) {
      Alert.alert("Limit reached", "You can upload a maximum of 6 images.");
      return;
    }
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Camera permission is required to take a photo.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      addImage(result.assets[0]);
    }
  };

  const handleNext = () => {
    if (!serviceId || serviceId === "0" || serviceId.trim() === "") {
      Alert.alert(
        "Service Selection Required",
        "Please select a service before proceeding with your booking.",
        [{ text: "Select Service", onPress: () => router.replace("/(tabs)" as any) }]
      );
      return;
    }
    if (issueDescription.trim().length === 0) {
      Alert.alert("Required Field", "Please describe the problem.");
      return;
    }
    if (images.length < 3) {
      Alert.alert(
        "Photos Required",
        "Please add at least 3 photos (min 3, max 6) to help technicians assess the job accurately."
      );
      return;
    }
    router.push("/booking/schedule");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Describe the issue <Text style={styles.requiredAsterisk}>*</Text>
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.explainerText}>
            Describing the issue helps technicians get more idea about the problem prior to onsite inspection.
          </Text>

          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textArea}
              placeholder="Please provide a little more information about the job."
              placeholderTextColor="#9ca3af"
              multiline
              textAlignVertical="top"
              value={issueDescription}
              onChangeText={setIssueDescription}
            />
          </View>

          <View style={styles.photoHeaderRow}>
            <Text style={styles.photoHeading}>
              Add Photos <Text style={styles.requiredAsterisk}>*</Text>
            </Text>
            <Text style={[styles.photoCount, images.length >= 3 && styles.photoCountValid]}>
              {images.length}/6 (min 3)
            </Text>
          </View>
          <Text style={styles.hint}>
            Add clear photos. Good photos from different angles provide more context and help us match you faster with the right professional.
          </Text>

          {images.length > 0 && (
            <View style={styles.imageGrid}>
              {images.map((img, index) => (
                <View key={index} style={styles.imageThumbContainer}>
                  <Image source={{ uri: img.uri }} style={styles.imageThumb} />
                  <TouchableOpacity
                    style={styles.removeBadge}
                    onPress={() => removeImage(index)}
                  >
                    <Ionicons name="close-circle" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom + 16, Platform.OS === "android" ? 36 : 24) },
          ]}
        >
          <View style={styles.photoActions}>
            <TouchableOpacity style={styles.photoButton} onPress={pickImageFromLibrary}>
              <Ionicons name="image-outline" size={24} color="#1A6B6B" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoButton} onPress={takePhotoWithCamera}>
              <Ionicons name="camera-outline" size={24} color="#1A6B6B" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.nextButton, !isFormValid && styles.nextButtonDisabled]}
            onPress={handleNext}
          >
            <Text
              style={[styles.nextButtonText, !isFormValid && styles.nextButtonTextDisabled]}
            >
              Next
            </Text>
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
    paddingTop: Platform.OS === "android" ? 40 : 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
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
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "DemoOsbert-Bold",
    color: "#1f2937",
    fontWeight: "bold",
  },
  requiredAsterisk: {
    color: "#ef4444",
    fontFamily: "Lato-Bold",
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    flexGrow: 1,
    paddingBottom: 30,
  },
  explainerText: {
    fontSize: 14,
    fontFamily: "Lato",
    color: "#4b5563",
    lineHeight: 20,
    marginBottom: 16,
  },
  inputWrapper: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    height: 160,
    backgroundColor: "#f9fafb",
    marginBottom: 20,
  },
  textArea: {
    flex: 1,
    padding: 16,
    fontSize: 15,
    fontFamily: "Lato",
    color: "#1f2937",
  },
  photoHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  photoHeading: {
    fontSize: 16,
    fontFamily: "Lato-Bold",
    color: "#1f2937",
  },
  photoCount: {
    fontSize: 13,
    fontFamily: "Lato-Bold",
    color: "#dc2626",
  },
  photoCountValid: {
    color: "#16a34a",
  },
  hint: {
    fontSize: 13,
    fontFamily: "Lato",
    color: "#6b7280",
    lineHeight: 18,
    marginBottom: 14,
  },
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 8,
  },
  imageThumbContainer: {
    position: "relative",
    width: 72,
    height: 72,
    borderRadius: 8,
  },
  imageThumb: {
    width: 72,
    height: 72,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
  },
  removeBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#ffffff",
    borderRadius: 10,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    backgroundColor: "#ffffff",
  },
  photoActions: {
    flexDirection: "row",
    gap: 12,
  },
  photoButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#E8F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  nextButton: {
    backgroundColor: "#1A6B6B",
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 30,
    alignItems: "center",
  },
  nextButtonDisabled: {
    backgroundColor: "#d1d5db",
  },
  nextButtonText: {
    fontSize: 16,
    fontFamily: "Lato-Bold",
    color: "#ffffff",
  },
  nextButtonTextDisabled: {
    color: "#6b7280",
  },
});
