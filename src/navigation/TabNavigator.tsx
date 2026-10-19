import React, { useContext } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import CustomTabBar from './CustomTabBar';
import ReservationScreen from '../screens/ReservationScreen';
import InformationScreen from '../screens/InformationScreen';
import MealsScreen from '../screens/MealsScreen';
import LaundryScreen from '../screens/LaundryScreen';
import { AuthContext } from '../context/AuthContext';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  const { role } = useContext(AuthContext);

  // RBAC Matrix
  const canViewInformation = true; // All roles can view
  const canViewReservations = role === 'SUPER' || role === 'ADMIN' || role === 'SUPERVISOR' || role === 'FRONTDESK';
  const canViewMeals = role === 'SUPER' || role === 'ADMIN' || role === 'SUPERVISOR' || role === 'FRONTDESK' || role === 'CANTEEN' || role === 'DRIVER';
  const canViewLaundry = role === 'SUPER' || role === 'ADMIN' || role === 'SUPERVISOR' || role === 'LAUNDR' || role === 'DRIVER' || role === 'LAUNDRY';

  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerStyle: {
          backgroundColor: '#063126', // dark green header
        },
        headerTintColor: '#fff',
      }}
    >
      {canViewInformation && (
        <Tab.Screen 
          name="Information" 
          component={InformationScreen} 
          options={{ title: 'Information' }}
        />
      )}
      {canViewReservations && (
        <Tab.Screen 
          name="Reservations" 
          component={ReservationScreen} 
          options={{ title: 'Reservations' }}
        />
      )}
      {canViewMeals && (
        <Tab.Screen 
          name="Meals" 
          component={MealsScreen} 
          options={{ title: 'Meals Services' }}
        />
      )}
      {canViewLaundry && (
        <Tab.Screen 
          name="Laundry" 
          component={LaundryScreen} 
          options={{ title: 'Laundry Services' }}
        />
      )}
    </Tab.Navigator>
  );
}
