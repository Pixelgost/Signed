import { CreateAccountScreen } from '@/components/create-account-screen';
import { EmployerDashboard } from '@/components/employer-dashboard';
import { EmployerProfileScreen } from '@/components/employer-profile-screen';
import { Header } from '@/components/header';
import { HeartIcon, HomeIcon, SearchIcon, UserIcon } from '@/components/icons';
import { LoginScreen } from '@/components/login-screen';
import { MatchModal } from '@/components/match-modal';
import { MatchesScreen } from '@/components/matches-screen';
import { ProfileScreen } from '@/components/profile-screen';
import { SearchScreen } from '@/components/search-screen';
import { SettingsScreen } from '@/components/settings-screen';
import { SwipeInterface } from '@/components/swipe-interface';
import { colors } from '@/styles/colors';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Constants from 'expo-constants';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

const Tab = createBottomTabNavigator();
const machineIp = Constants.expoConfig?.extra?.MACHINE_IP;

type AuthState = 'login' | 'create-account' | 'authenticated';
type UserType = 'applicant' | 'employer';

function EmployerTabs({ currentUser }: { currentUser: any | void }) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarShowLabel: true,
      }}
    >
      <Tab.Screen
        name="EmployerHome"
        component={EmployerDashboard}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => <HomeIcon color={color} size={size} />,
        }}
      />

      <Tab.Screen
        name="EmployerProfile"
        component={EmployerProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => <UserIcon color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}

function ApplicantTabs({
  onMatchFound,
  currentUser,
  onSignOut,
}: {
  onMatchFound: () => void;
  currentUser: any;
  onSignOut: () => void;
}) {
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
        component={SwipeInterface}
        options={{
          tabBarIcon: ({ color, size }) => <HomeIcon color={color} size={size} />,
        }}
      />

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
        options={{
          tabBarIcon: ({ color, size }) => <UserIcon color={color} size={size} />,
        }}
      >
        {() => <ProfileScreen currentUser={currentUser} onUserUpdate={setCurrentUser} />}
      </Tab.Screen>

      

      <Tab.Screen
        name="Settings"
        options={{
          tabBarIcon: ({ color, size }) => <UserIcon color={color} size={size} />,
        }}
      >
        {() => <SettingsScreen onSignOut={onSignOut} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}


export default function App() {
  const [authState, setAuthState] = useState<AuthState>('login');
  const [userType, setUserType] = useState<UserType>('applicant');
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);

  const handleLogin = async (type: UserType, userData: any) => {
    setUserType(type);
    setCurrentUser(userData);
    setAuthState('authenticated');
  };

  const handleSignOut = () => {
    setAuthState('login');
    setCurrentUser(null);
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
    console.log('Contact employer functionality');
  };

  
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

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.flex}>
        <StatusBar style="dark" />

        {/* Header stays persistent */}
        <Header
          userName={
            currentUser
              ? `${currentUser.first_name}`
              : userType === 'employer'
              ? 'Employer'
              : 'Applicant'
          }
          notificationCount={3}
          onProfileClick={() => console.log('Profile clicked')}
          onSettingsClick={() => setShowSettings(true)}
          onNotificationsClick={() => console.log('Notifications clicked')}
        />

        {/* Conditional Screen Rendering */}
        {showSettings ? (
          <SettingsScreen onSignOut={handleSignOut} />
        ) : userType === 'employer' ? (
          <EmployerTabs currentUser={currentUser} />
        ) : (
          <ApplicantTabs
            onMatchFound={handleMatchFound}
            currentUser={currentUser}
            onSignOut={handleSignOut}
          />
        )}

        {/* Applicant Match Modal */}
        {userType === 'applicant' && (
          <MatchModal
            isOpen={showMatchModal}
            onClose={() => setShowMatchModal(false)}
            onSendMessage={handleMessageFromMatch}
            job={{
              title: 'Frontend Developer Intern',
              company: 'TechFlow',
              companyLogo:
                'https://images.unsplash.com/photo-1657885428127-38a40be4e232?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb21wYW55JTIwbG9nbyUyMGRlc2lnbnxlbnwxfHx8fDE3NTc0Mzc1NDV8MA&ixlib=rb-4.1.0&q=80&w=1080',
            }}
            userAvatar="https://images.unsplash.com/photo-1739298061757-7a3339cee982?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBidXNpbmVzcyUyMHRlYW18ZW58MXx8fHw3fDE3NTc0NzE0NTF8MA&ixlib=rb-4.1.0&q=80&w=1080"
          />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

/* ------------------- Styles ------------------- */
const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabBar: {
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: 6,
    paddingTop: 6,
    height: 60,
  },
});
