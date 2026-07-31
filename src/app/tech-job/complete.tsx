import React, { useState } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  Platform, 
  TouchableOpacity, 
  ScrollView,
  Image,
  Alert,
  ActivityIndicator
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from 'expo-image-picker';
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { BASE_URL } from "../../config/api";

export default function MarkJobComplete() {
  const router = useRouter();
  const { assignment_id, title, price } = useLocalSearchParams();
  
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    if (selectedImages.length >= 6) {
      Alert.alert("Limit Reached", "You can only upload up to 6 photos.");
      return;
    }
    
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 6 - selectedImages.length,
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      const uris = result.assets.map(a => a.uri);
      setSelectedImages(prev => [...prev, ...uris].slice(0, 6));
    }
  };

  const removePhoto = (indexToRemove: number) => {
    setSelectedImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const submitCompletion = async () => {
    if (selectedImages.length === 0) {
      Alert.alert("Error", "Please add at least one completion photo.");
      return;
    }
    
    try {
      setLoading(true);
      const token = await SecureStore.getItemAsync('userToken');
      const formData = new FormData();
      formData.append('assignment_id', assignment_id as string);
      
      selectedImages.forEach((uri, index) => {
        const ext = uri.split('.').pop() || 'jpg';
        formData.append(`images[]`, {
          uri,
          name: `completion_${index}.${ext}`,
          type: `image/${ext}`,
        } as any);
      });

      const res = await axios.post(`${BASE_URL}/technicians/jobs/complete_job.php`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.data?.success) {
        Alert.alert("Success", "Job marked as complete!");
        router.replace("/(technician-tabs)/jobs");
      } else {
        Alert.alert("Error", res.data?.msg || "Failed to complete job.");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Network error occurred while uploading photos.");
    } finally {
      setLoading(false);
    }
  };

  const photosUploaded = selectedImages.length > 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mark Job As Complete</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        <View style={styles.jobSummaryCard}>
          <Text style={styles.jobSummaryTitle}>{title || "Service Job"}</Text>
          <Text style={styles.jobSummaryDetails}>Base Price: €{price || "N/A"}</Text>
        </View>

        <Text style={styles.label}>Add Completion Photos (Up to 6)</Text>
        <Text style={styles.helpText}>
          Required before you can mark this job done. Protects you if there is ever a dispute.
        </Text>
        
        <View style={styles.photosGrid}>
          {selectedImages.map((uri, idx) => (
            <View key={idx} style={styles.photoWrapper}>
              <Image source={{ uri }} style={styles.uploadedPhoto} />
              <TouchableOpacity style={styles.removePhotoBtn} onPress={() => removePhoto(idx)}>
                <Ionicons name="close-circle" size={24} color="#DC2626" />
              </TouchableOpacity>
            </View>
          ))}

          {selectedImages.length < 6 && (
            <TouchableOpacity 
              style={styles.uploadButton}
              onPress={pickImage}
            >
              <Ionicons name="add" size={28} color="#6b7280" />
            </TouchableOpacity>
          )}
        </View>

        {photosUploaded && (
          <View style={styles.successBanner}>
            <View style={styles.successIcon}>
              <Ionicons name="eye" size={16} color="#ffffff" />
            </View>
            <View style={styles.successTextContainer}>
              <Text style={styles.successTitle}>Good Photos show the finished work clearly</Text>
              <Text style={styles.successSubtitle}>Wide Shot + Close-up of the completed area.</Text>
            </View>
          </View>
        )}

      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.primaryButton, photosUploaded ? styles.primaryButtonActive : {}]}
          disabled={!photosUploaded || loading}
          onPress={submitCompletion}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.primaryButtonText}>Submit & Complete Job</Text>
          )}
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
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "DemoOsbert-Bold",
    color: "#1f2937",
  },
  container: {
    padding: 24,
    paddingBottom: 40,
  },
  jobSummaryCard: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
  },
  jobSummaryTitle: {
    fontSize: 16,
    fontFamily: "Lato-Bold",
    color: "#1A6B6B",
    marginBottom: 6,
  },
  jobSummaryDetails: {
    fontSize: 14,
    fontFamily: "Lato",
    color: "#4b5563",
  },
  label: {
    fontSize: 16,
    fontFamily: "Lato-Bold",
    color: "#1f2937",
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    fontFamily: "Lato",
    color: "#6b7280",
    lineHeight: 20,
    marginBottom: 20,
  },
  photosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  photoWrapper: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
  },
  uploadedPhoto: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  removePhotoBtn: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#ffffff",
    borderRadius: 12,
  },
  uploadButton: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  successBanner: {
    flexDirection: "row",
    backgroundColor: "#f0fdfa",
    borderWidth: 1,
    borderColor: "#ccfbf1",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 24,
  },
  successIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#14b8a6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  successTextContainer: {
    flex: 1,
  },
  successTitle: {
    fontSize: 14,
    fontFamily: "Lato-Bold",
    color: "#115e59",
    marginBottom: 4,
  },
  successSubtitle: {
    fontSize: 12,
    fontFamily: "Lato",
    color: "#0f766e",
  },
  footer: {
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    backgroundColor: "#ffffff",
  },
  primaryButton: {
    backgroundColor: "#cbd5e1", 
    height: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonActive: {
    backgroundColor: "#1A6B6B", 
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontFamily: "Lato-Bold",
  }
});
