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
  
  setServiceId: (id: string) => void;
  setCategoryInfo: (id: string, name: string) => void;
  setSelectedServices: (services: string[]) => void;
  setFullAddress: (addressLine1: string, addressLine2: string, addressLine3: string, town: string, county: string, postcode: string) => void;
  setTiming: (type: 'ASAP' | 'Tomorrow' | 'Future', date?: string, time?: string) => void;
  setIssueDescription: (desc: string) => void;
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
  
  setServiceId: (id) => set({ serviceId: id }),
  setCategoryInfo: (id, name) => set({ categoryId: id, categoryName: name }),
  setSelectedServices: (services) => set({ selectedServices: services }),
  setFullAddress: (addressLine1, addressLine2, addressLine3, town, county, postcode) => set({ 
    addressLine1, addressLine2, addressLine3, town, county, postcode 
  }),
  setTiming: (type, date = '', time = '') => set({ timingType: type, selectedDate: date, selectedTime: time }),
  setIssueDescription: (desc) => set({ issueDescription: desc }),
  addImage: (image) => set((state) => {
    if (state.images.length >= 6) return state; // Max 6 images per API
    return { images: [...state.images, image] };
  }),
  removeImage: (index) => set((state) => ({
    images: state.images.filter((_, i) => i !== index)
  })),
  addSubmittedJob: (job) => set((state) => ({ submittedJobs: [job, ...state.submittedJobs] })),
  reset: () => set({
    serviceId: '', categoryId: '', categoryName: '', selectedServices: [],
    addressLine1: '', addressLine2: '', addressLine3: '', town: '', county: '', postcode: '', timingType: 'ASAP',
    selectedDate: '', selectedTime: '', issueDescription: '', images: []
  })
}));
