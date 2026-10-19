import React, { useContext, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import DroppingDistributingScreen from './laundry/DroppingDistributingScreen';
import ReceivingCleaningScreen from './laundry/ReceivingCleaningScreen';
import { AuthContext } from '../context/AuthContext';

export default function LaundryScreen() {
  const { role } = useContext(AuthContext);

  const canDropDistribute = role === 'SUPER' || role === 'ADMIN' || role === 'SUPERVISOR' || role === 'LAUNDR' || role === 'DRIVER' || role === 'FRONTDESK';
  const canReceiveClean = role === 'SUPER' || role === 'ADMIN' || role === 'SUPERVISOR' || role === 'LAUNDRY';

  // Determine initial default active tab
  const defaultTab = canDropDistribute ? 'drop_distribute' : 'receive_clean';
  const [activeTab, setActiveTab] = useState<'drop_distribute' | 'receive_clean'>(defaultTab);

  const showTabBar = canDropDistribute && canReceiveClean;

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      {/* 2 Main Top Tabs matching Web UI */}
      {showTabBar && (
        <View style={{ flexDirection: 'row', backgroundColor: '#ffffff', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, shadowOffset: { height: 2, width: 0 } }}>
          <TouchableOpacity 
            style={{ 
              flex: 1, 
              paddingVertical: 14, 
              borderBottomWidth: 3, 
              borderBottomColor: activeTab === 'drop_distribute' ? '#93D533' : 'transparent', 
              alignItems: 'center' 
            }}
            onPress={() => setActiveTab('drop_distribute')}
          >
            <Text style={{ color: activeTab === 'drop_distribute' ? '#063126' : '#94a3b8', fontWeight: 'bold', fontSize: 11 }}>
              DROPPING & DISTRIBUTING
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={{ 
              flex: 1, 
              paddingVertical: 14, 
              borderBottomWidth: 3, 
              borderBottomColor: activeTab === 'receive_clean' ? '#93D533' : 'transparent', 
              alignItems: 'center' 
            }}
            onPress={() => setActiveTab('receive_clean')}
          >
            <Text style={{ color: activeTab === 'receive_clean' ? '#063126' : '#94a3b8', fontWeight: 'bold', fontSize: 11 }}>
              RECEIVING & CLEANING
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Render Active Main Tab */}
      <View style={{ flex: 1 }}>
        {activeTab === 'drop_distribute' && canDropDistribute && <DroppingDistributingScreen />}
        {activeTab === 'receive_clean' && canReceiveClean && <ReceivingCleaningScreen />}
      </View>
    </View>
  );
}


