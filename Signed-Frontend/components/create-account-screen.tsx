import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { ChevronLeftIcon, EyeIcon, EyeOffIcon, FeatherIcon } from './icons';
import { PersonalityQuiz } from './personality-quiz';
import { colors, spacing, fontSizes, fontWeights, borderRadius, shadows } from '../styles/colors';

type UserType = 'applicant' | 'employer';
type Screen = 'basic-info' | 'personality-quiz' | 'employer-details';

interface CreateAccountScreenProps {
  onAccountCreated: (userType: UserType) => void;
  onBackToLogin: () => void;
}

export const CreateAccountScreen = ({ onAccountCreated, onBackToLogin }: CreateAccountScreenProps) => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('basic-info');
  const [selectedUserType, setSelectedUserType] = useState<UserType>('applicant');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    company: '',
    position: '',
    companySize: '',
  });

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    // Basic validation
    if (!formData.name.trim() || !formData.email.trim() || !formData.password.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!formData.email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    if (selectedUserType === 'applicant') {
      setCurrentScreen('personality-quiz');
    } else {
      setCurrentScreen('employer-details');
    }
  };

  const handleEmployerNext = () => {
    if (!formData.company.trim() || !formData.position.trim()) {
      Alert.alert('Error', 'Please fill in all company details');
      return;
    }
    onAccountCreated(selectedUserType);
  };

  const handleQuizComplete = () => {
    onAccountCreated(selectedUserType);
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

  const renderBasicInfo = () => (
    <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
      <UserTypeSelector />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Full Name"
          value={formData.name}
          onChangeText={(value) => updateFormData('name', value)}
          autoCapitalize="words"
          placeholderTextColor={colors.mutedForeground}
        />
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Email Address"
          value={formData.email}
          onChangeText={(value) => updateFormData('email', value)}
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
          value={formData.password}
          onChangeText={(value) => updateFormData('password', value)}
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

      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, styles.passwordInput]}
          placeholder="Confirm Password"
          value={formData.confirmPassword}
          onChangeText={(value) => updateFormData('confirmPassword', value)}
          secureTextEntry={!showConfirmPassword}
          autoCapitalize="none"
          autoCorrect={false}
          placeholderTextColor={colors.mutedForeground}
        />
        <TouchableOpacity
          style={styles.eyeButton}
          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
        >
          {showConfirmPassword ? (
            <EyeOffIcon size={20} color={colors.mutedForeground} />
          ) : (
            <EyeIcon size={20} color={colors.mutedForeground} />
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
        <Text style={styles.nextButtonText}>
          {selectedUserType === 'applicant' ? 'Continue to Quiz' : 'Next'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderEmployerDetails = () => (
    <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>Company Information</Text>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Company Name"
          value={formData.company}
          onChangeText={(value) => updateFormData('company', value)}
          placeholderTextColor={colors.mutedForeground}
        />
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Your Position"
          value={formData.position}
          onChangeText={(value) => updateFormData('position', value)}
          placeholderTextColor={colors.mutedForeground}
        />
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Company Size (optional)"
          value={formData.companySize}
          onChangeText={(value) => updateFormData('companySize', value)}
          placeholderTextColor={colors.mutedForeground}
        />
      </View>

      <TouchableOpacity style={styles.nextButton} onPress={handleEmployerNext}>
        <Text style={styles.nextButtonText}>Create Account</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const getScreenTitle = () => {
    switch (currentScreen) {
      case 'basic-info':
        return 'Create Account';
      case 'personality-quiz':
        return 'Tell Us About You';
      case 'employer-details':
        return 'Company Details';
      default:
        return 'Create Account';
    }
  };

  const canGoBack = currentScreen !== 'basic-info';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          {canGoBack ? (
            <TouchableOpacity onPress={() => setCurrentScreen('basic-info')}>
              <ChevronLeftIcon size={24} color={colors.foreground} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={onBackToLogin}>
              <ChevronLeftIcon size={24} color={colors.foreground} />
            </TouchableOpacity>
          )}
          <View style={styles.logoContainer}>
            <FeatherIcon size={24} color={colors.primary} />
            <Text style={styles.logoText}>Signed</Text>
          </View>
          <View style={{ width: 24 }} />
        </View>
        <Text style={styles.title}>{getScreenTitle()}</Text>
      </View>

      {currentScreen === 'basic-info' && renderBasicInfo()}
      {currentScreen === 'employer-details' && renderEmployerDetails()}
      {currentScreen === 'personality-quiz' && (
        <PersonalityQuiz onComplete={handleQuizComplete} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colors.primary,
    marginLeft: spacing.xs,
  },
  title: {
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.bold,
    color: colors.foreground,
    textAlign: 'center',
  },
  form: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    color: colors.foreground,
    marginBottom: spacing.md,
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
  nextButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
    ...shadows.md,
  },
  nextButtonText: {
    color: colors.primaryForeground,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
  },
});