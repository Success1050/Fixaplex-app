import { create } from 'zustand';
import * as ImagePicker from 'expo-image-picker';

interface BookingState {
  serviceId: string;
  categoryId: string;
  categoryName: string;
  selectedServices: string[];
  addressLine1: string;
  addressLine2: string;
  addressLine3: string;
  town: string;
  county: string;
  postcode: string;
  timingType: 'ASAP' | 'Tomorrow' | 'Future';
  selectedDate: string;
  selectedTime: string;
  issueDescription: string;
  images: ImagePicker.ImagePickerAsset[];
  submittedJobs: any[];
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  minPrice?: string;
  maxPrice?: string;
  activeBookingId?: string | number | null;
  rawBookingDate?: string;
  savedAddress?: {
    addressLine1: string;
    addressLine2: string;
    addressLine3: string;
    town: string;
    county: string;
    postcode: string;
  } | null;
  
  setActiveBookingId: (id: string | number | null) => void;
  setRawBookingDate: (date: string) => void;
  setSavedAddress: (address: {
    addressLine1: string;
    addressLine2: string;
    addressLine3: string;
    town: string;
    county: string;
    postcode: string;
  }) => void;
  setServiceId: (id: string) => void;
  setCategoryInfo: (id: string, name: string) => void;
  setPriceEstimate: (min: string, max: string) => void;
  setSelectedServices: (services: string[]) => void;
  setFullAddress: (addressLine1: string, addressLine2: string, addressLine3: string, town: string, county: string, postcode: string) => void;
  setTiming: (type: 'ASAP' | 'Tomorrow' | 'Future', date?: string, time?: string) => void;
  setIssueDescription: (desc: string) => void;
  setGuestContact: (name: string, phone: string, email: string) => void;
  addImage: (image: ImagePicker.ImagePickerAsset) => void;
  removeImage: (index: number) => void;
  addSubmittedJob: (job: any) => void;
  reset: () => void;
}

export const useBookingStore = create<BookingState>((set) => ({
  serviceId: '',
  categoryId: '',
  categoryName: '',
  selectedServices: [],
  addressLine1: '',
  addressLine2: '',
  addressLine3: '',
  town: '',
  county: '',
  postcode: '',
  timingType: 'ASAP',
  selectedDate: '',
  selectedTime: '',
  issueDescription: '',
  images: [],
  submittedJobs: [],
  guestName: '',
  guestPhone: '',
  guestEmail: '',
  minPrice: '',
  maxPrice: '',
  activeBookingId: null,
  rawBookingDate: '',
  savedAddress: null,
  
  setActiveBookingId: (id) => set({ activeBookingId: id }),
  setRawBookingDate: (date) => set({ rawBookingDate: date }),
  setSavedAddress: (address) => set({ savedAddress: address }),
  setServiceId: (id) => set({ serviceId: id }),
  setCategoryInfo: (id, name) => set({ categoryId: id, categoryName: name }),
  setPriceEstimate: (min, max) => set({ minPrice: min, maxPrice: max }),
  setSelectedServices: (services) => set({ selectedServices: services }),
  setFullAddress: (addressLine1, addressLine2, addressLine3, town, county, postcode) => set({ 
    addressLine1, addressLine2, addressLine3, town, county, postcode,
    savedAddress: { addressLine1, addressLine2, addressLine3, town, county, postcode }
  }),
  setTiming: (type, date = '', time = '') => set({ timingType: type, selectedDate: date, selectedTime: time }),
  setIssueDescription: (desc) => set({ issueDescription: desc }),
  setGuestContact: (name, phone, email) => set({ guestName: name, guestPhone: phone, guestEmail: email }),
  addImage: (image) => set((state) => {
    if (state.images.length >= 6) return state; // Max 6 images per API
    return { images: [...state.images, image] };
  }),
  removeImage: (index) => set((state) => ({
    images: state.images.filter((_, i) => i !== index)
  })),
  addSubmittedJob: (job) => set((state) => ({ submittedJobs: [job, ...state.submittedJobs] })),
  reset: () => set((state) => ({
    serviceId: '', categoryId: '', categoryName: '', selectedServices: [],
    // Keep saved address prefilled for future bookings!
    addressLine1: state.savedAddress?.addressLine1 || state.addressLine1 || '',
    addressLine2: state.savedAddress?.addressLine2 || state.addressLine2 || '',
    addressLine3: state.savedAddress?.addressLine3 || state.addressLine3 || '',
    town: state.savedAddress?.town || state.town || '',
    county: state.savedAddress?.county || state.county || '',
    postcode: state.savedAddress?.postcode || state.postcode || '',
    timingType: 'ASAP',
    selectedDate: '', selectedTime: '', issueDescription: '', images: [],
    guestName: '', guestPhone: '', guestEmail: '', minPrice: '', maxPrice: '',
    activeBookingId: null, rawBookingDate: '',
    savedAddress: state.savedAddress || {
      addressLine1: state.addressLine1,
      addressLine2: state.addressLine2,
      addressLine3: state.addressLine3,
      town: state.town,
      county: state.county,
      postcode: state.postcode,
    }
  }))
}));
