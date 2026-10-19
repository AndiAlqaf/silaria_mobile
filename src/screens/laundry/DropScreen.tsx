import React, { useState, useEffect } from 'react';
import { ScrollView, View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import apiClient from '../../api/client';
import Input from '../../components/Input';
import Select from '../../components/Select';

interface DropPointItem {
  id: number;
  point_name?: string;
  name?: string;
}

export default function DropScreen() {
  const [guestName, setGuestName] = useState('');
  const [room, setRoom] = useState('');
  const [bagId, setBagId] = useState('');
  const [boxId, setBoxId] = useState('');
  const [servicesPackage, setServicesPackage] = useState('Regular');
  const [dropPoint, setDropPoint] = useState('');

  const [dropPointOptions, setDropPointOptions] = useState<{ label: string; value: string }[]>([]);
  const [loadingPoints, setLoadingPoints] = useState(false);

  useEffect(() => {
    fetchDropPoints();
  }, []);

  const fetchDropPoints = async () => {
    setLoadingPoints(true);
    try {
      const response = await apiClient.get('/data-register?action=get_laundry_dp&type=laundry_dp');
      const listData = response.data?.data?.data || response.data?.data || response.data;
      if (Array.isArray(listData)) {
        const formatted = listData.map((dp: DropPointItem) => ({
          label: dp.point_name || dp.name || `Point ${dp.id}`,
          value: dp.point_name || dp.name || `Point ${dp.id}`,
        }));
        setDropPointOptions(formatted);
      }
    } catch (e) {
      console.log('Using default drop points fallback');
      setDropPointOptions([
        { label: 'LIVING RESIDENCE 1', value: 'LIVING RESIDENCE 1' },
        { label: 'LIVING RESIDENCE 2', value: 'LIVING RESIDENCE 2' },
        { label: 'FRONT DESK LOBBY', value: 'FRONT DESK LOBBY' },
      ]);
    } finally {
      setLoadingPoints(false);
    }
  };

  const submitData = async () => {
    if (!guestName.trim()) {
      Alert.alert('Validation Error', 'Guest Name is required.');
      return;
    }
    if (!room.trim()) {
      Alert.alert('Validation Error', 'Room is required.');
      return;
    }
    if (!bagId.trim()) {
      Alert.alert('Validation Error', 'Laundry Bag ID is required.');
      return;
    }
    if (!boxId.trim()) {
      Alert.alert('Validation Error', 'Laundry Box ID is required.');
      return;
    }
    if (!dropPoint) {
      Alert.alert('Validation Error', 'Please select a Drop Point.');
      return;
    }

    try {
      const payload = {
        guest_name: guestName,
        room,
        laundry_bag_id: bagId,
        laundry_box_id: boxId,
        services_package: servicesPackage,
        drop_point: dropPoint,
      };

      const response = await apiClient.post('/laundry?action=drop', payload);

      if (response.status === 200 || response.status === 201) {
        Alert.alert('Success', 'Laundry Drop Form submitted successfully!');
        setGuestName('');
        setRoom('');
        setBagId('');
        setBoxId('');
        setDropPoint('');
      }
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Failed to submit Laundry Drop form';
      Alert.alert('Error', msg);
      console.error(error);
    }
  };

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
      <Text className="text-xl font-bold mb-4 text-primary">LAUNDRY DROP FORM</Text>

      <Input 
        label="Name *" 
        value={guestName} 
        onChangeText={setGuestName} 
        placeholder="Guest name..." 
      />

      <Input 
        label="Room *" 
        value={room} 
        onChangeText={setRoom} 
        placeholder="Room No (e.g. 101)" 
      />

      <Input 
        label="Laundry Bag ID *" 
        value={bagId} 
        onChangeText={setBagId} 
        placeholder="E.g. BAG-101" 
      />

      <Input 
        label="Laundry Box ID *" 
        value={boxId} 
        onChangeText={setBoxId} 
        placeholder="E.g. BOX-A" 
      />

      <Select 
        label="Package *" 
        selectedValue={servicesPackage} 
        onValueChange={setServicesPackage} 
        options={[
          { label: 'Regular', value: 'Regular' },
          { label: 'Express', value: 'Express' }
        ]} 
      />

      {loadingPoints ? (
        <View className="mb-4 p-3 bg-white border border-border rounded-md flex-row items-center">
          <ActivityIndicator size="small" color="#063126" />
          <Text className="ml-2 text-slate-500">Loading drop points...</Text>
        </View>
      ) : (
        <Select 
          label="Drop Point *" 
          selectedValue={dropPoint} 
          onValueChange={setDropPoint} 
          prompt="Select Drop Point"
          options={[
            { label: 'Select Drop Point', value: '' },
            ...dropPointOptions,
          ]} 
        />
      )}

      <TouchableOpacity className="bg-secondary p-4 rounded-md items-center mt-4" onPress={submitData}>
        <Text className="text-secondary-foreground font-bold text-lg">Submit Drop Form</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

