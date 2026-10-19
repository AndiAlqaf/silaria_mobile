import React, { useEffect, useRef, useState } from 'react';
import { View, TouchableOpacity, Animated, Dimensions, LayoutChangeEvent } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const TabBarIcon = ({ iconName, isFocused }: { iconName: any, isFocused: boolean }) => {
  const translateY = useRef(new Animated.Value(isFocused ? -25 : 0)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: isFocused ? -25 : 0,
      useNativeDriver: true,
      friction: 5,
      tension: 40,
    }).start();
  }, [isFocused]);

  return (
    <Animated.View style={{
        transform: [{ translateY }],
        alignItems: 'center',
        justifyContent: 'center',
        height: 60,
        width: 60,
    }}>
        <Ionicons 
            name={iconName} 
            size={24} 
            color={isFocused ? '#063126' : '#94a3b8'} 
        />
    </Animated.View>
  );
};

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  // Animasi translateX untuk lingkaran aktif
  const translateX = useRef(new Animated.Value(0)).current;
  const [tabBarWidth, setTabBarWidth] = useState(width); // Initial fallback width
  
  const tabWidth = tabBarWidth / state.routes.length;
  const circleSize = 60;

  useEffect(() => {
    Animated.spring(translateX, {
      toValue: state.index * tabWidth + (tabWidth - circleSize) / 2,
      useNativeDriver: true,
      friction: 5,
      tension: 40,
    }).start();
  }, [state.index, tabWidth]);

  return (
    <View 
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 70,
        backgroundColor: '#063126', // primary dark green
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
        flexDirection: 'row',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -5 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 10,
        alignItems: 'center',
      }}
      onLayout={(e: LayoutChangeEvent) => {
        setTabBarWidth(e.nativeEvent.layout.width);
      }}
    >
      {/* Sliding Active Indicator Background */}
      <Animated.View
        style={{
          position: 'absolute',
          width: circleSize,
          height: circleSize,
          borderRadius: circleSize / 2,
          backgroundColor: '#93D533', // Highlight lime green
          borderWidth: 6,
          borderColor: '#f8fafc', // Fake cutout matching InformationScreen background
          top: -20, // perfectly centers vertically with the -25 translateY of the icon
          left: 0,
          transform: [{ translateX }],
          zIndex: 1, 
        }}
      />

      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        let iconName: keyof typeof Ionicons.glyphMap = 'information-circle-outline';
        if (route.name === 'Laundry') iconName = isFocused ? 'shirt' : 'shirt-outline';
        else if (route.name === 'Reservations' || route.name === 'Reservasi') iconName = isFocused ? 'bed' : 'bed-outline';
        else if (route.name === 'Information' || route.name === 'Informasi') iconName = isFocused ? 'information-circle' : 'information-circle-outline';
        else if (route.name === 'Meals') iconName = isFocused ? 'restaurant' : 'restaurant-outline';

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%', zIndex: 2 }}
            activeOpacity={1} // Prevent opacity jump since we have smooth animations
          >
             <TabBarIcon iconName={iconName} isFocused={isFocused} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
