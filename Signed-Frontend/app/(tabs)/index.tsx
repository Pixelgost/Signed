import React, { useState, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer, LinkingOptions } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, StyleSheet, Text, Linking, Modal } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import Constants from "expo-constants";
import * as DeepLinking from "expo-linking";
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from "axios";
import { Header } from "@/components/header";
import { Notification } from "@/components/notification-item";
import { SwipeInterface } from "@/components/swipe-interface";
import { LoginScreen } from "@/components/login-screen";
import { CreateAccountScreen } from "@/components/create-account-screen";
import { EmployerDashboard } from "@/components/employer-dashboard";
import { MatchesScreen } from "@/components/matches-screen";
import { ProfileScreen } from "@/components/profile-screen";
import { SearchScreen } from "@/components/search-screen";
import { SettingsScreen } from "@/components/settings-screen";
import { MatchModal } from "@/components/match-modal";
import { EmployerProfileScreen } from "@/components/employer-profile-screen";
import { PersonalityQuiz } from "@/components/personality-quiz";
import { SharedJobScreen } from "@/components/shared-job-screen";
import { LikedJobsScreen } from "@/components/liked-jobs-screen";

import {
  VerifyEmailScreen,
  EnterVerificationCodeScreen,
  PasswordResetScreen,
} from "@/components/forgot-password";
import { HomeIcon, SearchIcon, HeartIcon, UserIcon } from "@/components/icons";
import { getColors } from "@/styles/colors";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";


const Tab = createBottomTabNavigator();
const machineIp = Constants.expoConfig?.extra?.MACHINE_IP;

type AuthState =
  | "login"
  | "create-account"
  | "authenticated"
  | "forgot-password";
type UserType = "applicant" | "employer";

