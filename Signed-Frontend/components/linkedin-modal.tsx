import { useEffect, useState } from "react";
import {
    Alert,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    ActivityIndicator,
} from "react-native";
import {
    borderRadius,
    colors,
    fontSizes,
    fontWeights,
    shadows,
    spacing,
} from "../styles/colors";

import axios, { AxiosError } from "axios";
import Constants from "expo-constants";


const machineIp = Constants.expoConfig?.extra?.MACHINE_IP;

interface LinkedInModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (profile: any) => void;
}

export default function LinkedInModal({
  visible,
  onClose,
  onSuccess,
}: LinkedInModalProps) {

  const [linkedInUser, setLinkedInUser] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleClose = () => {
    setLinkedInUser("");
    onClose();
  };

  const handleSubmit = async () => {
    if (linkedInUser.length === 0) {
        alert("Please enter your LinkedIn username")
        return;
    }

    setIsLoading(true);

    const API_ENDPOINT = `http://${machineIp}:8000/api/v1/users/autofill-from-linkedin/`;
    return axios
    .get(API_ENDPOINT, {
      params: {
        user: linkedInUser.toLowerCase()
      },
    })
    .then((response: { data: any }) => {
      const profile = response.data.profile;
      setIsLoading(false);
      setLinkedInUser("");
      onSuccess(profile);
    })
    .catch((error: AxiosError) => {
      setIsLoading(false);
      alert("LinkedIn Profile not found")
    });

  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.title}>Import Profile With LinkedIn</Text>
          <Text style={styles.subtitle}>
            Enter your LinkedIn username:
          </Text>
          
          <TextInput
            style={[
              styles.input
            ]}
            placeholder="LinkedIn Username"
            placeholderTextColor={colors.mutedForeground}
            value={linkedInUser}
            onChangeText={setLinkedInUser}
          />

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.verifyButton]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                    <Text style={styles.verifyButtonText}>Submit</Text>
                )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: "85%",
    maxWidth: 400,
    ...shadows.lg,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colors.foreground,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  subtitle: {
    fontSize: fontSizes.base,
    color: colors.mutedForeground,
    marginBottom: spacing.lg,
    textAlign: "center",
  },
  challengeContainer: {
    backgroundColor: colors.muted,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    alignItems: "center",
  },
  challengeText: {
    fontSize: fontSizes["2xl"],
    fontWeight: fontWeights.bold,
    color: colors.foreground,
  },
  input: {
    backgroundColor: colors.inputBackground,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSizes.lg,
    color: colors.foreground,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  inputError: {
    borderColor: "#ef4444",
    borderWidth: 2,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  button: {
    flex: 1,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: colors.muted,
  },
  cancelButtonText: {
    color: colors.foreground,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
  },
  verifyButton: {
    backgroundColor: colors.primary,
  },
  verifyButtonText: {
    color: colors.primaryForeground,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
  },
  refreshButton: {
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  refreshButtonText: {
    color: colors.primary,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
  },
});

