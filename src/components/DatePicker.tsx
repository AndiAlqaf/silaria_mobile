import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import DateTimePicker, { useDefaultStyles } from 'react-native-ui-datepicker';
import dayjs from 'dayjs';
import Svg, { Rect, Line, Circle, Path } from 'react-native-svg';

interface DatePickerProps {
  label: string;
  date: Date | null;
  onDateChange: (date: Date) => void;
  mode?: 'date' | 'time' | 'datetime';
  placeholder?: string;
}

export default function DatePicker({ label, date, onDateChange, mode = 'date', placeholder = 'Select Date' }: DatePickerProps) {
  const [show, setShow] = useState(false);
  const defaultStyles = useDefaultStyles();

  const customStyles = {
    ...defaultStyles,
    selected: {
      backgroundColor: '#063126',
      borderRadius: 9999,
    },
    selected_label: {
      color: '#ffffff',
      fontWeight: 'bold' as const,
    },
    today: {
      backgroundColor: '#e2e8f0',
      borderRadius: 9999,
    },
    today_label: {
      color: '#063126',
      fontWeight: 'bold' as const,
    },
  };

  const formatDate = (date: Date) => {
    if (mode === 'time') {
      return dayjs(date).format('hh:mm A');
    }
    if (mode === 'datetime') {
      return dayjs(date).format('MMM D, YYYY hh:mm A');
    }
    return dayjs(date).format('MMMM D, YYYY');
  };

  return (
    <View className="mb-4">
      <Text className="text-base mb-1 font-medium text-foreground">{label}</Text>
      <TouchableOpacity 
        className="border border-border p-3 rounded-md bg-white flex-row justify-between items-center"
        activeOpacity={0.7}
        onPress={() => setShow(true)}
      >
        <Text 
          className={date ? "text-foreground flex-1 pr-2" : "text-slate-400 flex-1 pr-2"}
          numberOfLines={1}
        >
          {date ? formatDate(date) : placeholder}
        </Text>

        {mode === 'time' ? (
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Circle cx="12" cy="12" r="10" />
            <Path d="M12 6v6l4 2" />
          </Svg>
        ) : (
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <Line x1="16" y1="2" x2="16" y2="6" />
            <Line x1="8" y1="2" x2="8" y2="6" />
            <Line x1="3" y1="10" x2="21" y2="10" />
          </Svg>
        )}
      </TouchableOpacity>

      <Modal visible={show} transparent={true} animationType="fade" onRequestClose={() => setShow(false)}>
        <View className="flex-1 justify-center items-center bg-black/50 p-4">
          <View className="bg-white rounded-lg p-5 w-full max-w-sm relative">
            {/* Close Button Icon at top-right corner */}
            <TouchableOpacity 
              className="absolute top-3 right-3 p-2 z-10"
              onPress={() => setShow(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M18 6L6 18M6 6l12 12" />
              </Svg>
            </TouchableOpacity>

            <View className="pt-2">
              <DateTimePicker
                mode="single"
                date={date || new Date()}
                timePicker={mode === 'time' || mode === 'datetime'}
                styles={customStyles}
                onChange={(params) => {
                  if (params.date) {
                    onDateChange(dayjs(params.date).toDate());
                  }
                }}
              />
            </View>

            <TouchableOpacity 
              className="mt-4 p-3 bg-primary rounded-md items-center"
              onPress={() => setShow(false)}
            >
              <Text className="text-white font-medium">Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}


