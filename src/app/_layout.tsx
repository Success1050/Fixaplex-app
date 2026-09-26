import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StripeProvider } from '@stripe/stripe-react-native';
import { STRIPE_PUBLISHABLE_KEY } from "../config/api";

// Prevent auto hide
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    "Lato": require("../../assets/fonts/lato/Lato-Regular.ttf"),
    "Lato-Bold": require("../../assets/fonts/lato/Lato-Bold.ttf"),
    "DemoOsbert": require("../../assets/fonts/demo-osbert/Demo-OsbertDisplay-Regular-BF65bc67f7a4f41.otf"),
    "DemoOsbert-Bold": require("../../assets/fonts/demo-osbert/Demo-OsbertDisplay-Bold-BF65bc67f79f5bd.otf"),
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <StripeProvider
      publishableKey={STRIPE_PUBLISHABLE_KEY}
      merchantIdentifier="merchant.com.john_1050.ibb"
      urlScheme="ibb"
    >
      <QueryClientProvider client={queryClient}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="welcome" />
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(technician-tabs)" />
          <Stack.Screen name="bank-details" />
          <Stack.Screen name="payment-methods" />
          <Stack.Screen name="documents-verification" />
          <Stack.Screen name="awaiting-approval" />
          <Stack.Screen name="re-apply" />
        </Stack>
      </QueryClientProvider>
    </StripeProvider>
  );
}
