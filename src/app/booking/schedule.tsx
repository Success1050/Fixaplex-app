import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  TextInput,
  ScrollView,
  Modal,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Calendar } from "react-native-calendars";
import { useBookingStore } from "../../store/useBookingStore";
import { useAuthStore } from "../../store/useAuthStore";

export default function Schedule() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const userData = useAuthStore((state) => state.userData);

  const addressLine1 = useBookingStore((state) => state.addressLine1);
  const addressLine2 = useBookingStore((state) => state.addressLine2);
  const addressLine3 = useBookingStore((state) => state.addressLine3);
  const town = useBookingStore((state) => state.town);
  const county = useBookingStore((state) => state.county);
  const postcode = useBookingStore((state) => state.postcode);
  const setFullAddress = useBookingStore((state) => state.setFullAddress);

  const guestName = useBookingStore((state) => state.guestName);
  const guestPhone = useBookingStore((state) => state.guestPhone);
  const guestEmail = useBookingStore((state) => state.guestEmail);
  const setGuestContact = useBookingStore((state) => state.setGuestContact);

  const timingType = useBookingStore((state) => state.timingType);
  const setTiming = useBookingStore((state) => state.setTiming);

  const [country, setCountry] = useState("Ireland");

  const savedAddress = useBookingStore((state) => state.savedAddress);

  // Prefill address if saved in zustand or user profile and addressLine1 is empty
  useEffect(() => {
    if (!addressLine1) {
      if (savedAddress?.addressLine1) {
        setFullAddress(
          savedAddress.addressLine1,
          savedAddress.addressLine2 || "",
          savedAddress.addressLine3 || "",
          savedAddress.town || "",
          savedAddress.county || "",
          savedAddress.postcode || ""
        );
      } else if (userData?.address) {
        setFullAddress(
          userData.address,
          addressLine2,
          addressLine3,
          town || userData.town || "",
          county || userData.county || "",
          postcode || userData.postcode || userData.eircode || ""
        );
      }
    }
  }, [userData, savedAddress]);

  const [isDropdownOpen, setIsDropdownOpen] = useState(true);
  const [isTimeModalVisible, setIsTimeModalVisible] = useState(false);
  const [isFutureModalVisible, setIsFutureModalVisible] = useState(false);
  const [futureStep, setFutureStep] = useState(1); // 1 = Date, 2 = Time

  const [selectedDate, setSelectedDate] = useState("");

  const hoursList = ["08", "09", "10", "11", "12", "01", "02", "03", "04", "05"];
  const minutesList = ["00", "15", "30", "45"];

  const [selectedHour, setSelectedHour] = useState("11");
  const [selectedMinute, setSelectedMinute] = useState("30");
  const [selectedAmPm, setSelectedAmPm] = useState("AM");

  const setRawBookingDate = useBookingStore((state) => state.setRawBookingDate);

  const handleTimingSelect = (type: "ASAP" | "Tomorrow" | "Future") => {
    setIsDropdownOpen(false);
    if (type === "Tomorrow") {
      setIsTimeModalVisible(true);
    } else if (type === "Future") {
      setFutureStep(1);
      setIsFutureModalVisible(true);
    } else {
      setTiming(type);
    }
  };

  const handleTimeConfirm = () => {
    setIsTimeModalVisible(false);
    const finalTime = `${selectedHour}:${selectedMinute} ${selectedAmPm}`;
    setTiming("Tomorrow", "Tomorrow", finalTime);
  };

  const handleFutureConfirm = () => {
    if (futureStep === 1) {
      if (!selectedDate) {
        Alert.alert("Select Date", "Please select a date for your appointment.");
        return;
      }
      setFutureStep(2);
    } else {
      setIsFutureModalVisible(false);
      const finalTime = `${selectedHour}:${selectedMinute} ${selectedAmPm}`;
      const dateObj = new Date(selectedDate);
      const formattedDate = dateObj.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      });
      setRawBookingDate(selectedDate);
      setTiming("Future", formattedDate, finalTime);
    }
  };

  const isGuest = !userData;

  const validateIrishMobile = (phone: string) => {
    const clean = phone.replace(/[\s\-()]/g, "");
    // Irish mobiles: 08x xxx xxxx or +353 8x xxx xxxx (9 to 13 digits)
    return /^(\+353|00353|0)8[3-9]\d{7}$/.test(clean);
  };

  const isGuestContactFilled =
    !isGuest ||
    (guestName.trim().length > 0 &&
      guestPhone.trim().length > 0 &&
      guestEmail.trim().length > 0);

  const isAddressFilled =
    addressLine1.trim().length > 0 &&
    town.trim().length > 0 &&
    postcode.trim().length > 0;

  const isNextEnabled = isAddressFilled && !!timingType && isGuestContactFilled;

  const handleNext = () => {
    if (isGuest) {
      if (!guestName.trim() || !guestPhone.trim() || !guestEmail.trim()) {
        Alert.alert("Missing Contact Details", "Please fill in all contact details.");
        return;
      }
      if (!validateIrishMobile(guestPhone)) {
        Alert.alert(
          "Invalid Mobile Number",
          "Please enter a valid Irish mobile number (e.g. 087 123 4567 or +353 87 123 4567)."
        );
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(guestEmail.trim())) {
        Alert.alert("Invalid Email", "Please enter a valid email address.");
        return;
      }
    }

    if (!addressLine1.trim()) {
      Alert.alert("Missing Address", "Please enter your first address line.");
      return;
    }

    if (!town.trim()) {
      Alert.alert("Missing Town", "Please enter your town.");
      return;
    }

    if (!postcode.trim()) {
      Alert.alert("Missing Eircode", "Please enter your Eircode.");
      return;
    }

    if (!timingType) {
      Alert.alert("Select Timing", "Please select when you need this service.");
      return;
    }

    router.push("/booking/review");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Address & Schedule</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Guest Contact Details */}
        {isGuest && (
          <View style={styles.sectionContainer}>
            <Text style={styles.formTitle}>Contact Details</Text>

            <Text style={styles.labelForm}>
              Full Name <Text style={styles.requiredAsterisk}>*</Text>
            </Text>
            <TextInput
              style={styles.inputForm}
              placeholder="Enter your full name"
              placeholderTextColor="#9ca3af"
              value={guestName}
              onChangeText={(text) => setGuestContact(text, guestPhone, guestEmail)}
            />

            <Text style={styles.labelForm}>
              Mobile Number <Text style={styles.requiredAsterisk}>*</Text>
            </Text>
            <TextInput
              style={styles.inputForm}
              placeholder="e.g. 087 123 4567"
              placeholderTextColor="#9ca3af"
              keyboardType="phone-pad"
              value={guestPhone}
              onChangeText={(text) => setGuestContact(guestName, text, guestEmail)}
            />

            <Text style={styles.labelForm}>
              Email Address <Text style={styles.requiredAsterisk}>*</Text>
            </Text>
            <TextInput
              style={styles.inputForm}
              placeholder="Enter your email address"
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              autoCapitalize="none"
              value={guestEmail}
              onChangeText={(text) => setGuestContact(guestName, guestPhone, text)}
            />
          </View>
        )}

        <View style={styles.sectionContainer}>
          <Text style={styles.formTitle}>Your Address</Text>

          <Text style={styles.labelForm}>
            First Address Line <Text style={styles.requiredAsterisk}>*</Text>
          </Text>
          <TextInput
            style={styles.inputForm}
            value={addressLine1}
            placeholder="e.g. 12 High Street"
            placeholderTextColor="#9ca3af"
            onChangeText={(text) =>
              setFullAddress(text, addressLine2, addressLine3, town, county, postcode)
            }
          />

          <Text style={styles.labelForm}>Second Address Line</Text>
          <TextInput
            style={styles.inputForm}
            value={addressLine2}
            placeholder="Apartment, suite, etc."
            placeholderTextColor="#9ca3af"
            onChangeText={(text) =>
              setFullAddress(addressLine1, text, addressLine3, town, county, postcode)
            }
          />

          <Text style={styles.labelForm}>Third Address Line</Text>
          <TextInput
            style={styles.inputForm}
            value={addressLine3}
            placeholder="Optional additional address details"
            placeholderTextColor="#9ca3af"
            onChangeText={(text) =>
              setFullAddress(addressLine1, addressLine2, text, town, county, postcode)
            }
          />

          <Text style={styles.labelForm}>
            Town <Text style={styles.requiredAsterisk}>*</Text>
          </Text>
          <TextInput
            style={styles.inputForm}
            value={town}
            placeholder="e.g. Dublin"
            placeholderTextColor="#9ca3af"
            onChangeText={(text) =>
              setFullAddress(addressLine1, addressLine2, addressLine3, text, county, postcode)
            }
          />

          <Text style={styles.labelForm}>County</Text>
          <TextInput
            style={styles.inputForm}
            value={county}
            placeholder="e.g. Co. Dublin"
            placeholderTextColor="#9ca3af"
            onChangeText={(text) =>
              setFullAddress(addressLine1, addressLine2, addressLine3, town, text, postcode)
            }
          />

          <Text style={styles.labelForm}>
            Eircode <Text style={styles.requiredAsterisk}>*</Text>
          </Text>
          <TextInput
            style={styles.inputForm}
            value={postcode}
            placeholder="e.g. D02 X285"
            placeholderTextColor="#9ca3af"
            autoCapitalize="characters"
            onChangeText={(text) =>
              setFullAddress(addressLine1, addressLine2, addressLine3, town, county, text)
            }
          />

          <Text style={styles.labelForm}>
            Country <Text style={styles.requiredAsterisk}>*</Text>
          </Text>
          <TextInput
            style={[styles.inputForm, styles.inputDisabled]}
            value={country}
            editable={false}
            placeholder="Ireland"
            placeholderTextColor="#6b7280"
          />
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.labelSchedule}>
            When do you need this service <Text style={styles.requiredAsterisk}>*</Text>
          </Text>
          <TouchableOpacity
            style={styles.dropdownHeader}
            onPress={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <Text style={styles.dropdownText}>{timingType || "Select service timing"}</Text>
            <Ionicons
              name={isDropdownOpen ? "chevron-up" : "chevron-down"}
              size={20}
              color="#9ca3af"
            />
          </TouchableOpacity>

          {isDropdownOpen && (
            <View style={styles.dropdownList}>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => handleTimingSelect("ASAP")}
              >
                <Ionicons name="car-outline" size={24} color="#1A6B6B" style={styles.itemIcon} />
                <View>
                  <Text style={styles.itemTitle}>ASAP</Text>
                  <Text style={styles.itemSubtitle}>I need this service right now</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => handleTimingSelect("Tomorrow")}
              >
                <Ionicons name="time-outline" size={24} color="#1A6B6B" style={styles.itemIcon} />
                <View>
                  <Text style={styles.itemTitle}>Tomorrow</Text>
                  <Text style={styles.itemSubtitle}>I need this service tomorrow</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => handleTimingSelect("Future")}
              >
                <Ionicons
                  name="calendar-outline"
                  size={24}
                  color="#1A6B6B"
                  style={styles.itemIcon}
                />
                <View>
                  <Text style={styles.itemTitle}>Sometime in the future</Text>
                  <Text style={styles.itemSubtitle}>
                    I will arrange a date & time for the service.
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom + 12, Platform.OS === "android" ? 28 : 16) },
        ]}
      >
        <TouchableOpacity
          style={[styles.nextButton, !isNextEnabled && styles.nextButtonDisabled]}
          onPress={handleNext}
        >
          <Text
            style={[styles.nextButtonText, !isNextEnabled && styles.nextButtonTextDisabled]}
          >
            Next
          </Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Sheet Modal for Tomorrow's Time */}
      <Modal visible={isTimeModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalDismiss}
            onPress={() => setIsTimeModalVisible(false)}
          />
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>What time tomorrow?</Text>

            <View style={styles.timePickerMock}>
              <ScrollView style={styles.scrollCol} showsVerticalScrollIndicator={false}>
                {hoursList.map((h) => (
                  <TouchableOpacity key={h} onPress={() => setSelectedHour(h)}>
                    <Text style={selectedHour === h ? styles.timeActive : styles.timeMuted}>
                      {h}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={styles.timeActive}>:</Text>
              <ScrollView style={styles.scrollCol} showsVerticalScrollIndicator={false}>
                {minutesList.map((m) => (
                  <TouchableOpacity key={m} onPress={() => setSelectedMinute(m)}>
                    <Text style={selectedMinute === m ? styles.timeActive : styles.timeMuted}>
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={styles.amPmCol}>
                <TouchableOpacity onPress={() => setSelectedAmPm("AM")}>
                  <Text style={selectedAmPm === "AM" ? styles.amPmActive : styles.amPmMuted}>
                    AM
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setSelectedAmPm("PM")}>
                  <Text style={selectedAmPm === "PM" ? styles.amPmActive : styles.amPmMuted}>
                    PM
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalNextButton} onPress={handleTimeConfirm}>
                <Text style={styles.modalNextText}>Confirm Time</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bottom Sheet Modal for Future Date & Time */}
      <Modal visible={isFutureModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalDismiss}
            onPress={() => setIsFutureModalVisible(false)}
          />
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {futureStep === 1 ? "Select Date" : "Select Time"}
            </Text>

            {futureStep === 1 ? (
              <View style={styles.calendarContainer}>
                <Calendar
                  onDayPress={(day: any) => setSelectedDate(day.dateString)}
                  markedDates={{
                    [selectedDate]: { selected: true, selectedColor: "#1A6B6B" },
                  }}
                  minDate={new Date().toISOString().split("T")[0]}
                  theme={{
                    todayTextColor: "#1A6B6B",
                    arrowColor: "#1A6B6B",
                    textDayFontFamily: "Lato",
                    textMonthFontFamily: "Lato-Bold",
                    textDayHeaderFontFamily: "Lato",
                  }}
                />
              </View>
            ) : (
              <View style={styles.timePickerMock}>
                <ScrollView style={styles.scrollCol} showsVerticalScrollIndicator={false}>
                  {hoursList.map((h) => (
                    <TouchableOpacity key={h} onPress={() => setSelectedHour(h)}>
                      <Text style={selectedHour === h ? styles.timeActive : styles.timeMuted}>
                        {h}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <Text style={styles.timeActive}>:</Text>
                <ScrollView style={styles.scrollCol} showsVerticalScrollIndicator={false}>
                  {minutesList.map((m) => (
                    <TouchableOpacity key={m} onPress={() => setSelectedMinute(m)}>
                      <Text style={selectedMinute === m ? styles.timeActive : styles.timeMuted}>
                        {m}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <View style={styles.amPmCol}>
                  <TouchableOpacity onPress={() => setSelectedAmPm("AM")}>
                    <Text style={selectedAmPm === "AM" ? styles.amPmActive : styles.amPmMuted}>
                      AM
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setSelectedAmPm("PM")}>
                    <Text style={selectedAmPm === "PM" ? styles.amPmActive : styles.amPmMuted}>
                      PM
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalNextButton} onPress={handleFutureConfirm}>
                <Text style={styles.modalNextText}>
                  {futureStep === 1 ? "Next: Select Time" : "Confirm Schedule"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    padding: 20,
    paddingBottom: 30,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 18,
    fontFamily: "DemoOsbert-Bold",
    color: "#1f2937",
    marginBottom: 12,
  },
  labelForm: {
    fontSize: 14,
    fontFamily: "Lato-Bold",
    color: "#374151",
    marginTop: 12,
    marginBottom: 6,
  },
  labelSchedule: {
    fontSize: 16,
    fontFamily: "Lato-Bold",
    color: "#1f2937",
    marginBottom: 10,
  },
  inputForm: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 50,
    fontSize: 15,
    fontFamily: "Lato",
    backgroundColor: "#f9fafb",
    color: "#1f2937",
  },
  inputDisabled: {
    backgroundColor: "#f3f4f6",
    color: "#4b5563",
  },
  dropdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 16,
    height: 50,
    backgroundColor: "#f9fafb",
  },
  dropdownText: {
    fontSize: 15,
    fontFamily: "Lato",
    color: "#1f2937",
  },
  dropdownList: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    marginTop: 10,
    padding: 6,
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  itemIcon: {
    marginRight: 14,
  },
  itemTitle: {
    fontSize: 15,
    fontFamily: "Lato-Bold",
    color: "#1f2937",
    marginBottom: 2,
  },
  itemSubtitle: {
    fontSize: 12,
    fontFamily: "Lato",
    color: "#6b7280",
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    backgroundColor: "#ffffff",
  },
  nextButton: {
    backgroundColor: "#1A6B6B",
    paddingVertical: 16,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalDismiss: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Lato-Bold",
    color: "#1f2937",
    marginBottom: 24,
  },
  timePickerMock: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
    height: 150,
  },
  scrollCol: {
    marginHorizontal: 16,
    maxHeight: 150,
  },
  timeActive: {
    fontSize: 32,
    fontFamily: "Lato-Bold",
    color: "#1A6B6B",
    marginVertical: 12,
    textAlign: "center",
  },
  timeMuted: {
    fontSize: 20,
    fontFamily: "Lato",
    color: "#9ca3af",
    marginVertical: 16,
    textAlign: "center",
  },
  amPmCol: {
    marginLeft: 20,
    justifyContent: "center",
  },
  amPmActive: {
    fontSize: 16,
    fontFamily: "Lato-Bold",
    color: "#1A6B6B",
    marginVertical: 12,
  },
  amPmMuted: {
    fontSize: 14,
    fontFamily: "Lato",
    color: "#9ca3af",
    marginVertical: 12,
  },
  calendarContainer: {
    width: "100%",
    marginBottom: 24,
  },
  modalFooter: {
    alignItems: "flex-end",
  },
  modalNextButton: {
    backgroundColor: "#1A6B6B",
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 24,
  },
  modalNextText: {
    color: "#ffffff",
    fontFamily: "Lato-Bold",
    fontSize: 15,
  },
});
