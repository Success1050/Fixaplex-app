import React, { useState } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView, 
  Alert, 
  Image, 
  ActivityIndicator 
} from "react-native";
import { useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { BASE_URL } from "../config/api";
import { useAuthStore } from "../store/useAuthStore";

const SERVICE_OPTIONS = [
  { id: "2", title: "Plumber", icon: "water-outline", type: "ionicons", color: "#0284c7", bg: "#e0f2fe" },
  { id: "8", title: "Electrician", icon: "flash-outline", type: "ionicons", color: "#d97706", bg: "#fef3c7" },
  { id: "16", title: "Cleaner", icon: "cleaning-services", type: "material", color: "#16a34a", bg: "#dcfce7" },
  { id: "10", title: "Handyman", icon: "tools", type: "fontawesome", color: "#9333ea", bg: "#f3e8ff" },
];

export default function Register() {
  const router = useRouter();
  const storeRole = useAuthStore(state => state.role);
  const role = storeRole === 'technician' ? 'technician' : 'client';
  const [techStep, setTechStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);

  // Shared state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profilePic, setProfilePic] = useState<ImagePicker.ImagePickerAsset | null>(null);

  // Technician state
  const [areas, setAreas] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [apiServices, setApiServices] = useState<any[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [govIdDoc, setGovIdDoc] = useState<DocumentPicker.DocumentPickerAsset | ImagePicker.ImagePickerAsset | null>(null);
  const [tradeLicenseDoc, setTradeLicenseDoc] = useState<DocumentPicker.DocumentPickerAsset | ImagePicker.ImagePickerAsset | null>(null);

  React.useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoadingServices(true);
        const res = await axios.post(`${BASE_URL}/clients/home/categories.php`);
        if (res.data && res.data.success) {
          setApiServices(res.data.categories || res.data.services || []);
        }
      } catch (err) {
        console.error("Failed to fetch categories from categories.php:", err);
      } finally {
        setLoadingServices(false);
      }
    };

    fetchServices();
  }, []);

  const getCategoryIconDetails = (categoryId: string) => {
    const id = parseInt(categoryId, 10);
    if ([2, 3, 4].includes(id)) {
      return { icon: <Ionicons name="water-outline" size={38} color="#0284c7" />, bg: "#e0f2fe" };
    }
    if ([8].includes(id)) {
      return { icon: <Ionicons name="flash-outline" size={38} color="#d97706" />, bg: "#fef3c7" };
    }
    if ([16].includes(id)) {
      return { icon: <MaterialIcons name="cleaning-services" size={38} color="#16a34a" />, bg: "#dcfce7" };
    }
    return { icon: <FontAwesome5 name="tools" size={30} color="#9333ea" />, bg: "#f3e8ff" };
  };

  const pickProfilePic = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled) {
      setProfilePic(result.assets[0]);
    }
  };

  const pickDoc = async (type: 'govId' | 'tradeLicense') => {
    Alert.alert(
      "Upload Document",
      "Choose upload method",
      [
        {
          text: "Choose File / Document",
          onPress: async () => {
            const result = await DocumentPicker.getDocumentAsync({
              type: ['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
            });
            if (!result.canceled) {
              if (type === 'govId') setGovIdDoc(result.assets[0]);
              else setTradeLicenseDoc(result.assets[0]);
            }
          }
        },
        {
          text: "Photo Library",
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.7,
            });
            if (!result.canceled) {
              if (type === 'govId') setGovIdDoc(result.assets[0]);
              else setTradeLicenseDoc(result.assets[0]);
            }
          }
        },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  const toggleService = (serviceId: string) => {
    if (selectedServices.includes(serviceId)) {
      setSelectedServices(selectedServices.filter(s => s !== serviceId));
    } else {
      setSelectedServices([...selectedServices, serviceId]);
    }
  };

  const handleNextStep1 = () => {
    if (!name || !email || !phone || !password || !confirmPassword || !areas) {
      Alert.alert('Required Fields', 'Please fill in all required fields (Full Name, Email, Phone, Password, Confirm Password, Service Areas).');
      return;
    }
    if (phone.length < 9) {
      Alert.alert('Invalid Phone', 'Phone number must be at least 9 characters.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Invalid Password', 'Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Password and Confirm Password do not match.');
      return;
    }
    setTechStep(2);
  };

  const handleNextStep2 = () => {
    if (selectedServices.length === 0) {
      Alert.alert('Service Required', 'Please select at least one service that you offer.');
      return;
    }
    setTechStep(3);
  };

  const handleRegister = async () => {
    if (role === 'client') {
      if (!name || !email || !phone || !password || !confirmPassword) {
        Alert.alert('Error', 'Please fill in all required fields (Name, Email, Phone, Password, Confirm Password).');
        return;
      }
      if (password.length < 8) {
        Alert.alert('Invalid Password', 'Password must be at least 8 characters.');
        return;
      }
      if (password !== confirmPassword) {
        Alert.alert('Password Mismatch', 'Password and Confirm Password do not match.');
        return;
      }
    } else {
      if (!govIdDoc && !tradeLicenseDoc) {
        Alert.alert('Document Required', 'Please upload at least your Government Issued ID or Trade License.');
        return;
      }
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('email', email);
      formData.append('phone', phone);
      if (address) formData.append('address', address);
      formData.append('password', password);

      if (profilePic) {
        formData.append('profile_pic', {
          uri: String(profilePic.uri),
          name: String(profilePic.fileName || 'profile.jpg'),
          type: String(profilePic.mimeType || 'image/jpeg'),
        } as any);
      }

      if (role === 'technician') {
        // Send numeric service IDs as a comma-separated string
        formData.append('services', selectedServices.join(','));

        // Ensure areas are sent as numeric IDs (defaulting to "1" if text was entered)
        const formattedArea = /^\d+/.test(areas.trim()) ? areas.trim() : "1";
        formData.append('areas', String(formattedArea));

        if (govIdDoc) {
          const mime = govIdDoc.mimeType && govIdDoc.mimeType !== 'application/octet-stream' 
            ? govIdDoc.mimeType 
            : 'image/jpeg';
          formData.append('documents[]', {
            uri: String(govIdDoc.uri),
            name: String((govIdDoc as any).name || (govIdDoc as any).fileName || 'government_id.jpg'),
            type: String(mime),
          } as any);
        }

        if (tradeLicenseDoc) {
          const mime = tradeLicenseDoc.mimeType && tradeLicenseDoc.mimeType !== 'application/octet-stream' 
            ? tradeLicenseDoc.mimeType 
            : 'application/pdf';
          formData.append('documents[]', {
            uri: String(tradeLicenseDoc.uri),
            name: String((tradeLicenseDoc as any).name || (tradeLicenseDoc as any).fileName || 'trade_license.pdf'),
            type: String(mime),
          } as any);
        }
      }

      const endpoint = role === 'client' 
        ? `${BASE_URL}/clients/account/register.php`
        : `${BASE_URL}/technicians/accounts/register.php`;

      // IMPORTANT: Do NOT set Content-Type header — axios will auto-set it
      // with the correct multipart/form-data boundary when it detects FormData
      const response = await axios.post(endpoint, formData);

      console.log('--- REGISTRATION API RESPONSE ---');
      console.log(JSON.stringify(response.data, null, 2));

      if (response.data.success || response.data.userData) {
        if (router.canDismiss()) {
          router.dismissAll();
        }

        const successMsg = response.data.msg || (role === 'technician' 
          ? 'Your technician application has been created and is pending review. Please login to check status.'
          : 'Your account has been created successfully. Please login to continue.');

        Alert.alert('Registration Successful', successMsg);
        router.replace('/login' as any);
      } else {
        Alert.alert('Registration Failed', response.data.msg || 'An error occurred during registration.');
      }
    } catch (error: any) {
      console.error(error);
      const serverMsg = error.response?.data?.msg || error.message;
      Alert.alert('Error', serverMsg || 'Network error or server unavailable.');
    } finally {
      setLoading(false);
    }
  };

  // Render Client Form
  const renderClientForm = () => (
    <View style={styles.form}>
      {/* Profile Picture Picker */}
      <View style={styles.profilePicContainer}>
        <TouchableOpacity style={styles.profilePicButton} onPress={pickProfilePic}>
          {profilePic ? (
            <Image source={{ uri: profilePic.uri }} style={styles.profilePic} />
          ) : (
            <View style={styles.profilePicPlaceholder}>
              <Ionicons name="camera" size={32} color="#9ca3af" />
              <Text style={styles.profilePicText}>Upload Photo</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Full Name *</Text>
        <TextInput style={styles.input} placeholder="Enter your full name" placeholderTextColor="#9ca3af" value={name} onChangeText={setName} />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Email *</Text>
        <TextInput style={styles.input} placeholder="Enter your email" placeholderTextColor="#9ca3af" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Phone *</Text>
        <TextInput style={styles.input} placeholder="Enter your phone number" placeholderTextColor="#9ca3af" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Password * (Min 8 chars)</Text>
        <View style={styles.passwordWrapper}>
          <TextInput 
            style={styles.passwordInput} 
            placeholder="Create a password" 
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
            <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={22} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Confirm Password *</Text>
        <View style={styles.passwordWrapper}>
          <TextInput 
            style={styles.passwordInput} 
            placeholder="Confirm your password" 
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
            <Ionicons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={22} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity 
        style={[styles.primaryButton, loading && styles.buttonDisabled]}
        onPress={handleRegister}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.primaryButtonText}>Register as Client</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  // Render Technician Step 1 (Basic Info)
  const renderTechStep1 = () => (
    <View style={styles.form}>
      {/* Profile Picture Picker */}
      <View style={styles.profilePicContainer}>
        <TouchableOpacity style={styles.profilePicButton} onPress={pickProfilePic}>
          {profilePic ? (
            <Image source={{ uri: profilePic.uri }} style={styles.profilePic} />
          ) : (
            <View style={styles.profilePicPlaceholder}>
              <Ionicons name="camera" size={32} color="#9ca3af" />
              <Text style={styles.profilePicText}>Upload Photo</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Full Name *</Text>
        <TextInput style={styles.input} placeholder="Enter your full name" placeholderTextColor="#9ca3af" value={name} onChangeText={setName} />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Email *</Text>
        <TextInput style={styles.input} placeholder="Enter your email" placeholderTextColor="#9ca3af" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Phone * (Min 9 chars)</Text>
        <TextInput style={styles.input} placeholder="Enter your phone number" placeholderTextColor="#9ca3af" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Password * (Min 8 chars)</Text>
        <View style={styles.passwordWrapper}>
          <TextInput 
            style={styles.passwordInput} 
            placeholder="Create a password" 
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
            <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={22} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Confirm Password *</Text>
        <View style={styles.passwordWrapper}>
          <TextInput 
            style={styles.passwordInput} 
            placeholder="Confirm your password" 
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
            <Ionicons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={22} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Service Areas *</Text>
        <TextInput style={styles.input} placeholder="Enter service areas (e.g. Dublin 1 - 24, County Dublin)" placeholderTextColor="#9ca3af" value={areas} onChangeText={setAreas} />
      </View>

      <TouchableOpacity 
        style={styles.primaryButton}
        onPress={handleNextStep1}
      >
        <Text style={styles.primaryButtonText}>Next</Text>
      </TouchableOpacity>
    </View>
  );

  // Render Technician Step 2 (What do you do?)
  const renderTechStep2 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <TouchableOpacity style={styles.backButton} onPress={() => setTechStep(1)}>
          <Ionicons name="chevron-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.stepTitle}>What do you do?</Text>
      </View>

      {loadingServices ? (
        <ActivityIndicator size="large" color="#1A6B6B" style={{ marginVertical: 40 }} />
      ) : (
        <View style={styles.servicesGrid}>
          {(apiServices.length > 0 ? apiServices : SERVICE_OPTIONS).map((item) => {
            const sId = item.id.toString();
            const isSelected = selectedServices.includes(sId);
            const title = item.name || item.title;
            const { icon, bg } = item.category_id 
              ? getCategoryIconDetails(item.category_id)
              : { 
                  icon: item.type === 'ionicons' ? <Ionicons name={item.icon as any} size={38} color={item.color} /> : <FontAwesome5 name={item.icon as any} size={30} color={item.color} />,
                  bg: item.bg || '#f3f4f6'
                };

            return (
              <TouchableOpacity 
                key={sId}
                style={[styles.serviceCard, isSelected && styles.serviceCardSelected]}
                onPress={() => toggleService(sId)}
                activeOpacity={0.8}
              >
                {isSelected && (
                  <View style={styles.checkmarkBadge}>
                    <Ionicons name="checkmark-circle" size={20} color="#1A6B6B" />
                  </View>
                )}
                <View style={[styles.serviceIconCircle, { backgroundColor: bg }]}>
                  {icon}
                </View>
                <Text style={styles.serviceCardTitle} numberOfLines={2}>{title}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <TouchableOpacity 
        style={[styles.primaryButton, selectedServices.length === 0 && styles.buttonDisabled]}
        onPress={handleNextStep2}
        disabled={selectedServices.length === 0}
      >
        <Text style={styles.primaryButtonText}>Next</Text>
      </TouchableOpacity>
    </View>
  );

  // Render Technician Step 3 (Submit Government ID)
  const renderTechStep3 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <TouchableOpacity style={styles.backButton} onPress={() => setTechStep(2)}>
          <Ionicons name="chevron-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.stepTitle}>Submit Government ID</Text>
      </View>

      <View style={styles.docUploadList}>
        {/* Government Issued ID Card */}
        <TouchableOpacity 
          style={[styles.docUploadCard, govIdDoc && styles.docUploadCardActive]} 
          onPress={() => pickDoc('govId')}
          activeOpacity={0.8}
        >
          <View style={styles.docIconBox}>
            <Ionicons name="card-outline" size={28} color={govIdDoc ? "#1A6B6B" : "#6b7280"} />
          </View>
          <View style={styles.docInfoBox}>
            <Text style={styles.docTitle}>Government Issued ID</Text>
            <Text style={styles.docSubtitle} numberOfLines={1}>
              {govIdDoc 
                ? ((govIdDoc as any).name || (govIdDoc as any).fileName || 'Document attached') 
                : "Upload passport, driver's license or National ID"}
            </Text>
          </View>
          {govIdDoc ? (
            <Ionicons name="checkmark-circle" size={24} color="#1A6B6B" />
          ) : (
            <Ionicons name="cloud-upload-outline" size={24} color="#9ca3af" />
          )}
        </TouchableOpacity>

        {/* Trade License Card */}
        <TouchableOpacity 
          style={[styles.docUploadCard, tradeLicenseDoc && styles.docUploadCardActive]} 
          onPress={() => pickDoc('tradeLicense')}
          activeOpacity={0.8}
        >
          <View style={styles.docIconBox}>
            <Ionicons name="document-text-outline" size={28} color={tradeLicenseDoc ? "#1A6B6B" : "#6b7280"} />
          </View>
          <View style={styles.docInfoBox}>
            <Text style={styles.docTitle}>Trade License</Text>
            <Text style={styles.docSubtitle} numberOfLines={1}>
              {tradeLicenseDoc 
                ? ((tradeLicenseDoc as any).name || (tradeLicenseDoc as any).fileName || 'Document attached') 
                : "Upload professional license or certification"}
            </Text>
          </View>
          {tradeLicenseDoc ? (
            <Ionicons name="checkmark-circle" size={24} color="#1A6B6B" />
          ) : (
            <Ionicons name="cloud-upload-outline" size={24} color="#9ca3af" />
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={[styles.primaryButton, loading && styles.buttonDisabled]}
        onPress={handleRegister}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.primaryButtonText}>Submit Application</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Render Main Header only on Step 1 (or Client) */}
        {(role === 'client' || techStep === 1) && (
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Sign up to get started with Fixaplex</Text>
          </View>
        )}

        {role === 'client' && renderClientForm()}
        {role === 'technician' && techStep === 1 && renderTechStep1()}
        {role === 'technician' && techStep === 2 && renderTechStep2()}
        {role === 'technician' && techStep === 3 && renderTechStep3()}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push("/login")}>
            <Text style={styles.link}>Login</Text>
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
    paddingTop: Platform.OS === 'android' ? 50 : 30,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontFamily: "DemoOsbert-Bold",
    color: "#1f2937",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
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
    gap: 16,
  },
  profilePicContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  profilePicButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  profilePic: {
    width: '100%',
    height: '100%',
  },
  profilePicPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePicText: {
    fontSize: 11,
    fontFamily: 'Lato',
    color: '#9ca3af',
    marginTop: 4,
  },
  inputContainer: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Lato-Bold',
    color: "#374151",
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    backgroundColor: "#f9fafb",
    fontFamily: 'Lato',
    color: "#1f2937",
  },
  passwordWrapper: {
    height: 52,
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
    fontSize: 15,
    fontFamily: 'Lato',
    color: "#1f2937",
  },
  eyeButton: {
    padding: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  stepContainer: {
    flex: 1,
    gap: 24,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepTitle: {
    fontSize: 22,
    fontFamily: 'DemoOsbert-Bold',
    color: '#1f2937',
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  serviceCard: {
    width: '47%',
    height: 170,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  serviceCardSelected: {
    borderColor: '#1A6B6B',
    borderWidth: 2,
    backgroundColor: '#f0fdfa',
  },
  checkmarkBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  serviceIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  serviceCardTitle: {
    fontSize: 16,
    fontFamily: 'DemoOsbert-Bold',
    color: '#1f2937',
    textAlign: 'center',
  },
  docUploadList: {
    gap: 16,
    marginVertical: 12,
  },
  docUploadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    padding: 16,
    backgroundColor: '#ffffff',
  },
  docUploadCardActive: {
    borderColor: '#1A6B6B',
    backgroundColor: '#f0fdfa',
  },
  docIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  docInfoBox: {
    flex: 1,
    marginRight: 8,
  },
  docTitle: {
    fontSize: 15,
    fontFamily: 'Lato-Bold',
    color: '#1f2937',
    marginBottom: 2,
  },
  docSubtitle: {
    fontSize: 12,
    fontFamily: 'Lato',
    color: '#9ca3af',
  },
  primaryButton: {
    height: 54,
    backgroundColor: "#1A6B6B",
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: 'Lato-Bold',
    color: "#ffffff",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 32,
    marginBottom: 40,
  },
  footerText: {
    color: "#6b7280",
    fontSize: 15,
    fontFamily: 'Lato',
  },
  link: {
    color: "#1A6B6B",
    fontSize: 15,
    fontFamily: 'Lato-Bold',
  },
});
