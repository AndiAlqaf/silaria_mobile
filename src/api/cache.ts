// Memory cache for master data dropdown options in Mobile App
export interface OptionItem {
  label: string;
  value: string;
}

export const masterCache: {
  rooms: Record<string, OptionItem[]>;
  deliveryPoints: OptionItem[];
  dropPoints: OptionItem[];
} = {
  rooms: {},
  deliveryPoints: [
    { label: 'CENTRAL CANTEEN', value: '3' },
    { label: 'ENFI CANTEEN', value: '12' },
    { label: 'EXPAT CANTEEN', value: '2' },
    { label: 'EXPLORATION MESS CANTEEN', value: '10' },
    { label: 'LIVING 3 CANTEEN', value: '4' },
    { label: 'MINING CANTEEN', value: '8' },
    { label: 'OFFICE U SMELTER CANTEEN', value: '9' },
    { label: 'SAMAENRE CANTEEN', value: '5' },
    { label: 'SATELIT CANTEEN', value: '1' },
    { label: 'STAY MESS', value: '13' },
    { label: 'VIP A1 VENUE', value: '6' },
    { label: 'VIP A2 VENUE', value: '7' },
    { label: 'WOLO CANTEEN', value: '11' },
  ],
  dropPoints: [
    { label: 'LDP Living 1', value: 'LDP Living 1' },
    { label: 'LDP Living 2', value: 'LDP Living 2' },
    { label: 'LDP Living 3', value: 'LDP Living 3' },
    { label: 'LDP Samaenre', value: 'LDP Samaenre' },
    { label: 'Laundry House Living 1', value: 'Laundry House Living 1' },
  ],
};

