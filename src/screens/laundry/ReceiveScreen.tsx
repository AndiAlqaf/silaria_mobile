import React, { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, Alert } from 'react-native';
import apiClient from '../../api/client';
import Input from '../../components/Input';
import Select from '../../components/Select';

interface ClothingDetailItem {
  item_name: string;
  brand: string;
  color: string;
  size: string;
  qty: string;
}

export default function ReceiveScreen() {
  const [activeStep, setActiveStep] = useState<'step1' | 'step2' | 'step3'>('step1');

  // Step 1: Receive & Weigh State
  const [bagIdStep1, setBagIdStep1] = useState('');
  const [bagStatus, setBagStatus] = useState('Accepted');
  const [weight, setWeight] = useState('');

  // Step 2: Clothes Details State
  const [bagIdStep2, setBagIdStep2] = useState('');
  const [clothingItems, setClothingItems] = useState<ClothingDetailItem[]>([
    { item_name: '', brand: '', color: '', size: '', qty: '1' }
  ]);

  // Step 3: Complete Process State
  const [bagIdStep3, setBagIdStep3] = useState('');

  // Step 1 Handler: Receive & Weigh
  const submitStep1 = async () => {
    if (!bagIdStep1.trim()) {
      Alert.alert('Validation Error', 'Laundry Bag ID is required.');
      return;
    }
    const parsedWeight = parseFloat(weight);
    if (isNaN(parsedWeight) || parsedWeight <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid weight in kg.');
      return;
    }

    try {
      const payload = {
        id: bagIdStep1,
        data: {
          bag_status: bagStatus,
          weight: parsedWeight,
        },
      };

      const response = await apiClient.post('/laundry?action=receive', payload);

      if (response.status === 200 || response.status === 201) {
        if (bagStatus === 'Rejected') {
          Alert.alert(
            'Kantong Ditolak (REJECTED)',
            'Kantong ini telah ditandai REJECTED dan otomatis dibypass langsung ke antrean retur pengembalian (tanpa cuci & detail pakaian).'
          );
          setBagIdStep1('');
          setWeight('');
          setBagStatus('Accepted');
          return;
        }

        Alert.alert('Success', 'Penerimaan & Penimbangan berhasil disimpan! Status: RECEIVED_AT_LAUNDRY');
        setBagIdStep2(bagIdStep1); // Auto pass bag ID to step 2
        setBagIdStep3(bagIdStep1);
        setBagIdStep1('');
        setWeight('');
        setActiveStep('step2'); // Navigate to next step
      }
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Gagal menyimpan data penerimaan laundry';
      Alert.alert('Error', msg);
      console.error(error);
    }
  };

  // Step 2 Handlers: Clothes Details
  const handleAddItemRow = () => {
    setClothingItems([...clothingItems, { item_name: '', brand: '', color: '', size: '', qty: '1' }]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (clothingItems.length === 1) return;
    const updated = clothingItems.filter((_, i) => i !== index);
    setClothingItems(updated);
  };

  const handleUpdateItemRow = (index: number, field: keyof ClothingDetailItem, value: string) => {
    const updated = [...clothingItems];
    updated[index][field] = value;
    setClothingItems(updated);
  };

  const totalPcs = clothingItems.reduce((sum, item) => sum + (parseInt(item.qty, 10) || 0), 0);

  const submitStep2 = async () => {
    if (!bagIdStep2.trim()) {
      Alert.alert('Validation Error', 'Laundry Bag ID is required.');
      return;
    }

    const formattedDetails = clothingItems.map(item => ({
      item_name: item.item_name,
      brand: item.brand,
      color: item.color,
      size: item.size,
      qty: parseInt(item.qty, 10) || 1,
    }));

    try {
      const payload = {
        laundry_bag_id: bagIdStep2,
        details: formattedDetails,
        no_of_pcs_total: totalPcs,
      };

      const response = await apiClient.post('/laundry?action=add_details', payload);

      if (response.status === 200 || response.status === 201) {
        Alert.alert('Success', 'Rincian pakaian berhasil disimpan! Status: DETAILS_ADDED');
        setBagIdStep3(bagIdStep2);
        setActiveStep('step3'); // Navigate to step 3
      }
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Gagal menyimpan rincian pakaian';
      Alert.alert('Error', msg);
      console.error(error);
    }
  };

  // Step 3 Handler: Mark Process Completed
  const submitStep3 = async () => {
    if (!bagIdStep3.trim()) {
      Alert.alert('Validation Error', 'Laundry Bag ID is required.');
      return;
    }

    try {
      const payload = {
        id: bagIdStep3,
      };

      const response = await apiClient.post('/laundry?action=complete_process', payload);

      if (response.status === 200 || response.status === 201) {
        Alert.alert('Success', 'Proses pencucian selesai (Mark Done)! Status: PROCESS_COMPLETED');
        setBagIdStep3('');
      }
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Gagal merubah status proses laundry';
      Alert.alert('Error', msg);
      console.error(error);
    }
  };

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
      <Text className="text-xl font-bold mb-4 text-primary">RECEIVING & CLEANING PROCESS</Text>

      {/* Step Navigation Bar */}
      <View className="flex-row bg-white rounded-md border border-border p-1 mb-6">
        <TouchableOpacity 
          className={`flex-1 py-2 rounded items-center ${activeStep === 'step1' ? 'bg-primary' : 'bg-transparent'}`}
          onPress={() => setActiveStep('step1')}
        >
          <Text className={`text-xs font-bold ${activeStep === 'step1' ? 'text-white' : 'text-slate-500'}`}>1. Weigh</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          className={`flex-1 py-2 rounded items-center ${activeStep === 'step2' ? 'bg-primary' : 'bg-transparent'}`}
          onPress={() => setActiveStep('step2')}
        >
          <Text className={`text-xs font-bold ${activeStep === 'step2' ? 'text-white' : 'text-slate-500'}`}>2. Detail Pakaian</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          className={`flex-1 py-2 rounded items-center ${activeStep === 'step3' ? 'bg-primary' : 'bg-transparent'}`}
          onPress={() => setActiveStep('step3')}
        >
          <Text className={`text-xs font-bold ${activeStep === 'step3' ? 'text-white' : 'text-slate-500'}`}>3. Mark Done</Text>
        </TouchableOpacity>
      </View>

      {/* STEP 1: RECEIVE & WEIGH */}
      {activeStep === 'step1' && (
        <View className="bg-white p-4 rounded-md border border-border">
          <Text className="text-base font-bold mb-3 text-primary">Tahap 1: Penerimaan & Penimbangan</Text>
          <Input 
            label="Laundry Bag ID *" 
            value={bagIdStep1} 
            onChangeText={setBagIdStep1} 
            placeholder="E.g. BAG-101" 
          />

          <Select 
            label="Laundry Bag Status *" 
            selectedValue={bagStatus} 
            onValueChange={setBagStatus} 
            options={[
              { label: 'Accepted', value: 'Accepted' },
              { label: 'Rejected', value: 'Rejected' },
            ]} 
          />
          
          <Input 
            label="Weight (kg) *" 
            value={weight} 
            onChangeText={setWeight} 
            placeholder="E.g. 2.5" 
            keyboardType="numeric" 
          />

          <TouchableOpacity className="bg-secondary p-4 rounded-md items-center mt-4" onPress={submitStep1}>
            <Text className="text-secondary-foreground font-bold text-base">Simpan & Lanjut ke Detail Pakaian</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* STEP 2: CLOTHES DETAILS */}
      {activeStep === 'step2' && (
        <View className="bg-white p-4 rounded-md border border-border">
          <Text className="text-base font-bold mb-1 text-primary">Tahap 2: Rincian Pakaian (Clothes Details)</Text>
          <Text className="text-xs text-slate-500 mb-4">Input jenis, merk, warna, ukuran, dan jumlah pcs pakaian.</Text>

          <Input 
            label="Laundry Bag ID *" 
            value={bagIdStep2} 
            onChangeText={setBagIdStep2} 
            placeholder="E.g. BAG-101" 
          />

          {clothingItems.map((item, index) => (
            <View key={index} className="p-3 mb-4 border border-slate-200 rounded-md bg-slate-50 relative">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="font-bold text-slate-700 text-sm">Item #{index + 1}</Text>
                {clothingItems.length > 1 && (
                  <TouchableOpacity onPress={() => handleRemoveItemRow(index)}>
                    <Text className="text-red-500 font-bold text-xs">Hapus</Text>
                  </TouchableOpacity>
                )}
              </View>

              <Input 
                label="Jenis Pakaian" 
                value={item.item_name} 
                onChangeText={(v) => handleUpdateItemRow(index, 'item_name', v)} 
                placeholder="E.g. Kemeja / Celana" 
              />
              <View className="flex-row space-x-2">
                <View className="flex-1">
                  <Input 
                    label="Merk" 
                    value={item.brand} 
                    onChangeText={(v) => handleUpdateItemRow(index, 'brand', v)} 
                    placeholder="E.g. Uniqlo" 
                  />
                </View>
                <View className="flex-1">
                  <Input 
                    label="Warna" 
                    value={item.color} 
                    onChangeText={(v) => handleUpdateItemRow(index, 'color', v)} 
                    placeholder="E.g. Biru" 
                  />
                </View>
              </View>

              <View className="flex-row space-x-2">
                <View className="flex-1">
                  <Input 
                    label="Ukuran" 
                    value={item.size} 
                    onChangeText={(v) => handleUpdateItemRow(index, 'size', v)} 
                    placeholder="E.g. L / 32" 
                  />
                </View>
                <View className="flex-1">
                  <Input 
                    label="Qty (Pcs)" 
                    value={item.qty} 
                    onChangeText={(v) => handleUpdateItemRow(index, 'qty', v)} 
                    placeholder="1" 
                    keyboardType="numeric" 
                  />
                </View>
              </View>
            </View>
          ))}

          <TouchableOpacity className="border border-primary border-dashed p-3 rounded-md items-center mb-4" onPress={handleAddItemRow}>
            <Text className="text-primary font-bold">+ Tambah Baris Pakaian</Text>
          </TouchableOpacity>

          <View className="p-3 bg-emerald-50 border border-emerald-200 rounded-md mb-4 flex-row justify-between items-center">
            <Text className="font-bold text-emerald-800">Total Total Pcs (no_of_pcs_total):</Text>
            <Text className="font-bold text-emerald-900 text-lg">{totalPcs} Pcs</Text>
          </View>

          <TouchableOpacity className="bg-secondary p-4 rounded-md items-center" onPress={submitStep2}>
            <Text className="text-secondary-foreground font-bold text-base">Simpan Rincian Pakaian</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* STEP 3: MARK DONE / PROCESS COMPLETED */}
      {activeStep === 'step3' && (
        <View className="bg-white p-4 rounded-md border border-border">
          <Text className="text-base font-bold mb-2 text-primary">Tahap 3: Penyelesaian Pencucian</Text>
          <Text className="text-xs text-slate-500 mb-4">Tekan Mark Done setelah pakaian selesai dicuci, dikeringkan, disetrika, & dikemas rapi.</Text>

          <Input 
            label="Laundry Bag ID *" 
            value={bagIdStep3} 
            onChangeText={setBagIdStep3} 
            placeholder="E.g. BAG-101" 
          />

          <TouchableOpacity className="bg-primary p-4 rounded-md items-center mt-4" onPress={submitStep3}>
            <Text className="text-white font-bold text-base">Mark Process Completed</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}


