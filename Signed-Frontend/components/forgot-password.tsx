import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Keyboard,
} from "react-native";
import { ChevronLeftIcon, EyeIcon, EyeOffIcon, FeatherIcon } from './icons';
import axios, { AxiosError } from "axios";
import Icon from "react-native-vector-icons/MaterialIcons";
import Constants from "expo-constants";

import {
  colors,
  spacing,
  fontSizes,
  fontWeights,
  borderRadius,
  shadows,
} from "../styles/colors";

interface ForgotPasswordProps {
  onNextScreen: (arg0: string) => void;
  onPreviousScreen: () => void;
  contact: string;
}

const machineIp = Constants.expoConfig?.extra?.MACHINE_IP as string;

// ---------------------- VERIFY EMAIL SCREEN ----------------------
export const VerifyEmailScreen: React.FC<ForgotPasswordProps> = ({
  onPreviousScreen,
  onNextScreen,
}) => {
  const [email, setEmail] = useState<string>("");
  const [isLoading, setLoading] = useState<boolean>(false);

  const sendEmail = async () => {
    if (isLoading) return;

    if (!email.trim()) {
      Alert.alert("Error!", "Please enter your email address");
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get<{ exists: boolean }>(
        `http://${machineIp}:8000/api/v1/users/check-email-exists/?email=${email}`
      );

      if (response.data.exists) {
        await axios.post(`http://${machineIp}:8000/api/v1/users/send-verification-email/`, {
          email,
        });
        onNextScreen(email);
      } else {
        Alert.alert("Error", "Email doesn't exist!");
      }
    } catch (error) {
      const err = error as AxiosError;
      console.error("Error details:", err);
      Alert.alert("Error", `Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backArrow}
        onPress={onPreviousScreen}
        activeOpacity={0.7}
      >
        <Icon name="arrow-back" size={30} color={colors.primary} />
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={[styles.logoText, styles.logoTextBold, { marginBottom: spacing.md }]}>
          Forgot your Password?
        </Text>
        <Text style={styles.subtitle}>Verify Your Email Below</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Email Address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholderTextColor={colors.mutedForeground}
          />
        </View>
        <TouchableOpacity style={styles.actionButton} onPress={sendEmail}>
          <Text style={styles.actionButtonText}>Send Verification Code</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ---------------------- ENTER VERIFICATION CODE SCREEN ----------------------
export const EnterVerificationCodeScreen: React.FC<ForgotPasswordProps> = ({
  onNextScreen,
  onPreviousScreen,
  contact,
}) => {
  const [code, setCode] = useState<string>("");
  const [isLoading, setLoading] = useState<boolean>(false);

  const handleVerifyCode = async () => {
    if (code.length !== 6) {
      Alert.alert("Error", "Enter a 6-digit code");
      return;
    }

    try {
      await axios.post(`http://${machineIp}:8000/api/v1/users/verify-code/`, {
        user: contact,
        code,
      });
      onNextScreen(contact);
    } catch (error) {
      console.error("Error verifying code:", (error as AxiosError).response?.data);
      Alert.alert("Error", "Code is incorrect or has expired");
    } finally {
      Keyboard.dismiss();
    }
  };

  const resendCode = async () => {
    if (isLoading) return;

    if (!contact.trim()) {
      Alert.alert("Error", "Could not resend code, please start over");
      return;
    }

    try {
      setLoading(true);
      await axios.post(`http://${machineIp}:8000/api/v1/users/send-verification-email/`, {
        email: contact,
      });
      Alert.alert("Success", "Sent verification code!");
    } catch (error) {
      const err = error as AxiosError;
      console.error("Error details:", err);
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backArrow}
        onPress={onPreviousScreen}
        activeOpacity={0.7}
      >
        <Icon name="arrow-back" size={30} color={colors.primary} />
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={[styles.logoText, styles.logoTextBold, { marginBottom: spacing.md }]}>
          Forgot your Password?
        </Text>
        <Text style={styles.subtitle}>Enter Your Verification Code Below</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Verification Code"
            value={code}
            onChangeText={setCode}
            autoCapitalize="none"
            autoCorrect={false}
            placeholderTextColor={colors.mutedForeground}
            keyboardType="number-pad"
          />
        </View>

        <TouchableOpacity onPress={resendCode}>
          <Text style={styles.subtitle}>Resend Code</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleVerifyCode}>
          <Text style={styles.actionButtonText}>Verify</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ---------------------- PASSWORD RESET SCREEN ----------------------
export const PasswordResetScreen: React.FC<ForgotPasswordProps> = ({
  onPreviousScreen,
  onNextScreen,
  contact
}) => {
  const [newPassword, setNewPassword] = useState<string>("");
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validatePassword = (password: string): boolean => {
    const pwdRegex =
      /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*()_+{}\[\]:;<>,.?~\\-]).{8,}$/;
    return pwdRegex.test(password);
  };

  const checkPassword = async() => {
    if (!validatePassword(newPassword)) {
      Alert.alert(
        "Error",
        "Password must include at least 1 uppercase, lowercase, digit, special character, and be at least 8 characters long."
      );
      return;
    }

    if (newPassword !== newPasswordConfirmation) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }
    try{
        await axios.get(`http://${machineIp}:8000/api/v1/users/change-password/?email=${contact}&new_password=${newPassword}`
        );
        onNextScreen("NULL")
    } catch (error) {
        Alert.alert("Error", "Could not reset password, please try again!")
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backArrow}
        onPress={onPreviousScreen}
        activeOpacity={0.7}
      >
        <Icon name="arrow-back" size={30} color={colors.primary} />
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={[styles.logoText, styles.logoTextBold, { marginBottom: spacing.md }]}>
          Forgot your Password?
        </Text>
        <Text style={styles.subtitle}>Enter Your New Password Below</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter New Password"
            value={newPassword}
            onChangeText={setNewPassword}
            autoCapitalize="none"
            autoCorrect={false}
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry={!showPassword}
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
            style={styles.input}
            placeholder="Confirm New Password"
            value={newPasswordConfirmation}
            secureTextEntry={!showConfirmPassword}
            onChangeText={setNewPasswordConfirmation}
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

        <TouchableOpacity style={styles.actionButton} onPress={checkPassword}>
          <Text style={styles.actionButtonText}>Set New Password</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ---------------------- STYLES ----------------------
const styles = StyleSheet.create({
  logoText: {
    fontSize: fontSizes["4xl"],
    color: colors.primary,
    textAlign: "center",
  },
  container: {
    paddingTop: spacing.xl,
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
  },
  header: {
    alignItems: "center",
    marginBottom: spacing["3xl"],
    width: "100%",
  },
  logoTextBold: {
    fontWeight: fontWeights.bold,
  },
  subtitle: {
    fontSize: fontSizes.lg,
    color: colors.mutedForeground,
    textAlign: "center",
  },
  inputContainer: {
    marginBottom: spacing.md,
    position: "relative",
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
  form: {
    marginBottom: spacing.xl,
  },
  backArrow: {
    position: "absolute",
    paddingLeft: spacing.lg,
    paddingTop: spacing.lg,
  },
  actionButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.md,
    ...shadows.md,
  },
  actionButtonText: {
    color: colors.primaryForeground,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
  },
  eyeButton: {
    position: 'absolute',
    right: spacing.md,
    top: spacing.md,
    padding: 4,
  },
});
