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

export default function App() {
  const [authState, setAuthState] = useState<AuthState>('login');
  const [userType, setUserType] = useState<UserType>('applicant');
  const [showMatchModal, setShowMatchModal] = useState(false);

  const handleLogin = (type: UserType) => {
    setUserType(type);
    setAuthState('authenticated');
  };

  const handleCreateAccount = (type: UserType) => {
    setUserType(type);
    setAuthState('login');
  };

  const handleMatchFound = () => {
    setShowMatchModal(true);
  };

  const handleMessageFromMatch = () => {
    setShowMatchModal(false);
    // In a real app, this would navigate to external messaging or contact form
    console.log('Contact employer functionality');
  };

  // Auth screens
  if (authState === 'login') {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.flex}>
          <StatusBar style="dark" />
          <LoginScreen 
            onLogin={handleLogin}
            onCreateAccount={() => setAuthState('create-account')}
          />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (authState === 'create-account') {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.flex}>
          <StatusBar style="dark" />
          <CreateAccountScreen
            onAccountCreated={handleCreateAccount}
            onBackToLogin={() => setAuthState('login')}
          />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  // Main app content
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <SafeAreaView style={styles.flex}>
          <StatusBar style="dark" />
          
          <Header 
            userName={userType === 'employer' ? 'Recruiter' : 'Alex'}
            notificationCount={3}
            onProfileClick={() => console.log('Profile clicked')}
            onSettingsClick={() => console.log('Settings clicked')}
            onNotificationsClick={() => console.log('Notifications clicked')}
          />
          
          {userType === 'employer' ? (
            <EmployerDashboard />
          ) : (
            <ApplicantTabs onMatchFound={handleMatchFound} />
          )}

          {userType === 'applicant' && (
            <MatchModal
              isOpen={showMatchModal}
              onClose={() => setShowMatchModal(false)}
              onSendMessage={handleMessageFromMatch}
              job={{
                title: 'Frontend Developer Intern',
                company: 'TechFlow',
                companyLogo: "https://images.unsplash.com/photo-1657885428127-38a40be4e232?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb21wYW55JTIwbG9nbyUyMGRlc2lnbnxlbnwxfHx8fDE3NTc0Mzc1NDV8MA&ixlib=rb-4.1.0&q=80&w=1080"
              }}
              userAvatar="https://images.unsplash.com/photo-1739298061757-7a3339cee982?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx8cHJvZmVzc2lvbmFsJTIwYnVzaW5lc3MlMjB0ZWFtfGVufDF8fHx8MTc1NzQ3MTQ1MXww&ixlib=rb-4.1.0&q=80&w=1080"
            />
          )}
        </SafeAreaView>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabBar: {
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: 8,
    paddingTop: 8,
    height: 60,
  },
});

/*
import { Image } from 'expo-image';
import { StyleSheet, Button, Alert } from 'react-native';
import { HelloWave } from '@/components/hello-wave';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Link } from 'expo-router';
import axios, { AxiosError } from 'axios';
import Constants from "expo-constants"

const machineIp = Constants.expoConfig?.extra?.MACHINE_IP;

export default function HomeScreen() {
  const handlePing = async () => {
    const apiUrl = `http://${machineIp}:8000/api/ping/`;

    try {
      const response = await axios.get(apiUrl);
      console.log('Success:', response.data);
      Alert.alert('Ping Success', JSON.stringify(response.data));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Axios error details:', error.message, error.toJSON?.());
        Alert.alert('Ping Failed', error.message);
      } else {
        console.error('Unexpected error:', error);
        Alert.alert('Ping Failed', 'Unexpected error');
      }
    }
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Welcome!</ThemedText>
        <HelloWave />
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Try pinging your backend</ThemedText>
        <Button title="Ping Backend" onPress={handlePing} />
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
});
*/
