import { ThemedText } from "@/components/themed-text";
import { Fonts } from "@/constants/theme";
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";

export default function VerificationComponent() {
  const [method, setMethod] = useState<string>("email");
  const [contact, setContact] = useState<string>("");
  const [codeSent, setCodeSent] = useState<boolean>(false);
  const [code, setCode] = useState<string>("");

  const [contactLabel, setContactLabel] = useState<string>("");

  // Clear inputs and dismiss keyboard when switching method
  const handleSelectMethod = (newMethod: string) => {
    if (newMethod !== method) {
      setContact("");
      setCode("");
      setCodeSent(false);
      Keyboard.dismiss();
      setMethod(newMethod);
    }
  };

  const handleSendCode = () => {
    if (!contact) return alert(`Please enter your ${method}`);
    console.log(`Sending code to ${method}: ${contact}`);
    setContactLabel(contact);
    setCodeSent(true);
    Keyboard.dismiss();
  };

  const handleVerifyCode = () => {
    if (code.length !== 6) return alert("Enter a 6-digit code");
    console.log(`Verifying code: ${code}`);
    Keyboard.dismiss();
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Two Factor Authentication
          </ThemedText>
        </View>
        <Text style={styles.text}>
          To proceed, you must first verify your identity. Choose a method of
          verification.
        </Text>

        <View style={styles.radioColumn}>
          <TouchableOpacity
            style={styles.radioOption}
            onPress={() => handleSelectMethod("email")}
          >
            <View
              style={[
                styles.radioCircle,
                method === "email" && styles.selectedCircle,
              ]}
            />
            <Text style={styles.radioLabel}>Email</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.radioOption}
            onPress={() => handleSelectMethod("phone")}
          >
            <View
              style={[
                styles.radioCircle,
                method === "phone" && styles.selectedCircle,
              ]}
            />
            <Text style={styles.radioLabel}>Phone</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.subtitle}>
          Enter your {method === "email" ? "Email Address" : "Phone Number"}:
        </Text>
        <TextInput
          style={styles.input}
          placeholder={method === "email" ? "Email Address" : "Phone Number"}
          placeholderTextColor="#ccc"
          keyboardType={method === "phone" ? "phone-pad" : "email-address"}
          value={contact}
          onChangeText={setContact}
          returnKeyType="done"
          onSubmitEditing={Keyboard.dismiss}
          autoCapitalize="none"
        />
        {!codeSent && (
          <TouchableOpacity style={styles.sendButton} onPress={handleSendCode}>
            <Text style={styles.buttonText}>Send Code</Text>
          </TouchableOpacity>
        )}

        {codeSent && (
          <>
            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleSendCode}
            >
              <Text style={styles.buttonText}>Resend Code</Text>
            </TouchableOpacity>
            <Text style={styles.subtitle}>
              Enter the code sent to {contactLabel}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="123456"
              placeholderTextColor="#ccc"
              keyboardType="numeric"
              maxLength={6}
              value={code}
              onChangeText={setCode}
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
            />
            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleVerifyCode}
            >
              <Text style={styles.buttonText}>Verify</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flex: 1,
  },
  header: {
    alignItems: "center",
    paddingVertical: 20,
  },
  title: {
    fontFamily: Fonts.rounded,
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
  },
  subtitle: {
    fontFamily: Fonts.rounded,
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    paddingBottom: 12,
  },
  text: {
    fontFamily: Fonts.rounded,
    color: "#fff",
    fontSize: 16,
    paddingBottom: 16,
  },
  radioColumn: {
    flexDirection: "column",
  },
  radioOption: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  radioCircle: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#007bff",
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedCircle: {
    backgroundColor: "#007bff",
  },
  radioLabel: {
    fontSize: 16,
    color: "white",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
    fontSize: 16,
    color: "white",
  },
  sendButton: {
    backgroundColor: "#28a745",
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 5,
    marginVertical: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
  },
});
