import React from 'react';
import { View, Text, TextInput, TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  label: string;
}

export default function Input({ label, className, ...props }: InputProps) {
  return (
    <View className="mb-4">
      <Text className="text-base mb-1 font-medium text-foreground">{label}</Text>
      <TextInput 
        className={`border border-border p-3 rounded-md bg-white text-foreground ${className || ''}`}
        placeholderTextColor="#94a3b8"
        {...props}
      />
    </View>
  );
}
