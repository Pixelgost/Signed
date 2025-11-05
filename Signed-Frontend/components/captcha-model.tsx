import { useEffect, useState } from "react";
import {
    Alert,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import {
    borderRadius,
    colors,
    fontSizes,
    fontWeights,
    shadows,
    spacing,
} from "../styles/colors";

interface CaptchaModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CaptchaModal({
  visible,
  onClose,
  onSuccess,
}: CaptchaModalProps) {
  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [isIncorrect, setIsIncorrect] = useState(false);

  const generateNewChallenge = () => {
    // Generate two random numbers between 1 and 20
    const newNum1 = Math.floor(Math.random() * 20) + 1;
    const newNum2 = Math.floor(Math.random() * 20) + 1;
    setNum1(newNum1);
    setNum2(newNum2);
    setUserAnswer("");
    setIsIncorrect(false);
  };

  useEffect(() => {
    if (visible) {
      generateNewChallenge();
    }
  }, [visible]);

  const correctAnswer = num1 + num2;

  const handleVerify = () => {
    const answer = parseInt(userAnswer.trim(), 10);

    if (isNaN(answer)) {
      Alert.alert("Error", "Please enter a valid number");
      return;
    }

    if (answer === correctAnswer) {
      setIsIncorrect(false);
      onSuccess();
    } else {
      setIsIncorrect(true);
      setUserAnswer("");
      Alert.alert("Incorrect", "Please try again with a new challenge.");
      generateNewChallenge();
    }
  };

  const handleClose = () => {
    setUserAnswer("");
    setIsIncorrect(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.title}>Security Verification</Text>
          <Text style={styles.subtitle}>
            Please solve the following math problem to verify you're human:
          </Text>

          <View style={styles.challengeContainer}>
            <Text style={styles.challengeText}>
              {num1} + {num2} = ?
            </Text>
          </View>

          <TextInput
            style={[
              styles.input,
              isIncorrect && styles.inputError,
            ]}
            placeholder="Enter your answer"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="numeric"
            value={userAnswer}
            onChangeText={setUserAnswer}
            autoFocus
          />

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.verifyButton]}
              onPress={handleVerify}
            >
              <Text style={styles.verifyButtonText}>Verify</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.refreshButton}
            onPress={generateNewChallenge}
          >
            <Text style={styles.refreshButtonText}>Get New Challenge</Text>
          </TouchableOpacity>
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

