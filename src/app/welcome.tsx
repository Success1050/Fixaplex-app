import { useRouter } from "expo-router";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function Welcome() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Image
          source={require("../../assets/images/2.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Welcome to Fixaplex</Text>
        <Text style={styles.subtitle}>Trusted & Reliable Local Home Services</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.loginButton]}
          onPress={() => router.push("/login")}
        >
          <Text style={styles.loginButtonText}>Login</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.visitorButton]}
          onPress={() => router.replace("/(tabs)" as any)}
        >
          <Text style={styles.visitorButtonText}>Continue as Guest</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1A6B6B", // Primary Brand Colour
    padding: 24,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    fontFamily: "DemoOsbert-Bold",
    color: "#ffffff",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Lato",
    color: "#E8F5F5", // Secondary accent light
    textAlign: "center",
  },
  buttonContainer: {
    gap: 16,
    paddingBottom: 24,
  },
  button: {
    height: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  visitorButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#5DD9D9", // Secondary Accent Colour
  },
  visitorButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },
  loginButton: {
    backgroundColor: "#5DD9D9", // Secondary Accent Colour
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#101828", // Dark gray from guide
  },
});
