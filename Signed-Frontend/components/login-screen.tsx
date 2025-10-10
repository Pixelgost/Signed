import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { EyeIcon, EyeOffIcon, FeatherIcon } from './icons';
import { colors, spacing, fontSizes, fontWeights, borderRadius, shadows } from '../styles/colors';
import Constants from "expo-constants";
import AsyncStorage from '@react-native-async-storage/async-storage';

type UserType = 'applicant' | 'employer';
const machineIp = Constants.expoConfig?.extra?.MACHINE_IP;

interface LoginScreenProps {
  onLogin: (userType: UserType, userData: any) => void;
  onCreateAccount: () => void;
  onForgotPassword: () => void;
}

export const LoginScreen = ({ onLogin, onCreateAccount, onForgotPassword }: LoginScreenProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedUserType, setSelectedUserType] = useState<UserType>('applicant');

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    // Simple validation
    if (!email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    try {
      const API_URL = `http://${machineIp}:8000/api/v1/users/auth/sign-in/`;
  
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
  
      const data = await response.json();
  
      if (response.ok) {
        const userData = data.data.user_data;
        const token = data.data.firebase_access_token;
        console.log("Token:", token);

        // Store token and userData
        await AsyncStorage.setItem('userToken', token);
        await AsyncStorage.setItem('userData', JSON.stringify(userData));

        // print data
        console.log("Logged in:", data);
        onLogin(selectedUserType, userData);
      } else {
        Alert.alert('Login Failed', data.message || 'Invalid credentials');
      }
    } catch (err) {
      console.error('Login error:', err);
      Alert.alert('Error', 'Could not connect to server');
    }
  };

  const UserTypeSelector = () => (
    <View style={styles.userTypeContainer}>
      <TouchableOpacity
        style={[
          styles.userTypeButton,
          selectedUserType === 'applicant' && styles.userTypeButtonActive
        ]}
        onPress={() => setSelectedUserType('applicant')}
      >
        <Text style={[
          styles.userTypeText,
          selectedUserType === 'applicant' && styles.userTypeTextActive
        ]}>
          Job Seeker
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.userTypeButton,
          selectedUserType === 'employer' && styles.userTypeButtonActive
        ]}
        onPress={() => setSelectedUserType('employer')}
      >
        <Text style={[
          styles.userTypeText,
          selectedUserType === 'employer' && styles.userTypeTextActive
        ]}>
          Employer
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <FeatherIcon size={48} color={colors.primary} />
          <Text style={styles.logoText}>Signed</Text>
        </View>
        <Text style={styles.subtitle}>Find your perfect job match</Text>
      </View>

      <View style={styles.form}>
        <UserTypeSelector />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Email address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholderTextColor={colors.mutedForeground}
          />
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, styles.passwordInput]}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            placeholderTextColor={colors.mutedForeground}
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOffIcon size={20} color={colors.mutedForeground} />
            ) : (
              <EyeIcon size={20} color={colors.mutedForeground} />
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginButtonText}>Sign In</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.forgotPassword} onPress={onForgotPassword}>
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Don't have an account? </Text>
        <TouchableOpacity onPress={onCreateAccount}>
          <Text style={styles.signUpText}>Sign Up</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing['3xl'],
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  logoText: {
    fontSize: fontSizes['4xl'],
    fontWeight: fontWeights.bold,
    color: colors.primary,
    marginLeft: spacing.sm,
  },
  subtitle: {
    fontSize: fontSizes.lg,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  form: {
    marginBottom: spacing.xl,
  },
  userTypeContainer: {
    flexDirection: 'row',
    backgroundColor: colors.muted,
    borderRadius: borderRadius.lg,
    padding: 4,
    marginBottom: spacing.lg,
  },
  userTypeButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  userTypeButtonActive: {
    backgroundColor: colors.background,
    ...shadows.sm,
  },
  userTypeText: {
    fontSize: fontSizes.base,
    color: colors.mutedForeground,
    fontWeight: fontWeights.medium,
  },
  userTypeTextActive: {
    color: colors.foreground,
  },
  inputContainer: {
    marginBottom: spacing.md,
    position: 'relative',
  },
  input: {
    backgroundColor: colors.inputBackground,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSizes.base,
    color: colors.foreground,
    borderWidth: 1,
    borderColor: colors.border,
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeButton: {
    position: 'absolute',
    right: spacing.md,
    top: spacing.md,
    padding: 4,
  },
  loginButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
    ...shadows.md,
  },
  loginButtonText: {
    color: colors.primaryForeground,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  forgotPasswordText: {
    color: colors.primary,
    fontSize: fontSizes.base,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: fontSizes.base,
    color: colors.mutedForeground,
  },
  signUpText: {
    fontSize: fontSizes.base,
    color: colors.primary,
    fontWeight: fontWeights.semibold,
  },
});
