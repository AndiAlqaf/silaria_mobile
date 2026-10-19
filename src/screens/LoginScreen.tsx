import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView, ImageBackground, StatusBar } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useContext(AuthContext);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please enter username and password');
      return;
    }
    
    try {
      await login(username, password);
    } catch (error: any) {
      Alert.alert('Login Failed', error.message);
    }
  };

  return (
    <ImageBackground 
      source={require('../../assets/DJI_20260215123424_0157_D.JPG.jpeg')} 
      style={{ flex: 1 }}
      resizeMode="cover"
    >
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      {/* Overlay Gelap */}
      <View className="flex-1 bg-black/60">
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between', padding: 24, paddingTop: 60 }}>
            
            {/* Bagian Header & Logo */}
            <View className="items-center mt-10">
              <View className="w-20 h-20 bg-[#93D533] rounded-2xl items-center justify-center mb-4">
                <Ionicons name="business" size={40} color="#063126" />
              </View>
              <Text className="text-4xl font-extrabold text-white tracking-widest mb-2">SILARIA</Text>
              <Text className="text-white/90 text-xs text-center font-bold tracking-wider mb-1">
                SISTEM INFORMASI LAYANAN AKOMODASI GFS
              </Text>
              <Text className="text-white/80 text-xs text-center font-bold tracking-widest">
                PT. CERIA
              </Text>
              <View className="w-16 h-1 bg-[#93D533] mt-4 rounded-full" />
            </View>

            {/* Bagian Card Form Login */}
            <View className="bg-white rounded-3xl p-6 shadow-lg shadow-black/20 w-full mb-10">
              <View className="mb-6">
                <Text className="text-2xl font-extrabold text-[#063126]">Welcome Back</Text>
                <Text className="text-[#063126]/60 text-sm mt-1">Sign in to your account</Text>
              </View>

              {/* Username Input */}
              <View className="mb-4">
                <Text className="text-xs font-bold text-[#063126] mb-2">Username</Text>
                <View className="flex-row items-center border border-slate-200 rounded-xl px-4 py-3 bg-white focus:border-[#93D533]">
                  <Ionicons name="person-outline" size={20} color="#94a3b8" />
                  <TextInput
                    className="flex-1 ml-3 text-base text-[#063126]"
                    placeholder="Enter username"
                    placeholderTextColor="#94a3b8"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Password Input */}
              <View className="mb-6">
                <Text className="text-xs font-bold text-[#063126] mb-2">Password</Text>
                <View className="flex-row items-center border border-slate-200 rounded-xl px-4 py-3 bg-white focus:border-[#93D533]">
                  <Ionicons name="lock-closed-outline" size={20} color="#94a3b8" />
                  <TextInput
                    className="flex-1 ml-3 text-base text-[#063126]"
                    placeholder="Enter password"
                    placeholderTextColor="#94a3b8"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="p-1">
                    <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#94a3b8" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Login Button */}
              <TouchableOpacity
                className="bg-[#93D533] py-4 rounded-xl flex-row justify-center items-center shadow-sm"
                onPress={handleLogin}
              >
                <Text className="text-[#063126] font-extrabold text-lg mr-2">Sign In To Apps</Text>
                <Ionicons name="arrow-forward" size={20} color="#063126" />
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <Text className="text-white/60 text-xs text-center pb-4">
              © 2026 GFS Ceria Accommodation System.
            </Text>

          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </ImageBackground>
  );
}
