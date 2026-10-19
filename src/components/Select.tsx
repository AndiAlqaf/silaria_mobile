import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps {
  label: string;
  selectedValue: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  prompt?: string;
}

export default function Select({ label, selectedValue, onValueChange, options, prompt }: SelectProps) {
  const [modalVisible, setModalVisible] = useState(false);

  const selectedOption = options.find(o => o.value === selectedValue);

  return (
    <View className="mb-4">
      <Text className="text-base mb-1 font-medium text-foreground">{label}</Text>
      
      <TouchableOpacity 
        className="border border-border p-3 rounded-md bg-white flex-row justify-between items-center"
        activeOpacity={0.7}
        onPress={() => setModalVisible(true)}
      >
        <Text 
          className={selectedOption && selectedOption.value !== '' ? "text-foreground flex-1 pr-2" : "text-slate-400 flex-1 pr-2"}
          numberOfLines={1}
        >
          {selectedOption ? selectedOption.label : (prompt || 'Select...')}
        </Text>
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M6 9l6 6 6-6" />
        </Svg>
      </TouchableOpacity>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity 
          className="flex-1 justify-center bg-black/50 p-5"
          activeOpacity={1} 
          onPressOut={() => setModalVisible(false)}
        >
          <View className="bg-white rounded-md max-h-96 w-full overflow-hidden">
            {/* Header with Title and Close Icon */}
            <View className="p-4 border-b border-border flex-row justify-between items-center bg-slate-50">
              <Text className="text-base font-bold text-foreground">{label}</Text>
              <TouchableOpacity 
                onPress={() => setModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <Path d="M18 6L6 18M6 6l12 12" />
                </Svg>
              </TouchableOpacity>
            </View>

            <FlatList
              data={options}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  className={`p-4 border-b border-border flex-row justify-between items-center ${selectedValue === item.value ? 'bg-emerald-50' : 'bg-white'}`}
                  onPress={() => {
                    onValueChange(item.value);
                    setModalVisible(false);
                  }}
                >
                  <Text className={`text-base flex-1 ${selectedValue === item.value ? 'text-primary font-bold' : 'text-foreground'}`}>
                    {item.label}
                  </Text>
                  {selectedValue === item.value && (
                    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#063126" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                      <Path d="M20 6L9 17l-5-5" />
                    </Svg>
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}

