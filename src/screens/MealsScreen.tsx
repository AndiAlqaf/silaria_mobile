import React, { useState, useEffect, useContext } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput, RefreshControl } from 'react-native';
import apiClient from '../api/client';
import Input from '../components/Input';
import Select from '../components/Select';
import { AuthContext } from '../context/AuthContext';
import { masterCache } from '../api/cache';

interface DeliveryPointOption {
  id: number;
  delivery_point?: string;
  name?: string;
}

interface MealRequestItem {
  id: number;
  date: string;
  guest_name: string;
  request_by?: string;
  approved_by?: string;
  meals_package: string;
  delivery_point?: string;
  meal_time: string;
  no_of_packs: number;
  remark?: string;
  status: 'PENDING' | 'APPROVED' | string;
}

interface DailyScheduleItem {
  date: string;
  room: string;
  mess: string;
  name: string;
  meals_packages?: string;
  breakfast_dp?: string;
  lunch_dp?: string;
  dinner_dp?: string;
  remark?: string;
}

export default function MealsScreen() {
  const { user, role } = useContext(AuthContext);

  const canApprove = role === 'SUPER' || role === 'ADMIN' || role === 'SUPERVISOR';

  // Sub-tabs: 'requests' | 'schedule'
  const [activeTab, setActiveTab] = useState<'requests' | 'schedule'>('requests');
  const [requestSubMode, setRequestSubMode] = useState<'list' | 'form'>('list');

  // Form State
  const [guestName, setGuestName] = useState('');
  const [mealsPackage, setMealsPackage] = useState('');
  const [deliveryPointId, setDeliveryPointId] = useState('');
  const [mealTime, setMealTime] = useState('');
  const [noOfPacks, setNoOfPacks] = useState('1');
  const [remark, setRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Delivery Points State
  const [deliveryPoints, setDeliveryPoints] = useState<{ label: string; value: string }[]>(masterCache.deliveryPoints);
  const [loadingDp, setLoadingDp] = useState(masterCache.deliveryPoints.length === 0);

  // Requests Data State
  const [requests, setRequests] = useState<MealRequestItem[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [approvingId, setApprovingId] = useState<number | null>(null);

  // Schedule Data State
  const [schedules, setSchedules] = useState<DailyScheduleItem[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [scheduleSearch, setScheduleSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDeliveryPoints();
    fetchRequests();
    fetchSchedule();
  }, []);

  const fetchDeliveryPoints = async () => {
    if (deliveryPoints.length === 0) {
      setLoadingDp(true);
    }
    try {
      const response = await apiClient.get('/meals?type=dp');
      if (response.data && (Array.isArray(response.data.data) || Array.isArray(response.data))) {
        const rawList: DeliveryPointOption[] = Array.isArray(response.data.data) ? response.data.data : response.data;
        const formatted = rawList.map((dp) => ({
          label: dp.delivery_point || dp.name || `Point ${dp.id}`,
          value: dp.id.toString(),
        }));
        masterCache.deliveryPoints = formatted;
        setDeliveryPoints(formatted);
      }
    } catch (e) {
      console.log('Using cached delivery points fallback');
    } finally {
      setLoadingDp(false);
    }
  };

  const fetchRequests = async () => {
    setLoadingRequests(true);
    try {
      const response = await apiClient.get('/meals?type=requests');
      const list = response.data?.data || response.data;
      if (Array.isArray(list)) {
        setRequests(list);
      }
    } catch (e) {
      console.log('Failed to fetch meal requests', e);
    } finally {
      setLoadingRequests(false);
      setRefreshing(false);
    }
  };

  const fetchSchedule = async () => {
    setLoadingSchedule(true);
    try {
      const response = await apiClient.get('/meals?type=schedule');
      const list = response.data?.data || response.data;
      if (Array.isArray(list)) {
        setSchedules(list);
      }
    } catch (e) {
      console.log('Failed to fetch meal schedule', e);
    } finally {
      setLoadingSchedule(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (activeTab === 'requests') {
      fetchRequests();
    } else {
      fetchSchedule();
    }
  };

  const submitData = async () => {
    if (!guestName.trim()) {
      Alert.alert('Validation Error', 'Guest or Event Name is required.');
      return;
    }
    if (!mealsPackage) {
      Alert.alert('Validation Error', 'Please select a Meals Package.');
      return;
    }
    if (!deliveryPointId) {
      Alert.alert('Validation Error', 'Please select a Delivery Point.');
      return;
    }
    if (!mealTime) {
      Alert.alert('Validation Error', 'Please select a Meal Time.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        action: 'create_request',
        guest_name: guestName,
        request_by: user?.name || user?.username || 'Mobile User',
        meals_package: mealsPackage,
        delivery_point_id: parseInt(deliveryPointId, 10),
        meal_time: mealTime,
        no_of_packs: parseInt(noOfPacks, 10) || 1,
        remark,
      };

      const response = await apiClient.post('/meals', payload);

      if (response.status === 200 || response.status === 201) {
        Alert.alert('Success', 'Meals Request submitted successfully with status PENDING!');
        setGuestName('');
        setMealsPackage('');
        setDeliveryPointId('');
        setMealTime('');
        setNoOfPacks('1');
        setRemark('');
        setRequestSubMode('list');
        fetchRequests();
      }
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.response?.data?.error || 'Failed to submit meals request';
      Alert.alert('Error', msg);
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (item: MealRequestItem) => {
    Alert.alert(
      'Confirm Meal Approval',
      `Approve meals request for "${item.guest_name}" (${item.no_of_packs} packs, ${item.meals_package})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve Request',
          onPress: async () => {
            setApprovingId(item.id);
            try {
              const payload = {
                action: 'approve_request',
                id: item.id,
                approved_by: user?.name || user?.username || 'Supervisor',
              };
              const response = await apiClient.post('/meals', payload);
              if (response.status === 200 || response.status === 201) {
                Alert.alert('Success', 'Meals request has been APPROVED and forwarded to kitchen!');
                fetchRequests();
              }
            } catch (err: any) {
              const msg = err?.response?.data?.error || 'Failed to approve meals request';
              Alert.alert('Error', msg);
            } finally {
              setApprovingId(null);
            }
          },
        },
      ]
    );
  };

  // Filter schedules
  const filteredSchedules = schedules.filter(
    (s) =>
      !scheduleSearch ||
      (s.name && s.name.toLowerCase().includes(scheduleSearch.toLowerCase())) ||
      (s.room && s.room.toLowerCase().includes(scheduleSearch.toLowerCase())) ||
      (s.mess && s.mess.toLowerCase().includes(scheduleSearch.toLowerCase()))
  );

  const totalPages = Math.max(1, Math.ceil(filteredSchedules.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedSchedules = filteredSchedules.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  const displayEnd = Math.min(startIndex + ITEMS_PER_PAGE, filteredSchedules.length);

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      {/* Top 2 Main Tabs: MEALS ON REQUEST vs DAILY SCHEDULE */}
      <View style={{ flexDirection: 'row', backgroundColor: '#ffffff', elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 2, shadowOffset: { height: 1, width: 0 } }}>
        <TouchableOpacity
          style={{
            flex: 1,
            paddingVertical: 14,
            borderBottomWidth: 3,
            borderBottomColor: activeTab === 'requests' ? '#93D533' : 'transparent',
            alignItems: 'center',
          }}
          onPress={() => setActiveTab('requests')}
        >
          <Text style={{ color: activeTab === 'requests' ? '#063126' : '#94a3b8', fontWeight: 'bold', fontSize: 13 }}>
            MEALS ON REQUEST ({requests.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            flex: 1,
            paddingVertical: 14,
            borderBottomWidth: 3,
            borderBottomColor: activeTab === 'schedule' ? '#93D533' : 'transparent',
            alignItems: 'center',
          }}
          onPress={() => setActiveTab('schedule')}
        >
          <Text style={{ color: activeTab === 'schedule' ? '#063126' : '#94a3b8', fontWeight: 'bold', fontSize: 13 }}>
            DAILY SCHEDULE ({schedules.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* --- TAB 1: MEALS ON REQUEST --- */}
      {activeTab === 'requests' && (
        <View style={{ flex: 1 }}>
          {/* Sub Switcher between Request List and New Request Form */}
          <View style={{ flexDirection: 'row', padding: 10, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', gap: 10 }}>
            <TouchableOpacity
              onPress={() => setRequestSubMode('list')}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 8,
                backgroundColor: requestSubMode === 'list' ? '#063126' : '#f1f5f9',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: requestSubMode === 'list' ? '#ffffff' : '#475569', fontWeight: '700', fontSize: 12 }}>
                Orders & Approvals List
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setRequestSubMode('form')}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 8,
                backgroundColor: requestSubMode === 'form' ? '#93D533' : '#f1f5f9',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: requestSubMode === 'form' ? '#063126' : '#475569', fontWeight: '700', fontSize: 12 }}>
                + New Order Form
              </Text>
            </TouchableOpacity>
          </View>

          {requestSubMode === 'form' ? (
            <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
              <Text className="text-xl font-bold mb-4 text-primary">
                MEALS ON REQUEST SUBMISSION FORM
              </Text>

              <Input
                label="Guest / Event Name *"
                value={guestName}
                onChangeText={setGuestName}
                placeholder="Guest Name or Meeting Event..."
              />

              <Select
                label="Meals Package *"
                selectedValue={mealsPackage}
                onValueChange={setMealsPackage}
                options={[
                  { label: 'Select Package', value: '' },
                  { label: 'Standard Buffet', value: 'Standard Buffet' },
                  { label: 'VIP Buffet', value: 'VIP Buffet' },
                  { label: 'Room Delivery', value: 'Room Delivery' },
                ]}
              />

              {loadingDp ? (
                <View className="mb-4 p-3 bg-white border border-border rounded-md flex-row items-center">
                  <ActivityIndicator size="small" color="#063126" />
                  <Text className="ml-2 text-slate-500">Loading delivery points...</Text>
                </View>
              ) : (
                <Select
                  label="Delivery Point *"
                  selectedValue={deliveryPointId}
                  onValueChange={setDeliveryPointId}
                  prompt="Select Delivery Point Location"
                  options={[
                    { label: 'Select Delivery Point', value: '' },
                    ...deliveryPoints,
                  ]}
                />
              )}

              <Select
                label="Meal Schedule (Meal Time) *"
                selectedValue={mealTime}
                onValueChange={setMealTime}
                options={[
                  { label: 'Select Meal Time', value: '' },
                  { label: 'BREAKFAST', value: 'BREAKFAST' },
                  { label: 'LUNCH', value: 'LUNCH' },
                  { label: 'DINNER', value: 'DINNER' },
                ]}
              />

              <Input
                label="No. of Packs (Portions) *"
                value={noOfPacks}
                onChangeText={setNoOfPacks}
                keyboardType="numeric"
                placeholder="1"
              />

              <Input
                label="Remark (Special Dietary Notes)"
                value={remark}
                onChangeText={setRemark}
                placeholder="Special notes (e.g., Main Meeting Room, Non-Spicy)"
                multiline
                numberOfLines={3}
              />

              <View className="mt-4">
                <TouchableOpacity
                  className="bg-secondary p-4 rounded-md items-center"
                  onPress={submitData}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#063126" />
                  ) : (
                    <Text className="text-secondary-foreground font-bold text-lg">Submit Request</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : (
            <View style={{ flex: 1 }}>
              {loadingRequests && !refreshing ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                  <ActivityIndicator size="large" color="#063126" />
                  <Text style={{ marginTop: 8, color: '#64748b' }}>Loading meal requests...</Text>
                </View>
              ) : (
                <ScrollView
                  contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
                  refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#063126']} />}
                >
                  {requests.length === 0 ? (
                    <View style={{ padding: 30, alignItems: 'center' }}>
                      <Text style={{ color: '#94a3b8', fontSize: 14 }}>No meal requests submitted yet</Text>
                    </View>
                  ) : (
                    requests.map((item) => {
                      const isApproved = item.status === 'APPROVED';
                      const badgeBg = isApproved ? '#ecfdf5' : '#fffbeb';
                      const badgeColor = isApproved ? '#10b981' : '#f59e0b';

                      return (
                        <View
                          key={item.id}
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
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <View style={{ flex: 1, marginRight: 8 }}>
                              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#063126' }}>
                                {item.guest_name}
                              </Text>
                              <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                                Date: {item.date} | Requested by: {item.request_by || '-'}
                              </Text>
                            </View>
                            <View
                              style={{
                                backgroundColor: badgeBg,
                                paddingHorizontal: 8,
                                paddingVertical: 3,
                                borderRadius: 6,
                                borderWidth: 1,
                                borderColor: badgeColor,
                              }}
                            >
                              <Text style={{ color: badgeColor, fontSize: 11, fontWeight: '700' }}>
                                {item.status}
                              </Text>
                            </View>
                          </View>

                          <View style={{ marginTop: 10, backgroundColor: '#f8fafc', padding: 8, borderRadius: 6 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                              <Text style={{ fontSize: 12, color: '#64748b' }}>Package:</Text>
                              <Text style={{ fontSize: 12, fontWeight: '700', color: '#063126' }}>{item.meals_package}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                              <Text style={{ fontSize: 12, color: '#64748b' }}>Schedule & Packs:</Text>
                              <Text style={{ fontSize: 12, fontWeight: '700', color: '#063126' }}>
                                {item.meal_time} ({item.no_of_packs} packs)
                              </Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                              <Text style={{ fontSize: 12, color: '#64748b' }}>Delivery Point:</Text>
                              <Text style={{ fontSize: 12, fontWeight: '600', color: '#334155' }}>
                                {item.delivery_point || '-'}
                              </Text>
                            </View>
                            {item.remark ? (
                              <Text style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic', marginTop: 4 }}>
                                Remark: {item.remark}
                              </Text>
                            ) : null}
                            {item.approved_by ? (
                              <Text style={{ fontSize: 11, color: '#059669', marginTop: 4 }}>
                                ✓ Approved by: {item.approved_by}
                              </Text>
                            ) : null}
                          </View>

                          {/* Approval Button for Supervisor / Admin */}
                          {item.status === 'PENDING' && canApprove && (
                            <View style={{ marginTop: 10, alignItems: 'flex-end' }}>
                              <TouchableOpacity
                                onPress={() => handleApprove(item)}
                                disabled={approvingId === item.id}
                                style={{
                                  backgroundColor: '#10b981',
                                  paddingHorizontal: 16,
                                  paddingVertical: 8,
                                  borderRadius: 6,
                                }}
                              >
                                {approvingId === item.id ? (
                                  <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                  <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 12 }}>
                                    ✓ Approve Request
                                  </Text>
                                )}
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      );
                    })
                  )}
                </ScrollView>
              )}
            </View>
          )}
        </View>
      )}

      {/* --- TAB 2: DAILY MEALS SCHEDULE (ROUTINE ON SITE MONITORING) --- */}
      {activeTab === 'schedule' && (
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
              placeholder="Search by resident name, room, or mess..."
              placeholderTextColor="#94a3b8"
              value={scheduleSearch}
              onChangeText={(text) => {
                setScheduleSearch(text);
                setCurrentPage(1);
              }}
            />
          </View>

          {loadingSchedule && !refreshing ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#063126" />
              <Text style={{ marginTop: 8, color: '#64748b' }}>Loading daily meal schedule...</Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#063126']} />}
            >
              <View style={{ marginBottom: 10, padding: 10, backgroundColor: '#f0fdf4', borderRadius: 8, borderWidth: 1, borderColor: '#bbf7d0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 12, color: '#166534', fontWeight: '600', flex: 1 }}>
                  ℹ Showing {filteredSchedules.length > 0 ? startIndex + 1 : 0}–{displayEnd} of {filteredSchedules.length} residents ON SITE
                </Text>
                <Text style={{ fontSize: 11, color: '#15803d', fontWeight: '700', marginLeft: 8 }}>
                  Page {currentPage}/{totalPages}
                </Text>
              </View>

              {filteredSchedules.length === 0 ? (
                <View style={{ padding: 30, alignItems: 'center' }}>
                  <Text style={{ color: '#94a3b8', fontSize: 14 }}>No active meal schedules found</Text>
                </View>
              ) : (
                paginatedSchedules.map((item, idx) => (
                  <View
                    key={idx}
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
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#063126' }}>
                          {item.name}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                          Room: {item.room} ({item.mess})
                        </Text>
                      </View>
                      <View style={{ backgroundColor: '#ecfdf5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#a7f3d0', alignSelf: 'flex-start' }}>
                        <Text style={{ color: '#059669', fontSize: 11, fontWeight: '700' }} numberOfLines={1}>
                          {item.meals_packages || 'Standard'}
                        </Text>
                      </View>
                    </View>

                    {/* Delivery points breakdown */}
                    <View style={{ marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9' }}>
                      <Text style={{ fontSize: 11, color: '#334155', marginBottom: 2 }}>
                        🌅 <Text style={{ fontWeight: '600' }}>Breakfast:</Text> {item.breakfast_dp || 'Main Canteen'}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#334155', marginBottom: 2 }}>
                        ☀️ <Text style={{ fontWeight: '600' }}>Lunch:</Text> {item.lunch_dp || 'Main Canteen'}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#334155' }}>
                        🌙 <Text style={{ fontWeight: '600' }}>Dinner:</Text> {item.dinner_dp || 'Main Canteen'}
                      </Text>
                    </View>
                  </View>
                ))
              )}

              {/* Pagination Bar */}
              {totalPages > 1 && (
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: '#ffffff',
                    padding: 12,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: '#e2e8f0',
                    marginTop: 6,
                    marginBottom: 20,
                  }}
                >
                  <TouchableOpacity
                    onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 6,
                      backgroundColor: currentPage === 1 ? '#f1f5f9' : '#063126',
                    }}
                  >
                    <Text style={{ color: currentPage === 1 ? '#94a3b8' : '#ffffff', fontWeight: 'bold', fontSize: 12 }}>
                      ◀ Prev
                    </Text>
                  </TouchableOpacity>

                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155' }}>
                    Page {currentPage} of {totalPages}
                  </Text>

                  <TouchableOpacity
                    onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 6,
                      backgroundColor: currentPage === totalPages ? '#f1f5f9' : '#063126',
                    }}
                  >
                    <Text style={{ color: currentPage === totalPages ? '#94a3b8' : '#ffffff', fontWeight: 'bold', fontSize: 12 }}>
                      Next ▶
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
}
