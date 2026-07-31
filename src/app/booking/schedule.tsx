import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform, TextInput, ScrollView, Modal } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useBookingStore } from "../../store/useBookingStore";
import { Calendar } from 'react-native-calendars';

export default function Schedule() {
  const router = useRouter();
  
  const addressLine1 = useBookingStore(state => state.addressLine1);
  const addressLine2 = useBookingStore(state => state.addressLine2);
  const addressLine3 = useBookingStore(state => state.addressLine3);
  const town = useBookingStore(state => state.town);
  const county = useBookingStore(state => state.county);
  const postcode = useBookingStore(state => state.postcode);
  const setFullAddress = useBookingStore(state => state.setFullAddress);
  
  const timingType = useBookingStore(state => state.timingType);
  const setTiming = useBookingStore(state => state.setTiming);

  const [isDropdownOpen, setIsDropdownOpen] = useState(true);
  const [isTimeModalVisible, setIsTimeModalVisible] = useState(false);
  const [isFutureModalVisible, setIsFutureModalVisible] = useState(false);
  const [futureStep, setFutureStep] = useState(1); // 1 = Date, 2 = Time
  
  const [selectedTime, setSelectedTime] = useState("11:30 AM");
  const [selectedDate, setSelectedDate] = useState("");

  const hoursList = ["08", "09", "10", "11", "12", "01", "02", "03", "04", "05"];
  const minutesList = ["00", "15", "30", "45"];
  
  const [selectedHour, setSelectedHour] = useState("11");
  const [selectedMinute, setSelectedMinute] = useState("30");
  const [selectedAmPm, setSelectedAmPm] = useState("AM");

  const handleTimingSelect = (type: 'ASAP' | 'Tomorrow' | 'Future') => {
    setIsDropdownOpen(false);
    if (type === 'Tomorrow') {
      setIsTimeModalVisible(true);
    } else if (type === 'Future') {
      setFutureStep(1);
      setIsFutureModalVisible(true);
    } else {
      setTiming(type);
    }
  };

  const handleTimeConfirm = () => {
    setIsTimeModalVisible(false);
    const finalTime = `${selectedHour}:${selectedMinute} ${selectedAmPm}`;
    setTiming('Tomorrow', 'Tomorrow', finalTime);
  };

  const handleFutureConfirm = () => {
    if (futureStep === 1) {
      if (!selectedDate) {
        alert("Please select a date.");
        return;
      }
      setFutureStep(2);
    } else {
      setIsFutureModalVisible(false);
      const finalTime = `${selectedHour}:${selectedMinute} ${selectedAmPm}`;
      
      const dateObj = new Date(selectedDate);
      const formattedDate = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      
      setTiming('Future', formattedDate, finalTime);
    }
  };

  const isNextEnabled = addressLine1.trim().length > 0 && town.trim().length > 0 && postcode.trim().length > 0 && timingType;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Describe the issue</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.formTitle}>Your Address</Text>
        
        <Text style={styles.labelForm}>First Address Line</Text>
        <TextInput 
          style={styles.inputForm}
          value={addressLine1}
          onChangeText={(text) => setFullAddress(text, addressLine2, addressLine3, town, county, postcode)}
        />

        <Text style={styles.labelForm}>Second Address Line</Text>
        <TextInput 
          style={styles.inputForm}
          value={addressLine2}
          onChangeText={(text) => setFullAddress(addressLine1, text, addressLine3, town, county, postcode)}
        />

        <Text style={styles.labelForm}>Third Address Line</Text>
        <TextInput 
          style={styles.inputForm}
          value={addressLine3}
          onChangeText={(text) => setFullAddress(addressLine1, addressLine2, text, town, county, postcode)}
        />

        <Text style={styles.labelForm}>Town</Text>
        <TextInput 
          style={styles.inputForm}
          value={town}
          onChangeText={(text) => setFullAddress(addressLine1, addressLine2, addressLine3, text, county, postcode)}
        />

        <Text style={styles.labelForm}>County</Text>
        <TextInput 
          style={styles.inputForm}
          value={county}
          onChangeText={(text) => setFullAddress(addressLine1, addressLine2, addressLine3, town, text, postcode)}
        />

        <Text style={styles.labelForm}>Air code</Text>
        <TextInput 
          style={styles.inputForm}
          value={postcode}
          onChangeText={(text) => setFullAddress(addressLine1, addressLine2, addressLine3, town, county, text)}
        />

        <Text style={styles.label}>When do you need a technician</Text>
        <TouchableOpacity 
          style={styles.dropdownHeader}
          onPress={() => setIsDropdownOpen(!isDropdownOpen)}
        >
          <Text style={styles.dropdownText}>{timingType}</Text>
          <Ionicons name={isDropdownOpen ? "chevron-up" : "chevron-down"} size={20} color="#9ca3af" />
        </TouchableOpacity>

        {isDropdownOpen && (
          <View style={styles.dropdownList}>
            <TouchableOpacity style={styles.dropdownItem} onPress={() => handleTimingSelect('ASAP')}>
              <Ionicons name="car-outline" size={24} color="#6b7280" style={styles.itemIcon} />
              <View>
                <Text style={styles.itemTitle}>ASAP</Text>
                <Text style={styles.itemSubtitle}>I need the technician right now</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dropdownItem} onPress={() => handleTimingSelect('Tomorrow')}>
              <Ionicons name="time-outline" size={24} color="#6b7280" style={styles.itemIcon} />
              <View>
                <Text style={styles.itemTitle}>Tomorrow</Text>
                <Text style={styles.itemSubtitle}>I need the technician tomorrow</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dropdownItem} onPress={() => handleTimingSelect('Future')}>
              <Ionicons name="calendar-outline" size={24} color="#6b7280" style={styles.itemIcon} />
              <View>
                <Text style={styles.itemTitle}>Sometime in the future</Text>
                <Text style={styles.itemSubtitle}>I will arrange a date & time for the technician to come.</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.nextButton, !isNextEnabled && styles.nextButtonDisabled]}
          disabled={!isNextEnabled}
          onPress={() => router.push("/booking/details")}
        >
          <Text style={[styles.nextButtonText, !isNextEnabled && styles.nextButtonTextDisabled]}>
            Next
          </Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Sheet Modal for Tomorrow's Time */}
      <Modal visible={isTimeModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalDismiss} onPress={() => setIsTimeModalVisible(false)} />
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>What time tomorrow?</Text>
            
            <View style={styles.timePickerMock}>
              <ScrollView style={styles.scrollCol} showsVerticalScrollIndicator={false}>
                {hoursList.map(h => (
                  <TouchableOpacity key={h} onPress={() => setSelectedHour(h)}>
                    <Text style={selectedHour === h ? styles.timeActive : styles.timeMuted}>{h}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={styles.timeActive}>:</Text>
              <ScrollView style={styles.scrollCol} showsVerticalScrollIndicator={false}>
                {minutesList.map(m => (
                  <TouchableOpacity key={m} onPress={() => setSelectedMinute(m)}>
                    <Text style={selectedMinute === m ? styles.timeActive : styles.timeMuted}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={styles.amPmCol}>
                <TouchableOpacity onPress={() => setSelectedAmPm("AM")}>
                  <Text style={selectedAmPm === "AM" ? styles.amPmActive : styles.amPmMuted}>AM</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setSelectedAmPm("PM")}>
                  <Text style={selectedAmPm === "PM" ? styles.amPmActive : styles.amPmMuted}>PM</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalNextButton} onPress={handleTimeConfirm}>
                <Text style={styles.modalNextText}>Next</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bottom Sheet Modal for Future Date & Time */}
      <Modal visible={isFutureModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalDismiss} onPress={() => setIsFutureModalVisible(false)} />
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{futureStep === 1 ? "Select Date" : "Select Time"}</Text>
            
            {futureStep === 1 ? (
              <View style={styles.calendarContainer}>
                <Calendar
                  onDayPress={(day: any) => setSelectedDate(day.dateString)}
                  markedDates={{
                    [selectedDate]: { selected: true, selectedColor: '#0d9488' }
                  }}
                  minDate={new Date().toISOString().split('T')[0]}
                  theme={{
                    todayTextColor: '#0d9488',
                    arrowColor: '#0d9488',
                    textDayFontFamily: 'Lato',
                    textMonthFontFamily: 'Lato-Bold',
                    textDayHeaderFontFamily: 'Lato',
                  }}
                />
              </View>
            ) : (
              <View style={styles.timePickerMock}>
                <ScrollView style={styles.scrollCol} showsVerticalScrollIndicator={false}>
                  {hoursList.map(h => (
                    <TouchableOpacity key={h} onPress={() => setSelectedHour(h)}>
                      <Text style={selectedHour === h ? styles.timeActive : styles.timeMuted}>{h}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <Text style={styles.timeActive}>:</Text>
                <ScrollView style={styles.scrollCol} showsVerticalScrollIndicator={false}>
                  {minutesList.map(m => (
                    <TouchableOpacity key={m} onPress={() => setSelectedMinute(m)}>
                      <Text style={selectedMinute === m ? styles.timeActive : styles.timeMuted}>{m}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <View style={styles.amPmCol}>
                  <TouchableOpacity onPress={() => setSelectedAmPm("AM")}>
                    <Text style={selectedAmPm === "AM" ? styles.amPmActive : styles.amPmMuted}>AM</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setSelectedAmPm("PM")}>
                    <Text style={selectedAmPm === "PM" ? styles.amPmActive : styles.amPmMuted}>PM</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalNextButton} onPress={handleFutureConfirm}>
                <Text style={styles.modalNextText}>Next</Text>
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
    padding: 24,
  },
  label: {
    fontSize: 14,
    fontFamily: "Lato-Bold",
    color: "#1f2937",
    marginBottom: 8,
    marginTop: 24,
  },
  formTitle: {
    fontSize: 18,
    fontFamily: "DemoOsbert-Bold",
    color: "#1f2937",
    marginBottom: 8,
  },
  labelForm: {
    fontSize: 14,
    fontFamily: "Lato",
    color: "#6b7280",
    marginTop: 12,
    marginBottom: 4,
  },
  inputForm: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
    fontSize: 16,
    fontFamily: "Lato",
    backgroundColor: "#ffffff",
  },


  dropdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 16,
    height: 48,
    backgroundColor: "#ffffff",
  },
  dropdownText: {
    fontSize: 16,
    fontFamily: "Lato",
    color: "#1f2937",
  },
  dropdownList: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 16,
    marginTop: 12,
    padding: 8,
    backgroundColor: "#ffffff",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  itemIcon: {
    marginRight: 16,
  },
  itemTitle: {
    fontSize: 15,
    fontFamily: "Lato-Bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  itemSubtitle: {
    fontSize: 12,
    fontFamily: "Lato",
    color: "#9ca3af",
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    backgroundColor: "#ffffff",
  },
  nextButton: {
    backgroundColor: "#3b82f6",
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
  },
  nextButtonDisabled: {
    backgroundColor: "#e5e7eb",
  },
  nextButtonText: {
    fontSize: 16,
    fontFamily: "Lato-Bold",
    color: "#ffffff",
  },
  nextButtonTextDisabled: {
    color: "#9ca3af",
  },
  // Modal Styles
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
    marginBottom: 32,
  },
  timePickerMock: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 40,
    height: 150, // Fixed height for scroll area
  },
  scrollCol: {
    marginHorizontal: 16,
    maxHeight: 150,
  },
  timeActive: {
    fontSize: 32,
    fontFamily: "Lato-Bold",
    color: "#000000",
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
    color: "#1f2937",
    marginVertical: 12,
  },
  amPmMuted: {
    fontSize: 14,
    fontFamily: "Lato",
    color: "#9ca3af",
    marginVertical: 12,
  },
  calendarContainer: {
    width: '100%',
    marginBottom: 40,
  },
  modalFooter: {
    alignItems: "flex-end",
  },
  modalNextButton: {
    backgroundColor: "#0d9488", // Dark teal color as per screenshot
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
  },
  modalNextText: {
    color: "#ffffff",
    fontFamily: "Lato-Bold",
    fontSize: 16,
  }
});
