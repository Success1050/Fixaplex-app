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
        source={require("../../assets/images/logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      <Image
        source={require("../../assets/images/fixaplex-text.png")}
        style={styles.brandWordmark}
        resizeMode="contain"
      />
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
    width: 105,
    height: 105,
  },
  brandWordmark: {
    width: 125,
    height: 39,
    marginTop: 8,
  },
});

