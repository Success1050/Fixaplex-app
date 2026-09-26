import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Platform,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import * as DocumentPicker from "expo-document-picker";
import axios from "axios";
import { BASE_URL } from "../config/api";
import { useAuthStore } from "../store/useAuthStore";

interface ServiceItem {
  id: number | string;
  name: string;
  category?: string;
}

interface AreaItem {
  id: number;
  name: string;
}

const DEFAULT_AREAS: AreaItem[] = [
  { id: 1, name: "Dublin City & County" },
  { id: 2, name: "Cork & South" },
  { id: 3, name: "Galway & West" },
  { id: 4, name: "Limerick & Midwest" },
  { id: 5, name: "Kildare & Meath" },
  { id: 6, name: "Wicklow & Southeast" },
];

export default function ReApplyScreen() {
  const router = useRouter();
  const userData = useAuthStore((state) => state.userData);
  const setUserData = useAuthStore((state) => state.setUserData);

  const [services, setServices] = useState<ServiceItem[]>([]);
  const [selectedServices, setSelectedServices] = useState<number[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<number[]>([1]);
  const [uploadedDocuments, setUploadedDocuments] = useState<any[]>([]);

  const [loadingServices, setLoadingServices] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Fetch available services
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await axios.post(`${BASE_URL}/clients/home/services.php`);
        if (res.data?.success && Array.isArray(res.data.services)) {
          setServices(res.data.services);
        }
      } catch (err) {
        console.error("Failed to fetch services for re-apply:", err);
      } finally {
        setLoadingServices(false);
      }
    };
    fetchServices();
  }, []);

  const toggleService = (id: number) => {
    if (selectedServices.includes(id)) {
      setSelectedServices(selectedServices.filter((s) => s !== id));
    } else {
      setSelectedServices([...selectedServices, id]);
    }
  };

  const toggleArea = (id: number) => {
    if (selectedAreas.includes(id)) {
      if (selectedAreas.length === 1) {
        Alert.alert("Area Required", "You must select at least one primary service area.");
        return;
      }
      setSelectedAreas(selectedAreas.filter((a) => a !== id));
    } else {
      setSelectedAreas([...selectedAreas, id]);
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "image/*",
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ],
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Validate max 10MB per file as documented in re_apply.php
        const validAssets: any[] = [];
        for (const asset of result.assets) {
          if (asset.size && asset.size > 10 * 1024 * 1024) {
            Alert.alert("File Too Large", `"${asset.name}" exceeds the 10MB limit.`);
            continue;
          }
          validAssets.push(asset);
        }

        setUploadedDocuments((prev) => [...prev, ...validAssets]);
      }
    } catch (err) {
      console.error("Error picking document:", err);
      Alert.alert("Upload Error", "Failed to select document. Please try again.");
    }
  };

  const removeDocument = (index: number) => {
    setUploadedDocuments((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmitReApplication = async () => {
    if (selectedServices.length === 0) {
      Alert.alert("Services Required", "Please select at least one service you provide.");
      return;
    }

    if (selectedAreas.length === 0) {
      Alert.alert("Areas Required", "Please select at least one service area.");
      return;
    }

    if (uploadedDocuments.length === 0) {
      Alert.alert(
        "Documents Required",
        "Please attach fresh verification documents (such as Government ID, Trade Certificate, or Insurance)."
      );
      return;
    }

    setSubmitting(true);
    try {
      const token = await SecureStore.getItemAsync("userToken");
      if (!token) {
        Alert.alert("Authentication", "Your session has expired. Please log in again.");
        router.replace("/login");
        return;
      }

      const formData = new FormData();

      // Append services[] (array<integer>)
      selectedServices.forEach((serviceId) => {
        formData.append("services[]", String(serviceId));
      });

      // Append areas[] (array<integer>)
      selectedAreas.forEach((areaId) => {
        formData.append("areas[]", String(areaId));
      });

      // Append documents[] (JPG/JPEG/PNG/PDF/DOC/DOCX, max 10MB each)
      uploadedDocuments.forEach((doc, idx) => {
        const ext = doc.name ? doc.name.split(".").pop() : "jpg";
        const mime = doc.mimeType || (ext === "pdf" ? "application/pdf" : "image/jpeg");
        const uri = Platform.OS === "ios" ? doc.uri.replace("file://", "") : doc.uri;

        formData.append("documents[]", {
          uri: uri,
          name: doc.name || `fresh_document_${idx + 1}.${ext}`,
          type: mime,
        } as any);
      });

      console.log("[re_apply] Submitting re-application request...");
      const res = await axios.post(`${BASE_URL}/technicians/accounts/re_apply.php`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      console.log("[re_apply] Response:", res.data);

      if (res.data?.success) {
        // Successfully moved to status 0 (Pending Review) and cleared rejection reason
        const updatedUser = {
          ...userData,
          status: 0,
          is_verified: 0,
          rejection_reason: null,
        };
        setUserData(updatedUser);
        await SecureStore.setItemAsync("userData", JSON.stringify(updatedUser));

        Alert.alert(
          "Re-application Submitted",
          res.data.msg ||
            "Your application has been successfully submitted and returned to Pending Review. Our compliance team will review your fresh documents.",
          [
            {
              text: "OK",
              onPress: () => router.replace("/awaiting-approval"),
            },
          ]
        );
      } else {
        Alert.alert("Submission Notice", res.data?.msg || "Could not submit re-application. Please try again.");
      }
    } catch (err: any) {
      console.error("Re-application error:", err);
      const serverMsg = err.response?.data?.msg || err.message;
      Alert.alert("Submission Error", serverMsg || "Unable to submit re-application. Please check your connection.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Re-apply for Approval</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="refresh-circle" size={24} color="#1A6B6B" style={{ marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Application Resubmission</Text>
            <Text style={styles.bannerText}>
              Submitting fresh documents and updated trades moves your account back to Pending Review (0) and clears any previous rejection reasons.
            </Text>
          </View>
        </View>

        {/* Section 1: Services */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>1. Services Offered</Text>
            <Text style={styles.sectionSubtitle}>
              {selectedServices.length} selected
            </Text>
          </View>
          <Text style={styles.helperText}>
            Select all categories and trades you are qualified and equipped to perform.
          </Text>

          {loadingServices ? (
            <ActivityIndicator size="small" color="#1A6B6B" style={{ marginVertical: 14 }} />
          ) : (
            <View style={styles.chipGrid}>
              {services.map((item) => {
                const numId = Number(item.id);
                const isSelected = selectedServices.includes(numId);
                return (
                  <TouchableOpacity
                    key={numId}
                    style={[styles.serviceChip, isSelected && styles.serviceChipSelected]}
                    activeOpacity={0.7}
                    onPress={() => toggleService(numId)}
                  >
                    <Ionicons
                      name={isSelected ? "checkmark-circle" : "add-circle-outline"}
                      size={16}
                      color={isSelected ? "#1A6B6B" : "#6b7280"}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[styles.serviceChipText, isSelected && styles.serviceChipTextSelected]}
                    >
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Section 2: Service Areas */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>2. Coverage Areas</Text>
            <Text style={styles.sectionSubtitle}>
              {selectedAreas.length} selected
            </Text>
          </View>
          <Text style={styles.helperText}>
            Select the regions in which you are available to travel for job assignments.
          </Text>

          <View style={styles.chipGrid}>
            {DEFAULT_AREAS.map((area) => {
              const isSelected = selectedAreas.includes(area.id);
              return (
                <TouchableOpacity
                  key={area.id}
                  style={[styles.serviceChip, isSelected && styles.serviceChipSelected]}
                  activeOpacity={0.7}
                  onPress={() => toggleArea(area.id)}
                >
                  <Ionicons
                    name={isSelected ? "location" : "location-outline"}
                    size={16}
                    color={isSelected ? "#1A6B6B" : "#6b7280"}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[styles.serviceChipText, isSelected && styles.serviceChipTextSelected]}
                  >
                    {area.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Section 3: Fresh Documents */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>3. Fresh Verification Documents</Text>
            <Text style={styles.sectionSubtitle}>
              {uploadedDocuments.length} files
            </Text>
          </View>
          <Text style={styles.helperText}>
            Upload clear photos or PDFs of your Government ID, trade license, certificates, or insurance (Max 10MB per file).
          </Text>

          {/* Upload Button */}
          <TouchableOpacity
            style={styles.uploadBox}
            activeOpacity={0.7}
            onPress={handlePickDocument}
          >
            <View style={styles.uploadIconCircle}>
              <Ionicons name="cloud-upload-outline" size={24} color="#1A6B6B" />
            </View>
            <Text style={styles.uploadBoxTitle}>Tap to select documents</Text>
            <Text style={styles.uploadBoxSubtitle}>Supports JPG, PNG, PDF, DOC, DOCX up to 10MB</Text>
          </TouchableOpacity>

          {/* List of picked files */}
          {uploadedDocuments.length > 0 && (
            <View style={styles.fileList}>
              {uploadedDocuments.map((doc, idx) => (
                <View key={idx} style={styles.fileItem}>
                  <Ionicons
                    name={doc.mimeType?.includes("pdf") ? "document-attach" : "image"}
                    size={20}
                    color="#1A6B6B"
                    style={{ marginRight: 10 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fileName} numberOfLines={1}>
                      {doc.name || `Document #${idx + 1}`}
                    </Text>
                    {doc.size ? (
                      <Text style={styles.fileSize}>
                        {(doc.size / 1024 / 1024).toFixed(2)} MB
                      </Text>
                    ) : null}
                  </View>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => removeDocument(idx)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={18} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          activeOpacity={0.8}
          onPress={handleSubmitReApplication}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Ionicons name="send" size={18} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.submitButtonText}>Submit Re-application</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
    paddingTop: Platform.OS === "android" ? 40 : 0,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "DemoOsbert-Bold",
    color: "#1f2937",
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDFA",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#CCFBF1",
    padding: 14,
    marginBottom: 20,
  },
  bannerTitle: {
    fontSize: 14,
    fontFamily: "Lato-Bold",
    color: "#0F766E",
    marginBottom: 2,
  },
  bannerText: {
    fontSize: 12,
    fontFamily: "Lato",
    color: "#115E59",
    lineHeight: 18,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: "Lato-Bold",
    color: "#1f2937",
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: "Lato-Bold",
    color: "#1A6B6B",
  },
  helperText: {
    fontSize: 12,
    fontFamily: "Lato",
    color: "#6b7280",
    marginBottom: 12,
    lineHeight: 16,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  serviceChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 20,
  },
  serviceChipSelected: {
    backgroundColor: "#F0FDFA",
    borderColor: "#99F6E4",
  },
  serviceChipText: {
    fontSize: 13,
    fontFamily: "Lato",
    color: "#4b5563",
  },
  serviceChipTextSelected: {
    fontFamily: "Lato-Bold",
    color: "#0F766E",
  },
  uploadBox: {
    borderWidth: 1.5,
    borderColor: "#1A6B6B",
    borderStyle: "dashed",
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
  },
  uploadIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E8F5F5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  uploadBoxTitle: {
    fontSize: 14,
    fontFamily: "Lato-Bold",
    color: "#1f2937",
    marginBottom: 2,
  },
  uploadBoxSubtitle: {
    fontSize: 11,
    fontFamily: "Lato",
    color: "#9ca3af",
  },
  fileList: {
    marginTop: 12,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    overflow: "hidden",
  },
  fileItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  fileName: {
    fontSize: 13,
    fontFamily: "Lato-Bold",
    color: "#1f2937",
  },
  fileSize: {
    fontSize: 11,
    fontFamily: "Lato",
    color: "#9ca3af",
    marginTop: 1,
  },
  deleteButton: {
    padding: 6,
  },
  submitButton: {
    flexDirection: "row",
    height: 52,
    backgroundColor: "#1A6B6B",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    shadowColor: "#1A6B6B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontFamily: "Lato-Bold",
  },
});
