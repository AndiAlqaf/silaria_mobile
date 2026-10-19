import React, { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, Alert } from 'react-native';
import apiClient from '../../api/client';
import Input from '../../components/Input';

export default function DeliverScreen() {
  const [bagId, setBagId] = useState('');

  const submitData = async () => {
    if (!bagId.trim()) {
      Alert.alert('Validation Error', 'Laundry Bag ID is required.');
      return;
    }

    try {
      const payload = {
        id: bagId,
      };

      const response = await apiClient.post('/laundry?action=distribute', payload);

      if (response.status === 200 || response.status === 201) {
        Alert.alert('Success', 'Laundry Distribution Form submitted successfully!');
        setBagId('');
      }
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Failed to submit Laundry Distribution form';
      Alert.alert('Error', msg);
      console.error(error);
    }
  };

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
      <Text className="text-xl font-bold mb-4 text-primary">LAUNDRY DELIVERING FORM</Text>

      <Input 
        label="Laundry Bag ID *" 
        value={bagId} 
        onChangeText={setBagId} 
        placeholder="Enter Laundry Bag ID (e.g. BAG-101)" 
      />

      <TouchableOpacity className="bg-secondary p-4 rounded-md items-center mt-6" onPress={submitData}>
        <Text className="text-secondary-foreground font-bold text-lg">Submit Delivery Form</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

