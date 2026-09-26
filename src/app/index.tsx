import { useEffect } from "react";
import { View, Image, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useAuthStore } from "../store/useAuthStore";

export default function Index() {
  const router = useRouter();
  const setUserData = useAuthStore(state => state.setUserData);
  const setRoleStore = useAuthStore(state => state.setRole);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await SecureStore.getItemAsync('userToken');
        const expiresStr = await SecureStore.getItemAsync('userExpires');
        const role = await SecureStore.getItemAsync('userRole');
        const userDataStr = await SecureStore.getItemAsync('userData');
        
        let isValid = false;
        if (token && expiresStr) {
          // Check expiration
          const expiresDate = new Date(expiresStr.replace(' ', 'T')); // Handle format "YYYY-MM-DD HH:mm:ss"
          if (new Date() < expiresDate) {
            isValid = true;
          }
        } else if (token && !expiresStr) {
          // If backend didn't return expires, assume valid for now
          isValid = true; 
        }

        if (isValid && role) {
          if (userDataStr) {
            setUserData(JSON.parse(userDataStr));
          }
          setRoleStore(role === 'client' ? 'user' : 'technician');
          
          if (role === 'client') {
            router.replace("/(tabs)" as any);
          } else {
            router.replace("/(technician-tabs)" as any);
          }
          return;
        }
        
        // If no valid token, go to welcome
        router.replace("/welcome");
      } catch (err) {
        console.error("Auth check failed:", err);
        router.replace("/welcome");
      }
    };
    
    // Smooth splash delay with branding
    const timer = setTimeout(() => {
      checkAuth();
    }, 2500);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View style={styles.container}>
      <Image
        source={require("../../assets/images/2.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.brandTitle}>Fixaplex</Text>
      <Text style={styles.brandSubtitle}>Home Services, Made Easy</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 12,
  },
  brandTitle: {
    fontSize: 28,
    fontFamily: "DemoOsbert-Bold",
    fontWeight: "bold",
    color: "#1A6B6B",
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 14,
    fontFamily: "Lato",
    color: "#6b7280",
    marginTop: 4,
  },
});

