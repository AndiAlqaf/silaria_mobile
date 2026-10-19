import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput, RefreshControl } from 'react-native';
import apiClient from '../api/client';
import Input from '../components/Input';
import Select from '../components/Select';
import DatePicker from '../components/DatePicker';
import { masterCache } from '../api/cache';

interface RoomOption {
  id: number;
  room_no?: string;
  room_number?: string;
  mess_name?: string;
  name?: string;
}

interface ReservationItem {
  id: number | string;
  guest_id: number;
  guestName: string;
  occupants_category?: string;
  roomNo?: string;
  messName?: string;
  area?: string;
  guest_status: string; // 'SCHEDULED' | 'ON SITE' | 'OFF SITE' | 'RE-SCHEDULED'
  check_in?: string | null;
  check_out?: string | null;
  estimated_arrival?: string | null;
  estimated_departure?: string | null;
  remark?: string;
}

export default function ReservationScreen() {
  const [activeTab, setActiveTab] = useState<'form' | 'checkin_out'>('form');

  // Form State
  const [guestName, setGuestName] = useState('');
  const [category, setCategory] = useState('REGULAR GUEST');
  const [roomId, setRoomId] = useState('');
  const [estimatedArrival, setEstimatedArrival] = useState<Date | null>(null);
  const [estimatedDeparture, setEstimatedDeparture] = useState<Date | null>(null);
  const [remark, setRemark] = useState('');

  const initialRooms = masterCache.rooms[category] || [
    { label: 'Room 101 (Mess A)', value: '101' },
    { label: 'Room 102 (Mess A)', value: '102' },
    { label: 'Room 201 (Mess B)', value: '201' },
  ];
  const [rooms, setRooms] = useState<{ label: string; value: string }[]>(initialRooms);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Check-In / Out List State
  const [reservations, setReservations] = useState<ReservationItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SCHEDULED' | 'ON SITE' | 'OFF SITE'>('ALL');
  const [updatingId, setUpdatingId] = useState<string | number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    fetchRooms();
  }, [category]);

  useEffect(() => {
    if (activeTab === 'checkin_out') {
      fetchReservations();
    }
  }, [activeTab]);

  const fetchRooms = async () => {
    const cached = masterCache.rooms[category];
    if (cached) {
      setRooms(cached);
    } else {
      setLoadingRooms(true);
    }
    try {
      const response = await apiClient.get(`/rooms?category=${encodeURIComponent(category)}`);
      if (response.data && (Array.isArray(response.data.data) || Array.isArray(response.data))) {
        const rawList: RoomOption[] = Array.isArray(response.data.data) ? response.data.data : response.data;
        const formatted = rawList.map((r) => {
          const roomLabel = r.room_no || r.room_number || r.name || `Room ${r.id}`;
          const messLabel = r.mess_name ? ` (${r.mess_name})` : '';
          return {
            label: `${roomLabel}${messLabel}`,
            value: r.id.toString(),
          };
        });
        masterCache.rooms[category] = formatted;
        setRooms(formatted);
      }
    } catch (e) {
      console.log('Using cached rooms fallback');
    } finally {
      setLoadingRooms(false);
    }
  };

  const fetchReservations = async () => {
    setLoadingList(true);
    try {
      const response = await apiClient.get('/reservations');
      const listData = response.data?.data || response.data;
      if (Array.isArray(listData)) {
        setReservations(listData);
      }
    } catch (e) {
      console.log('Failed to fetch reservations', e);
    } finally {
      setLoadingList(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchReservations();
  };

  const formatDateStr = (d: Date | null) => {
    if (!d) return '';
    const pad = (n: number) => (n < 10 ? '0' + n : n);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  const submitData = async () => {
    if (!guestName.trim()) {
      Alert.alert('Validation Error', 'Guest Name is required.');
      return;
    }
    if (!roomId) {
      Alert.alert('Validation Error', 'Please select a Room.');
      return;
    }
    if (!estimatedArrival || !estimatedDeparture) {
      Alert.alert('Validation Error', 'Estimated Arrival and Departure are required.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        guestName,
        category,
        room_id: parseInt(roomId, 10),
        estimated_arrival: formatDateStr(estimatedArrival),
        estimated_departure: formatDateStr(estimatedDeparture),
        remark,
      };

      const response = await apiClient.post('/reservations', payload);

      if (response.status === 200 || response.status === 201) {
        Alert.alert('Success', 'Reservation created successfully! Status recorded: SCHEDULED');
        setGuestName('');
        setRoomId('');
        setEstimatedArrival(null);
        setEstimatedDeparture(null);
        setRemark('');
        // Switch to check-in/out list
        setActiveTab('checkin_out');
      }
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Failed to save reservation to server';
      Alert.alert('Error', msg);
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (item: ReservationItem, newStatus: 'ON SITE' | 'OFF SITE') => {
    const actionLabel = newStatus === 'ON SITE' ? 'Check-In' : 'Check-Out';
    Alert.alert(
      `Confirm ${actionLabel}`,
      `Are you sure you want to process ${actionLabel} for guest "${item.guestName}" (Room ${item.roomNo || '-'})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Yes, ${actionLabel}`,
          onPress: async () => {
            setUpdatingId(item.id);
            try {
              const payload = {
                action: 'update_status',
                id: item.id,
                status: newStatus,
              };
              const response = await apiClient.post('/reservations', payload);
              if (response.status === 200 || response.status === 201) {
                Alert.alert('Success', `${actionLabel} processed successfully! New status: ${newStatus}`);
                fetchReservations();
              }
            } catch (err: any) {
              const msg = err?.response?.data?.error || `Failed to process ${actionLabel}`;
              Alert.alert('Error', msg);
            } finally {
              setUpdatingId(null);
            }
          },
        },
      ]
    );
  };

  // Filtered reservations
  const filteredReservations = reservations.filter((r) => {
    const matchesSearch =
      !searchQuery ||
      (r.guestName && r.guestName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.roomNo && r.roomNo.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.messName && r.messName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'SCHEDULED' && (r.guest_status === 'SCHEDULED' || r.guest_status === 'RE-SCHEDULED')) ||
      (statusFilter === 'ON SITE' && r.guest_status === 'ON SITE') ||
      (statusFilter === 'OFF SITE' && r.guest_status === 'OFF SITE');

    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filteredReservations.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedReservations = filteredReservations.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  const displayEnd = Math.min(startIndex + ITEMS_PER_PAGE, filteredReservations.length);

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      {/* Top Segmented Sub-Tabs */}
      <View style={{ flexDirection: 'row', backgroundColor: '#ffffff', elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 2, shadowOffset: { height: 1, width: 0 } }}>
        <TouchableOpacity
          style={{
            flex: 1,
            paddingVertical: 14,
            borderBottomWidth: 3,
            borderBottomColor: activeTab === 'form' ? '#93D533' : 'transparent',
            alignItems: 'center',
          }}
          onPress={() => setActiveTab('form')}
        >
          <Text style={{ color: activeTab === 'form' ? '#063126' : '#94a3b8', fontWeight: 'bold', fontSize: 13 }}>
            NEW RESERVATION
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            flex: 1,
            paddingVertical: 14,
            borderBottomWidth: 3,
            borderBottomColor: activeTab === 'checkin_out' ? '#93D533' : 'transparent',
            alignItems: 'center',
          }}
          onPress={() => setActiveTab('checkin_out')}
        >
          <Text style={{ color: activeTab === 'checkin_out' ? '#063126' : '#94a3b8', fontWeight: 'bold', fontSize: 13 }}>
            CHECK-IN / OUT ({reservations.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content based on Active Tab */}
      {activeTab === 'form' ? (
        <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
          <Text className="text-xl font-bold mb-4 text-primary">
            NEW ROOM RESERVATION FORM
          </Text>

          <Input
            label="Guest Name *"
            value={guestName}
            onChangeText={setGuestName}
            placeholder="Enter Guest Full Name"
          />

          <Select
            label="Guest Category *"
            selectedValue={category}
            onValueChange={setCategory}
            options={[
              { label: 'SPECIAL GUEST', value: 'SPECIAL GUEST' },
              { label: 'VIP GUEST', value: 'VIP GUEST' },
              { label: 'REGULAR GUEST', value: 'REGULAR GUEST' },
            ]}
          />

          {loadingRooms ? (
            <View className="mb-4 p-3 bg-white border border-border rounded-md flex-row items-center">
              <ActivityIndicator size="small" color="#063126" />
              <Text className="ml-2 text-slate-500">Loading available vacant rooms...</Text>
            </View>
          ) : (
            <Select
              label="Room *"
              selectedValue={roomId}
              onValueChange={setRoomId}
              prompt="Select Room"
              options={[
                { label: 'Select Available Room', value: '' },
                ...rooms,
              ]}
            />
          )}

          <DatePicker
            label="Estimated Arrival *"
            date={estimatedArrival}
            onDateChange={setEstimatedArrival}
            mode="datetime"
            placeholder="Select Arrival Date & Time"
          />

          <DatePicker
            label="Estimated Departure *"
            date={estimatedDeparture}
            onDateChange={setEstimatedDeparture}
            mode="datetime"
            placeholder="Select Departure Date & Time"
          />

          <Input
            label="Remark"
            value={remark}
            onChangeText={setRemark}
            placeholder="Additional notes (e.g., Head Office VIP Delegate)"
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
                <Text className="text-secondary-foreground font-bold text-lg">Save Reservation</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Search & Filters */}
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
                marginBottom: 8,
              }}
              placeholder="Search by guest name, room no, or mess..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                setCurrentPage(1);
              }}
            />

            {/* Quick Filter Badges */}
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {(['ALL', 'SCHEDULED', 'ON SITE', 'OFF SITE'] as const).map((st) => (
                <TouchableOpacity
                  key={st}
                  onPress={() => {
                    setStatusFilter(st);
                    setCurrentPage(1);
                  }}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 16,
                    backgroundColor: statusFilter === st ? '#063126' : '#e2e8f0',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '700',
                      color: statusFilter === st ? '#ffffff' : '#475569',
                    }}
                  >
                    {st}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* List of Reservations */}
          {loadingList && !refreshing ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#063126" />
              <Text style={{ marginTop: 8, color: '#64748b' }}>Loading reservations...</Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#063126']} />}
            >
              <View style={{ marginBottom: 10, padding: 10, backgroundColor: '#f0fdf4', borderRadius: 8, borderWidth: 1, borderColor: '#bbf7d0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 12, color: '#166534', fontWeight: '600', flex: 1 }}>
                  ℹ Showing {filteredReservations.length > 0 ? startIndex + 1 : 0}–{displayEnd} of {filteredReservations.length} guest records
                </Text>
                <Text style={{ fontSize: 11, color: '#15803d', fontWeight: '700', marginLeft: 8 }}>
                  Page {currentPage}/{totalPages}
                </Text>
              </View>

              {filteredReservations.length === 0 ? (
                <View style={{ padding: 30, alignItems: 'center' }}>
                  <Text style={{ color: '#94a3b8', fontSize: 14 }}>No reservation records found</Text>
                </View>
              ) : (
                paginatedReservations.map((item) => {
                  const isScheduled = item.guest_status === 'SCHEDULED' || item.guest_status === 'RE-SCHEDULED';
                  const isOnSite = item.guest_status === 'ON SITE';
                  const isOffSite = item.guest_status === 'OFF SITE';

                  const badgeColor = isOnSite ? '#10b981' : isScheduled ? '#f59e0b' : '#64748b';
                  const badgeBg = isOnSite ? '#ecfdf5' : isScheduled ? '#fffbeb' : '#f1f5f9';

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
                            {item.guestName || 'Unnamed Guest'}
                          </Text>
                          <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                            {item.occupants_category || 'REGULAR GUEST'}
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
                            {item.guest_status}
                          </Text>
                        </View>
                      </View>

                      {/* Room & Mess info */}
                      <View style={{ flexDirection: 'row', marginTop: 8, alignItems: 'center' }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#334155' }}>
                          Room: {item.roomNo || '-'}
                        </Text>
                        {item.messName ? (
                          <Text style={{ fontSize: 13, color: '#64748b', marginLeft: 8 }}>
                            ({item.messName})
                          </Text>
                        ) : null}
                      </View>

                      {/* Dates */}
                      <View style={{ marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#f1f5f9' }}>
                        {item.check_in ? (
                          <Text style={{ fontSize: 11, color: '#059669' }}>
                            Checked In: {item.check_in}
                          </Text>
                        ) : item.estimated_arrival ? (
                          <Text style={{ fontSize: 11, color: '#64748b' }}>
                            Est. Arrival: {item.estimated_arrival}
                          </Text>
                        ) : null}

                        {item.check_out ? (
                          <Text style={{ fontSize: 11, color: '#dc2626' }}>
                            Checked Out: {item.check_out}
                          </Text>
                        ) : item.estimated_departure ? (
                          <Text style={{ fontSize: 11, color: '#64748b' }}>
                            Est. Departure: {item.estimated_departure}
                          </Text>
                        ) : null}

                        {item.remark ? (
                          <Text style={{ fontSize: 11, color: '#475569', fontStyle: 'italic', marginTop: 4 }}>
                            Remark: {item.remark}
                          </Text>
                        ) : null}
                      </View>

                      {/* Action Buttons: Quick Check-In / Check-Out */}
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
                        {isScheduled && (
                          <TouchableOpacity
                            onPress={() => handleUpdateStatus(item, 'ON SITE')}
                            disabled={updatingId === item.id}
                            style={{
                              backgroundColor: '#10b981',
                              paddingHorizontal: 14,
                              paddingVertical: 7,
                              borderRadius: 6,
                            }}
                          >
                            {updatingId === item.id ? (
                              <ActivityIndicator size="small" color="#fff" />
                            ) : (
                              <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 12 }}>
                                ✓ Check-In
                              </Text>
                            )}
                          </TouchableOpacity>
                        )}

                        {isOnSite && (
                          <TouchableOpacity
                            onPress={() => handleUpdateStatus(item, 'OFF SITE')}
                            disabled={updatingId === item.id}
                            style={{
                              backgroundColor: '#ef4444',
                              paddingHorizontal: 14,
                              paddingVertical: 7,
                              borderRadius: 6,
                            }}
                          >
                            {updatingId === item.id ? (
                              <ActivityIndicator size="small" color="#fff" />
                            ) : (
                              <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 12 }}>
                                ✕ Check-Out
                              </Text>
                            )}
                          </TouchableOpacity>
                        )}

                        {isOffSite && (
                          <View style={{ paddingHorizontal: 10, paddingVertical: 4 }}>
                            <Text style={{ color: '#94a3b8', fontSize: 11, fontStyle: 'italic' }}>
                              Room is Vacant
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })
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
