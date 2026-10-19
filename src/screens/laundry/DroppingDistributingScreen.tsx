import React, { useState, useEffect, useContext } from 'react';
import { ScrollView, View, Text, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, TextInput } from 'react-native';
import apiClient from '../../api/client';
import Input from '../../components/Input';
import Select from '../../components/Select';
import { masterCache } from '../../api/cache';
import { AuthContext } from '../../context/AuthContext';

interface DropPointItem {
  id: number;
  point_name?: string;
  name?: string;
}

interface LaundryBoxItem {
  boxId: string;
  laundry_box_id: string;
  total_bags: number;
  drop_point?: string;
  isReadyToDeliver?: boolean;
  isReadyToReturn?: boolean;
  has_dropped?: boolean;
  has_completed?: boolean;
  has_processing?: boolean;
  deliverDate?: string | null;
  returnDate?: string | null;
}

interface LaundryTxItem {
  id: string;
  room: string;
  guest_name: string;
  laundry_bag_id: string;
  laundry_box_id: string;
  services_package: string;
  drop_point: string;
  bag_status?: string;
  current_status: string;
  drop_date?: string;
  distribute_date?: string;
}

export default function DroppingDistributingScreen() {
  const { role } = useContext(AuthContext);

  // Determine user capabilities
  const isDriver = role === 'DRIVER';
  const isDropper = role === 'LAUNDR' || role === 'FRONTDESK';
  const isManager = role === 'SUPER' || role === 'ADMIN' || role === 'SUPERVISOR';

  // Default active sub-tab based on role
  const defaultSubSection = isDriver ? 'transport' : 'drop';
  const [activeSubSection, setActiveSubSection] = useState<'drop' | 'transport' | 'distribute'>(defaultSubSection);

  // Form State: Drop Form
  const [guestName, setGuestName] = useState('');
  const [room, setRoom] = useState('');
  const [bagId, setBagId] = useState('');
  const [boxId, setBoxId] = useState('');
  const [servicesPackage, setServicesPackage] = useState('Regular');
  const [dropPoint, setDropPoint] = useState('');
  const [submittingDrop, setSubmittingDrop] = useState(false);

  // Drop Points Options
  const [dropPointOptions, setDropPointOptions] = useState<{ label: string; value: string }[]>(masterCache.dropPoints);
  const [loadingPoints, setLoadingPoints] = useState(masterCache.dropPoints.length === 0);

  // Data lists from backend
  const [boxList, setBoxList] = useState<LaundryBoxItem[]>([]);
  const [transactions, setTransactions] = useState<LaundryTxItem[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const [distributeSearch, setDistributeSearch] = useState('');

  useEffect(() => {
    fetchDropPoints();
    fetchLaundryData();
  }, []);

  const fetchDropPoints = async () => {
    if (dropPointOptions.length === 0) {
      setLoadingPoints(true);
    }
    try {
      const response = await apiClient.get('/data-register?action=get_laundry_dp&type=laundry_dp');
      const listData = response.data?.data?.data || response.data?.data || response.data;
      if (Array.isArray(listData)) {
        const formatted = listData.map((dp: DropPointItem) => ({
          label: dp.point_name || dp.name || `Point ${dp.id}`,
          value: dp.point_name || dp.name || `Point ${dp.id}`,
        }));
        masterCache.dropPoints = formatted;
        setDropPointOptions(formatted);
      }
    } catch (e) {
      console.log('Using cached drop points fallback');
    } finally {
      setLoadingPoints(false);
    }
  };

  const fetchLaundryData = async () => {
    setLoadingData(true);
    try {
      const response = await apiClient.get('/laundry');
      const data = response.data?.data;
      if (data) {
        if (Array.isArray(data.boxList)) {
          setBoxList(data.boxList);
        }
        if (Array.isArray(data.transactions)) {
          setTransactions(data.transactions);
        }
      }
    } catch (e) {
      console.log('Failed to fetch laundry data', e);
    } finally {
      setLoadingData(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchLaundryData();
  };

  const submitDropForm = async () => {
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

    setSubmittingDrop(true);
    try {
      const payload = {
        action: 'create_drop',
        guest_name: guestName,
        room,
        laundry_bag_id: bagId,
        laundry_box_id: boxId,
        services_package: servicesPackage,
        drop_point: dropPoint,
      };

      const response = await apiClient.post('/laundry', payload);

      if (response.status === 200 || response.status === 201) {
        Alert.alert('Success', 'Soiled laundry bag recorded! Status: DROPPED_AT_POINT');
        setGuestName('');
        setRoom('');
        setBagId('');
        setBoxId('');
        setDropPoint('');
        fetchLaundryData();
      }
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.response?.data?.error || 'Failed to submit Laundry Drop form';
      Alert.alert('Error', msg);
      console.error(error);
    } finally {
      setSubmittingDrop(false);
    }
  };

  // Driver Action: Deliver Box to Central Laundry
  const handleDeliverBox = async (box: LaundryBoxItem) => {
    Alert.alert(
      'Deliver Box to Central Laundry',
      `Confirm dispatching Laundry Box "${box.boxId}" (${box.total_bags} bags) from ${box.drop_point || 'Drop Point'} to Central Laundry?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Deliver to Central',
          onPress: async () => {
            setActionInProgress(box.boxId);
            try {
              const payload = {
                action: 'deliver_to_laundry',
                laundry_box_id: box.boxId,
              };
              const res = await apiClient.post('/laundry', payload);
              if (res.status === 200 || res.status === 201) {
                Alert.alert('Success', `Box ${box.boxId} delivered! Status: DELIVERED_TO_LAUNDRY`);
                fetchLaundryData();
              }
            } catch (err: any) {
              const msg = err?.response?.data?.error || 'Failed to update delivery status';
              Alert.alert('Error', msg);
            } finally {
              setActionInProgress(null);
            }
          },
        },
      ]
    );
  };

  // Driver Action: Return Box to Drop Point
  const handleReturnBox = async (box: LaundryBoxItem) => {
    Alert.alert(
      'Return Box to Drop Point',
      `Confirm returning clean/completed Laundry Box "${box.boxId}" to ${box.drop_point || 'Drop Point'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Return to Drop Point',
          onPress: async () => {
            setActionInProgress(box.boxId);
            try {
              const payload = {
                action: 'return_to_drop',
                laundry_box_id: box.boxId,
              };
              const res = await apiClient.post('/laundry', payload);
              if (res.status === 200 || res.status === 201) {
                Alert.alert('Success', `Box ${box.boxId} returned to Drop Point! Status: RETURNED_TO_DROP`);
                fetchLaundryData();
              }
            } catch (err: any) {
              const msg = err?.response?.data?.error || 'Failed to update return status';
              Alert.alert('Error', msg);
            } finally {
              setActionInProgress(null);
            }
          },
        },
      ]
    );
  };

  // Dropper / Attendant Action: Distribute Bag to Room
  const handleDistributeToRoom = async (tx: LaundryTxItem) => {
    Alert.alert(
      'Distribute Laundry to Guest Room',
      `Confirm delivering laundry bag ${tx.laundry_bag_id} to guest "${tx.guest_name}" at Room ${tx.room}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Hand Over to Guest',
          onPress: async () => {
            setActionInProgress(tx.laundry_bag_id);
            try {
              const payload = {
                action: 'distribute_to_room',
                laundry_bag_id: tx.laundry_bag_id,
              };
              const res = await apiClient.post('/laundry', payload);
              if (res.status === 200 || res.status === 201) {
                Alert.alert('Success', `Bag ${tx.laundry_bag_id} received by guest! Status: DISTRIBUTED_TO_ROOM (Completed).`);
                fetchLaundryData();
              }
            } catch (err: any) {
              const msg = err?.response?.data?.error || 'Failed to process room distribution';
              Alert.alert('Error', msg);
            } finally {
              setActionInProgress(null);
            }
          },
        },
      ]
    );
  };

  // Filter bags ready for room distribution:
  // PROCESS_COMPLETED, RETURNED_TO_DROP, or (RECEIVED_AT_LAUNDRY and bag_status === 'Rejected')
  const distributeCandidates = transactions.filter((t) => {
    const isCompleted = t.current_status === 'PROCESS_COMPLETED' || t.current_status === 'RETURNED_TO_DROP';
    const isRejected = t.bag_status === 'Rejected' && t.current_status !== 'DISTRIBUTED_TO_ROOM';
    const matchesSearch =
      !distributeSearch ||
      t.guest_name.toLowerCase().includes(distributeSearch.toLowerCase()) ||
      t.room.toLowerCase().includes(distributeSearch.toLowerCase()) ||
      t.laundry_bag_id.toLowerCase().includes(distributeSearch.toLowerCase());

    return (isCompleted || isRejected) && matchesSearch && t.current_status !== 'DISTRIBUTED_TO_ROOM';
  });

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      {/* 3 Sub-Tabs navigation */}
      <View style={{ flexDirection: 'row', backgroundColor: '#ffffff', elevation: 2, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' }}>
        {(isDropper || isManager) && (
          <TouchableOpacity
            style={{
              flex: 1,
              paddingVertical: 12,
              borderBottomWidth: 3,
              borderBottomColor: activeSubSection === 'drop' ? '#93D533' : 'transparent',
              alignItems: 'center',
            }}
            onPress={() => setActiveSubSection('drop')}
          >
            <Text style={{ color: activeSubSection === 'drop' ? '#063126' : '#94a3b8', fontWeight: 'bold', fontSize: 11 }}>
              1. DROP FORM
            </Text>
          </TouchableOpacity>
        )}

        {(isDriver || isManager) && (
          <TouchableOpacity
            style={{
              flex: 1,
              paddingVertical: 12,
              borderBottomWidth: 3,
              borderBottomColor: activeSubSection === 'transport' ? '#93D533' : 'transparent',
              alignItems: 'center',
            }}
            onPress={() => setActiveSubSection('transport')}
          >
            <Text style={{ color: activeSubSection === 'transport' ? '#063126' : '#94a3b8', fontWeight: 'bold', fontSize: 11 }}>
              2. DRIVER LOGISTICS ({boxList.length})
            </Text>
          </TouchableOpacity>
        )}

        {(isDropper || isManager) && (
          <TouchableOpacity
            style={{
              flex: 1,
              paddingVertical: 12,
              borderBottomWidth: 3,
              borderBottomColor: activeSubSection === 'distribute' ? '#93D533' : 'transparent',
              alignItems: 'center',
            }}
            onPress={() => setActiveSubSection('distribute')}
          >
            <Text style={{ color: activeSubSection === 'distribute' ? '#063126' : '#94a3b8', fontWeight: 'bold', fontSize: 11 }}>
              3. ROOM DISTRIBUTION ({distributeCandidates.length})
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* --- SUB-TAB 1: LAUNDRY DROP FORM --- */}
      {activeSubSection === 'drop' && (
        <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
          <Text className="text-xl font-bold mb-4 text-primary">
            LAUNDRY DROP FORM (SOILED COLLECTION)
          </Text>

          <Input
            label="Guest Name *"
            value={guestName}
            onChangeText={setGuestName}
            placeholder="Guest Full Name"
          />

          <Input
            label="Room No *"
            value={room}
            onChangeText={setRoom}
            placeholder="Room Number (e.g., 101)"
          />

          <Input
            label="Laundry Bag ID *"
            value={bagId}
            onChangeText={setBagId}
            placeholder="Laundry Bag ID (e.g., BAG-101)"
          />

          <Input
            label="Laundry Box ID *"
            value={boxId}
            onChangeText={setBoxId}
            placeholder="Container / Box ID (e.g., BOX-A)"
          />

          <Select
            label="Package *"
            selectedValue={servicesPackage}
            onValueChange={setServicesPackage}
            options={[
              { label: 'Regular', value: 'Regular' },
              { label: 'Express', value: 'Express' },
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

          <View className="mt-4">
            <TouchableOpacity
              className="bg-secondary p-4 rounded-md items-center"
              onPress={submitDropForm}
              disabled={submittingDrop}
            >
              {submittingDrop ? (
                <ActivityIndicator color="#063126" />
              ) : (
                <Text className="text-secondary-foreground font-bold text-lg">Submit Drop Form</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* --- SUB-TAB 2: DRIVER BOX LOGISTICS --- */}
      {activeSubSection === 'transport' && (
        <View style={{ flex: 1 }}>
          <View style={{ padding: 12, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#063126' }}>
              🚚 Driver Container & Box Transport Management
            </Text>
            <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
              Transport soiled boxes to Central Laundry or return clean/rejected boxes back to Drop Points.
            </Text>
          </View>

          {loadingData && !refreshing ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#063126" />
              <Text style={{ marginTop: 8, color: '#64748b' }}>Loading laundry containers...</Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#063126']} />}
            >
              {boxList.length === 0 ? (
                <View style={{ padding: 30, alignItems: 'center' }}>
                  <Text style={{ color: '#94a3b8', fontSize: 14 }}>No active laundry boxes found</Text>
                </View>
              ) : (
                boxList.map((box) => (
                  <View
                    key={box.boxId}
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: 10,
                      padding: 14,
                      marginBottom: 10,
                      borderWidth: 1,
                      borderColor: '#e2e8f0',
                      shadowColor: '#000',
                      shadowOpacity: 0.04,
                      shadowRadius: 2,
                      shadowOffset: { width: 0, height: 1 },
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View>
                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#063126' }}>
                          📦 Box: {box.boxId}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                          Location: {box.drop_point || 'Central'} | Total: {box.total_bags} Bags
                        </Text>
                      </View>
                      <View
                        style={{
                          backgroundColor: box.isReadyToDeliver ? '#fffbeb' : box.isReadyToReturn ? '#ecfdf5' : '#f1f5f9',
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 6,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '700',
                            color: box.isReadyToDeliver ? '#b45309' : box.isReadyToReturn ? '#059669' : '#475569',
                          }}
                        >
                          {box.isReadyToDeliver ? 'Soiled at Drop Point' : box.isReadyToReturn ? 'Ready for Return' : 'Cleaning in Progress'}
                        </Text>
                      </View>
                    </View>

                    {/* Driver Action Buttons */}
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
                      {box.isReadyToDeliver && (
                        <TouchableOpacity
                          onPress={() => handleDeliverBox(box)}
                          disabled={actionInProgress === box.boxId}
                          style={{
                            backgroundColor: '#0284c7',
                            paddingHorizontal: 14,
                            paddingVertical: 8,
                            borderRadius: 6,
                          }}
                        >
                          {actionInProgress === box.boxId ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 12 }}>
                              ↗ Deliver to Central Laundry
                            </Text>
                          )}
                        </TouchableOpacity>
                      )}

                      {box.isReadyToReturn && (
                        <TouchableOpacity
                          onPress={() => handleReturnBox(box)}
                          disabled={actionInProgress === box.boxId}
                          style={{
                            backgroundColor: '#10b981',
                            paddingHorizontal: 14,
                            paddingVertical: 8,
                            borderRadius: 6,
                          }}
                        >
                          {actionInProgress === box.boxId ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 12 }}>
                              ↩ Return Box to Drop Point
                            </Text>
                          )}
                        </TouchableOpacity>
                      )}

                      {!box.isReadyToDeliver && !box.isReadyToReturn && (
                        <View style={{ paddingVertical: 4 }}>
                          <Text style={{ color: '#94a3b8', fontSize: 11, fontStyle: 'italic' }}>
                            Being processed by Central Laundry operators
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          )}
        </View>
      )}

      {/* --- SUB-TAB 3: DISTRIBUTE TO ROOM --- */}
      {activeSubSection === 'distribute' && (
        <View style={{ flex: 1 }}>
          <View style={{ padding: 12, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' }}>
            <TextInput
              style={{
                backgroundColor: '#f1f5f9',
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 8,
                fontSize: 14,
                color: '#0f172a',
                borderWidth: 1,
                borderColor: '#cbd5e1',
              }}
              placeholder="Search by guest name, room no, or bag ID..."
              placeholderTextColor="#94a3b8"
              value={distributeSearch}
              onChangeText={setDistributeSearch}
            />
            <Text style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
              Clean or rejected laundry bags ready to be delivered to guest rooms.
            </Text>
          </View>

          {loadingData && !refreshing ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#063126" />
              <Text style={{ marginTop: 8, color: '#64748b' }}>Loading bags ready for delivery...</Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#063126']} />}
            >
              {distributeCandidates.length === 0 ? (
                <View style={{ padding: 30, alignItems: 'center' }}>
                  <Text style={{ color: '#94a3b8', fontSize: 14 }}>No laundry bags waiting for room delivery</Text>
                </View>
              ) : (
                distributeCandidates.map((tx) => {
                  const isRejected = tx.bag_status === 'Rejected';
                  return (
                    <View
                      key={tx.id}
                      style={{
                        backgroundColor: '#ffffff',
                        borderRadius: 10,
                        padding: 14,
                        marginBottom: 10,
                        borderWidth: 1,
                        borderColor: isRejected ? '#fecaca' : '#e2e8f0',
                        shadowColor: '#000',
                        shadowOpacity: 0.04,
                        shadowRadius: 2,
                        shadowOffset: { width: 0, height: 1 },
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <View>
                          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#063126' }}>
                            {tx.guest_name} (Room {tx.room})
                          </Text>
                          <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                            Bag: {tx.laundry_bag_id} | Box: {tx.laundry_box_id} | {tx.services_package}
                          </Text>
                        </View>
                        <View
                          style={{
                            backgroundColor: isRejected ? '#fef2f2' : '#ecfdf5',
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor: isRejected ? '#ef4444' : '#10b981',
                          }}
                        >
                          <Text style={{ color: isRejected ? '#ef4444' : '#10b981', fontSize: 11, fontWeight: '700' }}>
                            {isRejected ? 'REJECTED (Return)' : 'CLEAN / READY'}
                          </Text>
                        </View>
                      </View>

                      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
                        <TouchableOpacity
                          onPress={() => handleDistributeToRoom(tx)}
                          disabled={actionInProgress === tx.laundry_bag_id}
                          style={{
                            backgroundColor: isRejected ? '#ea580c' : '#10b981',
                            paddingHorizontal: 14,
                            paddingVertical: 8,
                            borderRadius: 6,
                          }}
                        >
                          {actionInProgress === tx.laundry_bag_id ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 12 }}>
                              ✓ Deliver to Room {tx.room}
                            </Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
}
