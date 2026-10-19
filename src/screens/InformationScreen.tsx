import React, { useContext, useState } from 'react';
import { View, Text, Pressable, SafeAreaView } from 'react-native';
import { AuthContext } from '../context/AuthContext';

export default function InformationScreen() {
  const { user, role, logout } = useContext(AuthContext);
  const [isPressed, setIsPressed] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-8 pt-12">
        <Text className="text-3xl font-light text-foreground mb-2">Welcome,</Text>
        <Text className="text-4xl font-bold text-primary mb-12">{user?.name}</Text>
        
        <View className="mb-10">
            <Text className="text-xs uppercase tracking-widest text-slate-400 mb-2 font-semibold">Role</Text>
            <Text className="text-xl font-medium text-foreground">{role}</Text>
        </View>

        <View className="flex-1">
            <Text className="text-xs uppercase tracking-widest text-slate-400 mb-4 font-semibold">About</Text>
            <Text className="text-base text-slate-600 leading-7 mb-3">This is the mobile dashboard.</Text>
            <Text className="text-base text-slate-600 leading-7 mb-3">Use the tabs below to navigate through the app.</Text>
            <Text className="text-base text-slate-600 leading-7">Your access is restricted based on your role.</Text>
        </View>

        <View className="pb-32">
            <Pressable 
                onPress={logout}
                onPressIn={() => setIsPressed(true)}
                onPressOut={() => setIsPressed(false)}
                className={`py-4 border rounded-xl flex-row items-center justify-center ${
                    isPressed ? 'bg-red-500 border-red-500' : 'bg-red-50 border-red-200'
                }`}
            >
                <Text className={`font-semibold text-lg tracking-wide ${isPressed ? 'text-white' : 'text-red-600'}`}>
                    Log Out
                </Text>
            </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
