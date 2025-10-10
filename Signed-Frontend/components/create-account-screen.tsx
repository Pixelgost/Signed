import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { ChevronLeftIcon, EyeIcon, EyeOffIcon, FeatherIcon } from "./icons";
import {
  colors,
  spacing,
  fontSizes,
  fontWeights,
  borderRadius,
  shadows,
} from "../styles/colors";
import Constants from "expo-constants";
import * as DocumentPicker from "expo-document-picker";
import VerificationComponent from "./verification";

type UserType = "applicant" | "employer";
type Screen =
  | "basic-info"
  | "applicant-details"
  | "employer-details"
  | "two-factor-authentication";
const machineIp = Constants.expoConfig?.extra?.MACHINE_IP;

interface CreateAccountScreenProps {
  onAccountCreated: (userType: UserType) => void;
  onBackToLogin: () => void;
}

type PickedFile = {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
};

export const CreateAccountScreen = ({
  onAccountCreated,
  onBackToLogin,
}: CreateAccountScreenProps) => {
  const [currentScreen, setCurrentScreen] = useState<Screen>("basic-info");
  const [selectedUserType, setSelectedUserType] =
    useState<UserType>("applicant");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    // employer specific
    company: "",
    position: "",
    companySize: "",
    // applicant-specific
    major: "",
    school: "",
    resume: "",
    resumeFile: null as any, // null until picked
  });

  const updateFormData = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    const pwdRegex =
      /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*()_+{}\[\]:;<>,.?~\\-]).{8,}$/;
    return pwdRegex.test(password);
  };

  const handleNext = () => {
    // Basic validation
    if (
      !formData.firstName.trim() ||
      !formData.lastName.trim() ||
      !formData.email.trim() ||
      !formData.password.trim()
    ) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    if (!validateEmail(formData.email)) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    if (formData.password.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters long");
      return;
    }

    if (!validatePassword(formData.password)) {
      Alert.alert(
        "Error",
        "Password must include at least 1 uppercase, lowercase, digit, and special character"
      );
      return;
    }

    if (selectedUserType === "applicant") {
      setCurrentScreen("applicant-details");
    } else {
      setCurrentScreen("employer-details");
    }
  };

  const handleEmployerNext = async () => {
    try {
      const payload = {
        role: "employer",
        email: formData.email,
        password: formData.password,
        first_name: formData.firstName,
        last_name: formData.lastName,
        company_name: formData.company,
        job_title: formData.position,
        company_size: formData.companySize,
        // company_website: "" // optional if you want
      };

      const API_URL = `http://${machineIp}:8000/api/v1/users/auth/sign-up/`;

      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        onAccountCreated("employer");
        console.log("Employer account successfully created:", data);
      } else {
        Alert.alert(
          "Signup Failed",
          "An employer account with this email already exists"
        );
        console.log("Employer account failed to create:", data);
        setCurrentScreen("basic-info");
      }
    } catch (err) {
      console.error("Employer signup error:", err);
      Alert.alert("Error", "Could not connect to server");
    }
  };

  const handlePickResume = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file: PickedFile = {
          uri: result.assets[0].uri,
          name: result.assets[0].name ?? "resume.pdf",
          mimeType: result.assets[0].mimeType ?? "application/pdf",
          size: result.assets[0].size,
        };

        setFormData((prev) => ({ ...prev, resumeFile: file }));
      }
    } catch (err) {
      console.error("Resume picker error:", err);
      Alert.alert("Error", "Could not pick file");
    }
  };

  // applicant submit
  const handleApplicantNext = async () => {
    try {
      const payload = new FormData();

      payload.append("role", "applicant");
      payload.append("email", formData.email);
      payload.append("password", formData.password);
      payload.append("first_name", formData.firstName);
      payload.append("last_name", formData.lastName);
      payload.append("major", formData.major);
      payload.append("school", formData.school);

      if (formData.resumeFile) {
        payload.append("resume_file", {
          uri: formData.resumeFile.uri,
          name: formData.resumeFile.name || "resume.pdf",
          type: formData.resumeFile.mimeType || "application/pdf",
        } as any);
      } else if (formData.resume) {
        payload.append("resume", formData.resume);
      }

      const API_URL = `http://${machineIp}:8000/api/v1/users/auth/sign-up/`;
      const response = await fetch(API_URL, {
        method: "POST",
        body: payload,
        // ⚠️ don't set Content-Type manually!
      });

      const data = await response.json();

      if (response.ok) {
        onAccountCreated("applicant");
        console.log("Applicant account successfully created:", data);
      } else {
        Alert.alert(
          "Signup Failed",
          "An applicant account with this email already exists"
        );
        console.log("Applicant account failed to create:", data);
        setCurrentScreen("basic-info");
      }
    } catch (err) {
      console.error("Applicant signup error:", err);
      Alert.alert("Error", "Could not connect to server");
    }
  };

  const handleTwoFactor = () => {
    if (selectedUserType === "applicant") {
      if (!formData.major.trim() || !formData.school.trim()) {
        Alert.alert("Error", "Please fill in all required fields");
        return;
      }

      setCurrentScreen("two-factor-authentication");
    } else if (selectedUserType === "employer") {
      if (!formData.company.trim() || !formData.position.trim()) {
        Alert.alert("Error", "Please fill in all company details");
        return;
      }

      if (formData.companySize.trim() && isNaN(Number(formData.companySize))) {
        Alert.alert("Error", "Company size must be a number");
        return;
      }
      setCurrentScreen("two-factor-authentication");
    }
  };

  const UserTypeSelector = () => (
    <View style={styles.userTypeContainer}>
      <TouchableOpacity
        style={[
          styles.userTypeButton,
          selectedUserType === "applicant" && styles.userTypeButtonActive,
        ]}
        onPress={() => setSelectedUserType("applicant")}
      >
        <Text
          style={[
            styles.userTypeText,
            selectedUserType === "applicant" && styles.userTypeTextActive,
          ]}
        >
          Job Seeker
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.userTypeButton,
          selectedUserType === "employer" && styles.userTypeButtonActive,
        ]}
        onPress={() => setSelectedUserType("employer")}
      >
        <Text
          style={[
            styles.userTypeText,
            selectedUserType === "employer" && styles.userTypeTextActive,
          ]}
        >
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
          placeholder="First Name"
          value={formData.firstName}
          onChangeText={(value) => updateFormData("firstName", value)}
          autoCapitalize="words"
          placeholderTextColor={colors.mutedForeground}
        />
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Last Name"
          value={formData.lastName}
          onChangeText={(value) => updateFormData("lastName", value)}
          autoCapitalize="words"
          placeholderTextColor={colors.mutedForeground}
        />
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Email Address"
          value={formData.email}
          onChangeText={(value) => updateFormData("email", value)}
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
          onChangeText={(value) => updateFormData("password", value)}
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
          onChangeText={(value) => updateFormData("confirmPassword", value)}
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
        <Text style={styles.nextButtonText}>Next</Text>
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
          onChangeText={(value) => updateFormData("company", value)}
          placeholderTextColor={colors.mutedForeground}
        />
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Your Position"
          value={formData.position}
          onChangeText={(value) => updateFormData("position", value)}
          placeholderTextColor={colors.mutedForeground}
        />
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Company Size (optional)"
          value={formData.companySize}
          onChangeText={(value) => updateFormData("companySize", value)}
          placeholderTextColor={colors.mutedForeground}
        />
      </View>

      <TouchableOpacity style={styles.nextButton} onPress={handleTwoFactor}>
        <Text style={styles.nextButtonText}>Create Account</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderApplicantDetails = () => (
    <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>Education & Resume</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Major"
          value={formData.major}
          onChangeText={(value) => updateFormData("major", value)}
          placeholderTextColor={colors.mutedForeground}
        />
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Most Recent School"
          value={formData.school}
          onChangeText={(value) => updateFormData("school", value)}
          placeholderTextColor={colors.mutedForeground}
        />
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Resume (paste link or leave blank)"
          value={formData.resume}
          onChangeText={(value) => updateFormData("resume", value)}
          placeholderTextColor={colors.mutedForeground}
        />
      </View>

      <TouchableOpacity style={styles.nextButton} onPress={handlePickResume}>
        <Text style={styles.nextButtonText}>
          {formData.resumeFile
            ? `Selected: ${formData.resumeFile.name}`
            : "Upload Resume"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.nextButton} onPress={handleTwoFactor}>
        <Text style={styles.nextButtonText}>Create Account</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const getScreenTitle = () => {
    switch (currentScreen) {
      case "basic-info":
        return "Create Account";
      case "applicant-details":
        return "Details";
      case "employer-details":
        return "Company Details";
      case "two-factor-authentication":
        return "Two Factor Authentication";
      default:
        return "Create Account";
    }
  };

  const canGoBack = currentScreen !== "basic-info";

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.header}>
        <View style={styles.headerTop}>
          {canGoBack ? (
            <TouchableOpacity onPress={() => setCurrentScreen("basic-info")}>
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

      {currentScreen === "basic-info" && renderBasicInfo()}
      {currentScreen === "employer-details" && renderEmployerDetails()}
      {currentScreen === "applicant-details" && renderApplicantDetails()}
      {currentScreen === "two-factor-authentication" && (
        <VerificationComponent
          email={formData.email}
          onVerificationSuccess={() => {
            if (selectedUserType === "applicant") {
              handleApplicantNext();
            } else if (selectedUserType === "employer") {
              handleEmployerNext();
            }
          }}
        />
      )}
    </KeyboardAvoidingView>
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoText: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colors.primary,
    marginLeft: spacing.xs,
  },
  title: {
    fontSize: fontSizes["2xl"],
    fontWeight: fontWeights.bold,
    color: colors.foreground,
    textAlign: "center",
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
    flexDirection: "row",
    backgroundColor: colors.muted,
    borderRadius: borderRadius.lg,
    padding: 4,
    marginBottom: spacing.lg,
  },
  userTypeButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: "center",
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
  passwordInput: {
    paddingRight: 50,
  },
  eyeButton: {
    position: "absolute",
    right: spacing.md,
    top: spacing.md,
    padding: 4,
  },
  nextButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.md,
    ...shadows.md,
  },
  nextButtonText: {
    color: colors.primaryForeground,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
  },
});