function EmployerTabs({ currentUser, initialRouteName, onSwitchEmployerTab }: { currentUser: any | void, initialRouteName: string, onSwitchEmployerTab: (route: string) => void }) {
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const tabBarStyles = createTabBarStyles(colors);
  
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: tabBarStyles.tabBar,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarShowLabel: false,
      }}
      initialRouteName={initialRouteName}
      screenListeners={{
        state: (e) => {
          onSwitchEmployerTab(e.data.state.routeNames[e.data.state.index]);
        },
      }}
    >
      <Tab.Screen
        name="EmployerHome"
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size }) => (
            <HomeIcon color={color} size={size} />
          ),
        }}
      >
        {() => (
          <EmployerDashboard
            userId={currentUser.id}
            userEmail={currentUser.email}
          />
        )}
      </Tab.Screen>

      <Tab.Screen
        name="EmployerProfile"
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size }) => (
            <UserIcon color={color} size={size} />
          ),
        }}
      >
        {() => <EmployerProfileScreen currentUser={currentUser} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

function ApplicantTabs({
  onMatchFound,
  currentUser,
  onSignOut,
  onStartPersonalityQuiz,
  onSwitchApplicantTab,
  initialRouteName,
  onViewLikes
}: {
  onMatchFound: () => void;
  currentUser: any;
  onSignOut: () => void;
  onSwitchApplicantTab: (route: string) => void;
  initialRouteName: string;
  onViewLikes: () => void;
}) {
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const tabBarStyles = createTabBarStyles(colors);
  
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: tabBarStyles.tabBar,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarShowLabel: false,
      }}
      initialRouteName={initialRouteName}
      screenListeners={{
        state: (e) => {
          onSwitchApplicantTab(e.data.state.routeNames[e.data.state.index]);
        },
      }}
    >
      <Tab.Screen
        name="Home"
        options={{
          tabBarIcon: ({ color, size }) => (
            <HomeIcon color={color} size={size} />
          ),
        }}
      >
        {() => <SwipeInterface userId={currentUser.id} />}
      </Tab.Screen>

      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <SearchIcon color={color} size={size} />
          ),
        }}
      />

      <Tab.Screen
        name="Matches"
        component={MatchesScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <HeartIcon color={color} size={size} />
          ),
          tabBarBadge: 2,
        }}
      />

      <Tab.Screen
        name="Profile"
        options={{
          tabBarIcon: ({ color, size }) => (
            <UserIcon color={color} size={size} />
          ),
        }}
      >
        {() => <ProfileScreen currUser={currentUser} onStartPersonalityQuiz={onStartPersonalityQuiz} onViewLikes={onViewLikes} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

function AppContent() {
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const [authState, setAuthState] = useState<AuthState>("login");
  const [userType, setUserType] = useState<UserType>("applicant");
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showEmployerProfile, setShowEmployerProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPersonalityQuiz, setShowPersonalityQuiz] = useState(false);
  const [forgotPasswordCarouselStage, setForgotPasswordCarouselStage] =
    useState(0);
  const [contact, setContact] = useState("");
  const [verificationMethod, setVerificationMethod] = useState("");
  const [applicantTab, setApplicantTab] = useState("Home");
  const [employerTab, setEmployerTab] = useState("EmployerHome");
  const [currentTab, setCurrentTab] = useState<string>();
  const [showSharedJob, setShowSharedJob] = useState(false);
  const [sharedJobToken, setSharedJobToken] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showLikedJobs, setShowLikedJobs] = useState(false);


  // React.useEffect(() => {
  //   if (userType === "employer") {
  //     // Only valid employer tabs
  //     if (currentTab !== "EmployerHome" && currentTab !== "EmployerProfile") {
  //       setCurrentTab("EmployerHome");
  //     }
  //   } else {
  //     // Only valid applicant tabs
  //     if (currentTab !== "Home" && currentTab !== "Search" && currentTab !== "Matches" && currentTab !== "Profile") {
  //       setCurrentTab("Home");
  //     }
  //   }
  // }, [userType]);



  /*useEffect(() => {
    const checkToken = async () => {
      const token = await AsyncStorage.getItem('userToken');
      const userDataStr = await AsyncStorage.getItem('userData');
      if (token && userDataStr) {
        setCurrentUser(JSON.parse(userDataStr));
        setAuthState('authenticated');
      }
    };
    checkToken();
  }, []);*/

  const handleLogin = async (type: UserType, userData: any) => {
    // Use the role from userData if available, otherwise fall back to the type parameter
    // Ensure the role is valid (either "applicant" or "employer")
    const roleFromData = userData?.role;
    const actualRole = (roleFromData === "applicant" || roleFromData === "employer") 
      ? roleFromData 
      : type;
    setUserType(actualRole as UserType);
    setCurrentUser(userData);
    setAuthState("authenticated");
  };

  const handleSignOut = () => {
    setAuthState("login");
    setCurrentUser(null);
    setShowSettings(false);
    setShowEmployerProfile(false);
  };

  const handleForgotPassword = async () => {
    setAuthState("forgot-password");
  };

  const handleCreateAccount = (type: UserType) => {
    setUserType(type);
    setAuthState("login");
  };

  const handleMatchFound = () => {
    setShowMatchModal(true);
  };

  const handleSettings = () => {
    setShowSettings(true);
  };

  const handleMessageFromMatch = () => {
    setShowMatchModal(false);
    // In a real app, this would navigate to external messaging or contact form
    console.log("Contact employer functionality");
  };

  const handleIncrementCarousel = (contact: string) => {
    setForgotPasswordCarouselStage(forgotPasswordCarouselStage + 1);
    setContact(contact);
  };

  const handleDecrementCarousel = () => {
    setForgotPasswordCarouselStage(forgotPasswordCarouselStage - 1);
  };

  const handleBackToLogin = () => {
    setAuthState("login");
    setForgotPasswordCarouselStage(0);
    setContact("");
  };

  const fetchNotifications = React.useCallback(async () => {
    if (authState !== "authenticated" || !currentUser) return;

    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const response = await axios.get(
        `http://${machineIp}:8000/api/v1/users/notifications/`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data?.status === 'success' && response.data?.notifications) {
        const apiNotifications: Notification[] = response.data.notifications.map((n: any) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          timestamp: new Date(n.created_at),
          read: n.read,
          type: n.notification_type || 'info',
          onPress: n.job_posting ? () => {
            console.log("Navigate to job posting:", n.job_posting);
          } : undefined,
        }));

        setNotifications(apiNotifications);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  }, [authState, currentUser, machineIp]);

  const handleNotificationPress = async (notification: Notification) => {
    if (!notification.read) {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          await axios.post(
            `http://${machineIp}:8000/api/v1/users/notifications/mark-read/`,
            { notification_id: notification.id },
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
        }
      } catch (error) {
        console.error("Error marking notification as read:", error);
      }
    }

    setNotifications(prev =>
      prev.map(n =>
        n.id === notification.id ? { ...n, read: true } : n
      )
    );

    if (notification.onPress) {
      notification.onPress();
    } else {
      console.log("Notification pressed:", notification);
    }
  };

  const handleDismissNotification = async (notificationId: string) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        await axios.delete(
          `http://${machineIp}:8000/api/v1/users/notifications/delete/?notification_id=${notificationId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
    }

    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const handleMarkAllAsRead = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        const unreadNotifications = notifications.filter(n => !n.read);
        for (const notification of unreadNotifications) {
          try {
            await axios.post(
              `http://${machineIp}:8000/api/v1/users/notifications/mark-read/`,
              { notification_id: notification.id },
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );
          } catch (error) {
            console.error(`Error marking notification ${notification.id} as read:`, error);
          }
        }
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }

    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  React.useEffect(() => {
    if (authState === "authenticated" && currentUser) {
      fetchNotifications();
      
      const interval = setInterval(() => {
        fetchNotifications();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [authState, currentUser, fetchNotifications]);

  const appStyles = createAppStyles(colors);

  // Auth screens
  if (authState === "login") {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={appStyles.flex}>
          <StatusBar style={isDark ? "light" : "dark"} />
          <LoginScreen
            onLogin={handleLogin}
            onCreateAccount={() => setAuthState("create-account")}
            onForgotPassword={handleForgotPassword}
          />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (authState === "create-account") {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={appStyles.flex}>
          <StatusBar style={isDark ? "light" : "dark"} />
          <CreateAccountScreen
            onAccountCreated={handleCreateAccount}
            onBackToLogin={() => setAuthState("login")}
          />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }
  if (authState === "forgot-password") {
    if (forgotPasswordCarouselStage == 0) {
      return (
        <SafeAreaProvider>
          <SafeAreaView style={appStyles.flex}>
            <StatusBar style={isDark ? "light" : "dark"} />
            <VerifyEmailScreen
              onNextScreen={handleIncrementCarousel}
              onPreviousScreen={handleBackToLogin}
              contact={""}
            />
          </SafeAreaView>
        </SafeAreaProvider>
      );
    } else if (forgotPasswordCarouselStage == 1) {
      return (
        <SafeAreaProvider>
          <SafeAreaView style={appStyles.flex}>
            <StatusBar style={isDark ? "light" : "dark"} />
            <EnterVerificationCodeScreen
              onNextScreen={handleIncrementCarousel}
              onPreviousScreen={handleDecrementCarousel}
              contact={contact}
            />
          </SafeAreaView>
        </SafeAreaProvider>
      );
    } else if (forgotPasswordCarouselStage == 2) {
      return (
        <SafeAreaProvider>
          <SafeAreaView style={appStyles.flex}>
            <StatusBar style={isDark ? "light" : "dark"} />
            <PasswordResetScreen
              onNextScreen={handleBackToLogin}
              onPreviousScreen={handleBackToLogin}
              contact={contact}
            />
          </SafeAreaView>
        </SafeAreaProvider>
      );
    }
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={appStyles.flex}>
        <StatusBar style={isDark ? "light" : "dark"} />

        {/* Header */}
        <Header
          userName={
            currentUser
              ? `${currentUser.first_name}`
              : userType === "employer"
              ? "Employer"
              : "Applicant"
          }
          notificationCount={notifications.filter(n => !n.read).length}
          notifications={notifications}
          onProfileClick={() => console.log("Profile clicked")}
          onSettingsClick={() => setShowSettings(true)}
          onNotificationPress={handleNotificationPress}
          onDismissNotification={handleDismissNotification}
          onMarkAllAsRead={handleMarkAllAsRead}
          onRefreshNotifications={fetchNotifications}
        />

        {/* {userType === "employer" && (
          <EmployerDashboard userId={currentUser.id} userEmail={currentUser.email} userCompany={currentUser.company_name} />
        )} */}

        {/* Conditional Screen Rendering */}
        {/* {showSettings ? (
          <SettingsScreen onSignOut={handleSignOut} onBackButton={() => {
              setShowSettings(false);
          }}/>
        ) : userType === "employer" ? (
          <EmployerTabs currentUser={currentUser}  
            initialRouteName={currentTab === "" ? "EmployerHome" : currentTab}
            onSwitchEmployerTab={(routeName) => {
              setCurrentTab(routeName);
            }}/>
        ) : (
          <ApplicantTabs
            onMatchFound={handleMatchFound}
            currentUser={currentUser}
            onSignOut={handleSignOut}
            initialRouteName={currentTab === "" ? "Home" : currentTab}
            onSwitchApplicantTab={(routeName) => {
              setCurrentTab(routeName);
            }}
          />
        )} */}
        {showSettings ? (
          <SettingsScreen onBackButton={() => setShowSettings(false)} onSignOut={handleSignOut}/>
        ) : showPersonalityQuiz ? (
          <PersonalityQuiz onBack={() => setShowPersonalityQuiz(false)} />
        ) : userType === "employer" ? (
          <EmployerTabs
            currentUser={currentUser}
            initialRouteName={employerTab}
            onSwitchEmployerTab={setEmployerTab}
          />
        ) : (
          <ApplicantTabs
            onMatchFound={handleMatchFound}
            currentUser={currentUser}
            onSignOut={handleSignOut}
            onStartPersonalityQuiz={() => setShowPersonalityQuiz(true)}
            initialRouteName={applicantTab}
            onSwitchApplicantTab={setApplicantTab}
            onViewLikes={() => setShowLikedJobs(true)}
          />
        )}



        {/* Applicant Match Modal */}
        {userType === "applicant" && (
          <MatchModal
            isOpen={showMatchModal}
            onClose={() => setShowMatchModal(false)}
            onSendMessage={handleMessageFromMatch}
            job={{
              title: "Frontend Developer Intern",
              company: "TechFlow",
              companyLogo:
                "https://images.unsplash.com/photo-1657885428127-38a40be4e232?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb21wYW55JTIwbG9nbyUyMGRlc2lnbnxlbnwxfHx8fDE3NTc0Mzc1NDV8MA&ixlib=rb-4.1.0&q=80&w=1080",
            }}
            userAvatar="https://images.unsplash.com/photo-1739298061757-7a3339cee982?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx8cHJvZmVzc2lvbmFsJTIwYnVzaW5lc3MlMjB0ZWFtfGVufDF8fHx8MTc1NzQ3MTQ1MXww&ixlib=rb-4.1.0&q=80&w=1080"
          />
        )}

        {/* Shared Job Modal */}
        {sharedJobToken && (
          <Modal
            visible={showSharedJob}
            animationType="slide"
            transparent={false}
            onRequestClose={() => {
              setShowSharedJob(false);
              setSharedJobToken(null);
            }}
          >
            <SharedJobScreen
              shareToken={sharedJobToken}
              onClose={() => {
                setShowSharedJob(false);
                setSharedJobToken(null);
              }}
            />
          </Modal>
        )}
        {userType === "applicant" && (
          <Modal
            visible={showLikedJobs}
            animationType="slide"
            transparent={false}
            onRequestClose={() => setShowLikedJobs(false)}
          >
            <LikedJobsScreen
              userId={currentUser?.id}
              onClose={() => setShowLikedJobs(false)}
            />
          </Modal>
        )}
      </SafeAreaView>
      {/* </NavigationContainer> */}
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

const createTabBarStyles = (colors: ReturnType<typeof getColors>) => StyleSheet.create({
  tabBar: {
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: 6,
    paddingTop: 6,
    height: 60,
  },
});

const createAppStyles = (colors: ReturnType<typeof getColors>) => StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
