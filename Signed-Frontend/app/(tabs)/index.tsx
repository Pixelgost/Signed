import { Image } from "expo-image";
import { Button, Platform, StyleSheet } from "react-native";

import { HelloWave } from "@/components/hello-wave";
import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Link, useRouter } from "expo-router";

import axios, { AxiosError } from "axios";
import Constants from "expo-constants";

export default function HomeScreen() {
  const machineIp = Constants.expoConfig?.extra?.MACHINE_IP;

  const router = useRouter();

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