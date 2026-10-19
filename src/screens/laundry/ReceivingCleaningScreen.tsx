import React, { useState, useEffect } from 'react';
import { ScrollView, View, Text, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import apiClient from '../../api/client';
import Input from '../../components/Input';
import Select from '../../components/Select';

interface ClothesRowItem {
  clothes_type: string;
  brand: string;
  colour: string;
  size: string;
  no_of_pcs: string;
}

interface IncomingBag {
  id: string;
  laundry_bag_id: string;
  laundry_box_id: string;
  guest_name: string;
  room: string;
  current_status: string;
}

export default function ReceivingCleaningScreen() {
  const [activeSubSection, setActiveSubSection] = useState<'receive' | 'details' | 'finish'>('receive');

  // Step 1: Receive & Weigh State
  const [bagIdReceive, setBagIdReceive] = useState('');
  const [bagStatus, setBagStatus] = useState<'Accepted' | 'Rejected'>('Accepted');
  const [weight, setWeight] = useState('');
  const [submittingReceive, setSubmittingReceive] = useState(false);

  // Incoming bags list for quick selection
  const [incomingBags, setIncomingBags] = useState<IncomingBag[]>([]);
  const [loadingIncoming, setLoadingIncoming] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Step 2: Clothes Details State
  const [bagIdDetails, setBagIdDetails] = useState('');
  const [clothesRows, setClothesRows] = useState<ClothesRowItem[]>([
    { clothes_type: '', brand: '', colour: '', size: '', no_of_pcs: '1' }
  ]);
  const [submittingDetails, setSubmittingDetails] = useState(false);

  // Step 3: Mark Done State
  const [bagIdFinish, setBagIdFinish] = useState('');
  const [submittingFinish, setSubmittingFinish] = useState(false);

  useEffect(() => {
    fetchIncomingBags();
  }, []);

  const fetchIncomingBags = async () => {
    setLoadingIncoming(true);
    try {
      const response = await apiClient.get('/laundry');
      const transactions = response.data?.data?.transactions;
      if (Array.isArray(transactions)) {
        const filtered = transactions.filter(
          (t: any) => t.current_status === 'DROPPED_AT_POINT' || t.current_status === 'DELIVERED_TO_LAUNDRY'
        );
        setIncomingBags(filtered);
      }
    } catch (e) {
      console.log('Failed to fetch incoming bags', e);
    } finally {
      setLoadingIncoming(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchIncomingBags();
  };

  // Handler 1: Receive & Weigh
  const submitReceive = async () => {
    if (!bagIdReceive.trim()) {
      Alert.alert('Validation Error', 'LAUNDRY BAG ID is required.');
      return;
    }
    const parsedWeight = parseFloat(weight);
    if (isNaN(parsedWeight) || parsedWeight <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid WEIGHT in kg.');
      return;
    }

    setSubmittingReceive(true);
    try {
      const payload = {
        action: 'receive_bag',
        laundry_bag_id: bagIdReceive,
        bag_status: bagStatus,
        weight: parsedWeight,
      };

      const response = await apiClient.post('/laundry', payload);

      if (response.status === 200 || response.status === 201) {
        if (bagStatus === 'Rejected') {
          Alert.alert(
            'Laundry Bag Rejected',
            `Bag "${bagIdReceive}" has been marked REJECTED. It is bypassed directly to the return queue for dispatch to the guest (skipping washing & clothes inventory).`
          );
          setBagIdReceive('');
          setWeight('');
          setBagStatus('Accepted');
          fetchIncomingBags();
        } else {
          Alert.alert('Success', `Bag "${bagIdReceive}" received & weighed! Proceeding to Clothes Item Details.`);
          setBagIdDetails(bagIdReceive);
          setBagIdFinish(bagIdReceive);
          setBagIdReceive('');
          setWeight('');
          setActiveSubSection('details'); // Auto jump to Enter Clothes Details
          fetchIncomingBags();
        }
      }
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.response?.data?.error || 'Failed to submit bag receiving';
      Alert.alert('Error', msg);
      console.error(error);
    } finally {
      setSubmittingReceive(false);
    }
  };

  // Handler 2: Clothes Details
  const handleAddRow = () => {
    setClothesRows([...clothesRows, { clothes_type: '', brand: '', colour: '', size: '', no_of_pcs: '1' }]);
  };

  const handleRemoveRow = (index: number) => {
    if (clothesRows.length === 1) return;
    setClothesRows(clothesRows.filter((_, i) => i !== index));
  };

  const handleUpdateRow = (index: number, field: keyof ClothesRowItem, value: string) => {
    const updated = [...clothesRows];
    updated[index][field] = value;
    setClothesRows(updated);
  };

  const totalPcs = clothesRows.reduce((sum, r) => sum + (parseInt(r.no_of_pcs, 10) || 0), 0);

  const submitDetails = async () => {
    if (!bagIdDetails.trim()) {
      Alert.alert('Validation Error', 'LAUNDRY BAG ID is required.');
      return;
    }

    setSubmittingDetails(true);
    try {
      const payload = {
        action: 'add_details',
        laundry_bag_id: bagIdDetails,
        details: clothesRows.map((r) => ({
          clothes_type: r.clothes_type || 'Clothes',
          brand: r.brand || '-',
          colour: r.colour || '-',
          size: r.size || '-',
          no_of_pcs: parseInt(r.no_of_pcs, 10) || 1,
        })),
      };

      const response = await apiClient.post('/laundry', payload);

      if (response.status === 200 || response.status === 201) {
        Alert.alert('Success', `Clothes details recorded (${totalPcs} pcs)! Status: DETAILS_ADDED.`);
        setBagIdFinish(bagIdDetails);
        setActiveSubSection('finish');
      }
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.response?.data?.error || 'Failed to save clothes details';
      Alert.alert('Error', msg);
      console.error(error);
    } finally {
      setSubmittingDetails(false);
    }
  };

  // Handler 3: Finish Process
  const submitFinish = async () => {
    if (!bagIdFinish.trim()) {
      Alert.alert('Validation Error', 'LAUNDRY BAG ID is required.');
      return;
    }

    setSubmittingFinish(true);
    try {
      const payload = {
        action: 'complete_process',
        laundry_bag_id: bagIdFinish,
      };

      const response = await apiClient.post('/laundry', payload);

      if (response.status === 200 || response.status === 201) {
        Alert.alert('Success', `Washing & packing completed (Mark Done)! Status: PROCESS_COMPLETED.`);
        setBagIdFinish('');
        setActiveSubSection('receive');
        fetchIncomingBags();
      }
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.response?.data?.error || 'Failed to complete washing process';
      Alert.alert('Error', msg);
      console.error(error);
    } finally {
      setSubmittingFinish(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      {/* Step Navigation Bar */}
      <View style={{ flexDirection: 'row', backgroundColor: '#ffffff', elevation: 2, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' }}>
        <TouchableOpacity
          style={{
            flex: 1,
            paddingVertical: 12,
            borderBottomWidth: 3,
            borderBottomColor: activeSubSection === 'receive' ? '#93D533' : 'transparent',
            alignItems: 'center',
          }}
          onPress={() => setActiveSubSection('receive')}
        >
          <Text style={{ color: activeSubSection === 'receive' ? '#063126' : '#94a3b8', fontWeight: 'bold', fontSize: 11 }}>
            1. RECEIVE & WEIGH
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            flex: 1,
            paddingVertical: 12,
            borderBottomWidth: 3,
            borderBottomColor: activeSubSection === 'details' ? '#93D533' : 'transparent',
            alignItems: 'center',
          }}
          onPress={() => setActiveSubSection('details')}
        >
          <Text style={{ color: activeSubSection === 'details' ? '#063126' : '#94a3b8', fontWeight: 'bold', fontSize: 11 }}>
            2. CLOTHES DETAILS
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            flex: 1,
            paddingVertical: 12,
            borderBottomWidth: 3,
            borderBottomColor: activeSubSection === 'finish' ? '#93D533' : 'transparent',
            alignItems: 'center',
          }}
          onPress={() => setActiveSubSection('finish')}
        >
          <Text style={{ color: activeSubSection === 'finish' ? '#063126' : '#94a3b8', fontWeight: 'bold', fontSize: 11 }}>
            3. MARK DONE
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#063126']} />}
      >
        {/* STEP 1: RECEIVE & WEIGH */}
        {activeSubSection === 'receive' && (
          <View style={{ backgroundColor: '#ffffff', padding: 16, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' }}>
            <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#063126', marginBottom: 6 }}>
              CENTRAL RECEIVING & WEIGHING
            </Text>
            <Text style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>
              Inspect incoming laundry bags delivered to Central Laundry. Set status to Accepted or Rejected.
            </Text>

            {/* Quick selector of incoming bags */}
            {incomingBags.length > 0 && (
              <View style={{ marginBottom: 14, padding: 10, backgroundColor: '#f0fdf4', borderRadius: 8, borderWidth: 1, borderColor: '#bbf7d0' }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#166534', marginBottom: 6 }}>
                  SELECT INCOMING BAG ({incomingBags.length}):
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {incomingBags.map((b) => (
                    <TouchableOpacity
                      key={b.id}
                      onPress={() => setBagIdReceive(b.laundry_bag_id)}
                      style={{
                        backgroundColor: bagIdReceive === b.laundry_bag_id ? '#063126' : '#ffffff',
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 6,
                        marginRight: 6,
                        borderWidth: 1,
                        borderColor: bagIdReceive === b.laundry_bag_id ? '#063126' : '#cbd5e1',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '700',
                          color: bagIdReceive === b.laundry_bag_id ? '#ffffff' : '#334155',
                        }}
                      >
                        {b.laundry_bag_id} ({b.guest_name})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <Input
              label="Laundry Bag ID *"
              value={bagIdReceive}
              onChangeText={setBagIdReceive}
              placeholder="e.g. BAG-101"
            />

            <Select
              label="Bag Status *"
              selectedValue={bagStatus}
              onValueChange={(val: any) => setBagStatus(val)}
              options={[
                { label: 'Accepted (Proceed to Washing)', value: 'Accepted' },
                { label: 'Rejected (Bypass directly to Return)', value: 'Rejected' },
              ]}
            />

            <Input
              label="Weight (kg) *"
              value={weight}
              onChangeText={setWeight}
              keyboardType="numeric"
              placeholder="Measured weight (e.g., 2.5)"
            />

            {bagStatus === 'Rejected' && (
              <View style={{ padding: 10, backgroundColor: '#fef2f2', borderRadius: 8, borderWidth: 1, borderColor: '#fecaca', marginBottom: 12 }}>
                <Text style={{ color: '#dc2626', fontSize: 12, fontWeight: '600' }}>
                  ⚠️ Rejected bags bypass the washing and clothes itemization stages, proceeding immediately to the return dispatch queue.
                </Text>
              </View>
            )}

            <TouchableOpacity
              onPress={submitReceive}
              disabled={submittingReceive}
              style={{
                backgroundColor: bagStatus === 'Rejected' ? '#ef4444' : '#93D533',
                paddingVertical: 14,
                borderRadius: 8,
                alignItems: 'center',
                marginTop: 6,
              }}
            >
              {submittingReceive ? (
                <ActivityIndicator color={bagStatus === 'Rejected' ? '#ffffff' : '#063126'} />
              ) : (
                <Text style={{ color: bagStatus === 'Rejected' ? '#ffffff' : '#063126', fontWeight: 'bold', fontSize: 15 }}>
                  {bagStatus === 'Rejected' ? 'Submit Rejected Bag' : 'Submit & Proceed to Clothes Details'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 2: CLOTHES DETAILS */}
        {activeSubSection === 'details' && (
          <View style={{ backgroundColor: '#ffffff', padding: 16, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' }}>
            <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#063126', marginBottom: 6 }}>
              CLOTHES ITEM DETAILS
            </Text>
            <Text style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>
              Record piece-by-piece clothing inventory for Accepted laundry bags.
            </Text>

            <Input
              label="Laundry Bag ID *"
              value={bagIdDetails}
              onChangeText={setBagIdDetails}
              placeholder="Enter Laundry Bag ID"
            />

            {clothesRows.map((row, index) => (
              <View
                key={index}
                style={{
                  backgroundColor: '#f8fafc',
                  padding: 12,
                  borderRadius: 8,
                  marginBottom: 10,
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#063126' }}>
                    Item #{index + 1}
                  </Text>
                  {clothesRows.length > 1 && (
                    <TouchableOpacity onPress={() => handleRemoveRow(index)}>
                      <Text style={{ fontSize: 11, color: '#dc2626', fontWeight: 'bold' }}>Remove</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <Input
                  label="Clothes Type"
                  value={row.clothes_type}
                  onChangeText={(val) => handleUpdateRow(index, 'clothes_type', val)}
                  placeholder="Shirt / Trousers / T-Shirt..."
                />

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Brand"
                      value={row.brand}
                      onChangeText={(val) => handleUpdateRow(index, 'brand', val)}
                      placeholder="Uniqlo / Levi's..."
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Colour"
                      value={row.colour}
                      onChangeText={(val) => handleUpdateRow(index, 'colour', val)}
                      placeholder="Blue / Black..."
                    />
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Size"
                      value={row.size}
                      onChangeText={(val) => handleUpdateRow(index, 'size', val)}
                      placeholder="L / XL / 32..."
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Qty (Pcs)"
                      value={row.no_of_pcs}
                      onChangeText={(val) => handleUpdateRow(index, 'no_of_pcs', val)}
                      keyboardType="numeric"
                      placeholder="1"
                    />
                  </View>
                </View>
              </View>
            ))}

            <TouchableOpacity
              onPress={handleAddRow}
              style={{
                backgroundColor: '#f1f5f9',
                paddingVertical: 10,
                borderRadius: 8,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#cbd5e1',
                marginBottom: 16,
              }}
            >
              <Text style={{ color: '#063126', fontWeight: 'bold', fontSize: 13 }}>
                + Add Clothes Row
              </Text>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#063126' }}>Total Pieces:</Text>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#059669' }}>{totalPcs} pcs</Text>
            </View>

            <TouchableOpacity
              onPress={submitDetails}
              disabled={submittingDetails}
              style={{
                backgroundColor: '#93D533',
                paddingVertical: 14,
                borderRadius: 8,
                alignItems: 'center',
              }}
            >
              {submittingDetails ? (
                <ActivityIndicator color="#063126" />
              ) : (
                <Text style={{ color: '#063126', fontWeight: 'bold', fontSize: 15 }}>
                  Save Itemization ({totalPcs} Pcs) & Proceed
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 3: MARK DONE */}
        {activeSubSection === 'finish' && (
          <View style={{ backgroundColor: '#ffffff', padding: 16, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' }}>
            <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#063126', marginBottom: 6 }}>
              COMPLETE CLEANING PROCESS (MARK DONE)
            </Text>
            <Text style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>
              Mark this laundry bag as washed, dried, ironed, and neatly packed into the container box.
            </Text>

            <Input
              label="Laundry Bag ID *"
              value={bagIdFinish}
              onChangeText={setBagIdFinish}
              placeholder="Enter completed Laundry Bag ID"
            />

            <TouchableOpacity
              onPress={submitFinish}
              disabled={submittingFinish}
              style={{
                backgroundColor: '#0284c7',
                paddingVertical: 14,
                borderRadius: 8,
                alignItems: 'center',
                marginTop: 6,
              }}
            >
              {submittingFinish ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 15 }}>
                  Mark Process Completed
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
