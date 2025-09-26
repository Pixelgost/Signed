import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet } from 'react-native';
import { Header } from '@/components/header';
import { SwipeInterface } from '@/components/swipe-interface';
import { LoginScreen } from '@/components/login-screen';
import { CreateAccountScreen } from '@/components/create-account-screen';
import { EmployerDashboard } from '@/components/employer-dashboard';
import { MatchesScreen } from '@/components/matches-screen';
import { ProfileScreen } from '@/components/profile-screen';
import { SearchScreen } from '@/components/search-screen';
import { MatchModal } from '@/components/match-modal';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { HomeIcon, SearchIcon, HeartIcon, UserIcon } from '@/components/icons';
import { colors } from '@/styles/colors';

const Tab = createBottomTabNavigator();

type AuthState = 'login' | 'create-account' | 'authenticated';
type UserType = 'applicant' | 'employer';

function ApplicantTabs({ onMatchFound }: { onMatchFound: () => void }) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="Home"
        options={{
          tabBarIcon: ({ color, size }) => <HomeIcon color={color} size={size} />,
        }}
      >
        {() => (
          <View style={styles.container}>
            <SwipeInterface onMatchFound={onMatchFound} />
          </View>
        )}
      </Tab.Screen>
      
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          tabBarIcon: ({ color, size }) => <SearchIcon color={color} size={size} />,
        }}
      />
      
      <Tab.Screen
        name="Matches"
        component={MatchesScreen}
        options={{
          tabBarIcon: ({ color, size }) => <HeartIcon color={color} size={size} />,
          tabBarBadge: 2,
        }}
      />
      
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => <UserIcon color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}

export default function HomeScreen() {
  const [authState, setAuthState] = useState<AuthState>('login');
  const [userType, setUserType] = useState<UserType>('applicant');
  const [showMatchModal, setShowMatchModal] = useState(false);

  const handleMatchFound = () => {
    setShowMatchModal(true);
  };

  const handleCloseMatchModal = () => {
    setShowMatchModal(false);
  };

  if (authState === 'login') {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <LoginScreen 
            onLogin={() => setAuthState('authenticated')}
            onCreateAccount={() => setAuthState('create-account')}
            onUserTypeSelect={setUserType}
          />
          <StatusBar style="auto" />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (authState === 'create-account') {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <CreateAccountScreen 
            onBack={() => setAuthState('login')}
            onAccountCreated={() => setAuthState('authenticated')}
            userType={userType}
          />
          <StatusBar style="auto" />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <NavigationContainer>
          {userType === 'applicant' ? (
            <ApplicantTabs onMatchFound={handleMatchFound} />
          ) : (
            <EmployerDashboard />
          )}
        </NavigationContainer>
        
        <MatchModal 
          visible={showMatchModal}
          onClose={handleCloseMatchModal}
        />
        
        <StatusBar style="auto" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  tabBar: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    height: 60,
    paddingBottom: 8,
    paddingTop: 8,
  },
});