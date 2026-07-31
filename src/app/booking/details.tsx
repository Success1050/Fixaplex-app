import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform, TextInput, KeyboardAvoidingView, ScrollView, Image, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useBookingStore } from "../../store/useBookingStore";

export default function Details() {
  const router = useRouter();
  
  const issueDescription = useBookingStore(state => state.issueDescription);
  const setIssueDescription = useBookingStore(state => state.setIssueDescription);
  const images = useBookingStore(state => state.images);
  const addImage = useBookingStore(state => state.addImage);
  const removeImage = useBookingStore(state => state.removeImage);

  const isNextEnabled = issueDescription.trim().length > 0;

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Describe the issue</Text>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.inputWrapper}>
            <TextInput 
              style={styles.textArea}
              placeholder='"My boiler is broken"'
              placeholderTextColor="#9ca3af"
              multiline
              textAlignVertical="top"
              value={issueDescription}
              onChangeText={setIssueDescription}
            />
          </View>
          <Text style={styles.hint}>Add Photos. Photos help us know what's going on and match you faster. ({images.length}/6)</Text>

          {images.length > 0 && (
            <View style={styles.imageGrid}>
              {images.map((img, index) => (
                <View key={index} style={styles.imageThumbContainer}>
                  <Image source={{ uri: img.uri }} style={styles.imageThumb} />
                  <TouchableOpacity style={styles.removeBadge} onPress={() => removeImage(index)}>
                    <Ionicons name="close-circle" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.photoActions}>
            <TouchableOpacity style={styles.photoButton} onPress={pickImageFromLibrary}>
              <Ionicons name="image-outline" size={24} color="#0d9488" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoButton} onPress={takePhotoWithCamera}>
              <Ionicons name="camera-outline" size={24} color="#0d9488" />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={[styles.nextButton, !isNextEnabled && styles.nextButtonDisabled]}
            disabled={!isNextEnabled}
            onPress={() => router.push("/booking/review")}
          >
            <Text style={[styles.nextButtonText, !isNextEnabled && styles.nextButtonTextDisabled]}>
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
    paddingTop: Platform.OS === 'android' ? 40 : 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
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
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    flexGrow: 1,
    justifyContent: "flex-end",
    paddingBottom: 40,
  },
  inputWrapper: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    height: 180,
    backgroundColor: "#ffffff",
  },
  textArea: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    fontFamily: "Lato",
    color: "#1f2937",
  },
  hint: {
    fontSize: 12,
    fontFamily: "Lato",
    color: "#9ca3af",
    marginTop: 12,
    marginBottom: 12,
  },
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 8,
  },
  imageThumbContainer: {
    position: "relative",
    width: 70,
    height: 70,
    borderRadius: 8,
    overflow: "visible",
  },
  imageThumb: {
    width: 70,
    height: 70,
    borderRadius: 8,
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
    padding: 20,
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
    backgroundColor: "#f0fdfa",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButton: {
    backgroundColor: "#3b82f6", // Blue color when enabled
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 30,
    alignItems: "center",
  },
  nextButton: {
    backgroundColor: "#3b82f6", 
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 30,
    alignItems: "center",
  },
  nextButtonDisabled: {
    backgroundColor: "#e5e7eb", // Grey when disabled (e.g. text is empty)
  },
  nextButtonText: {
    fontSize: 16,
    fontFamily: "Lato-Bold",
    color: "#ffffff",
  },
  nextButtonTextDisabled: {
    color: "#9ca3af",
  }
});

