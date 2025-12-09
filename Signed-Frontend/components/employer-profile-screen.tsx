import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  Platform,
  Alert,
  Switch,
  ImageSourcePropType,
  ImageStyle,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { colors, spacing, fontSizes, fontWeights, borderRadius } from "../styles/colors";
import profilePicture from "../assets/images/profile-picture.png";

export const EmployerProfileScreen = ({ currentUser: passedCurrentUser }: { currentUser?: any }) => {
  const [currentUser, setCurrentUser] = useState<any>(passedCurrentUser || null);
  const [avatarSrc, setAvatarSrc] = useState<ImageSourcePropType>(profilePicture);
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);
  const imageSource: ImageSourcePropType = typeof avatarSrc === "string" ? { uri: avatarSrc } : avatarSrc;

  const [companyName, setCompanyName] = useState<string>("");
  const [website, setWebsite] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [companySize, setCompanySize] = useState<string>("");
  const [bio, setBio] = useState<string>("");
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [jobTitle, setJobTitle] = useState<string>("");

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [loadingSave, setLoadingSave] = useState<boolean>(false);
  const [showSuccess, setShowSuccess] = useState<boolean>(false);

  // Computed notification preference from currentUser
  const notificationsEnabled = currentUser?.employer_profile?.notifications_enabled ?? true;

  const machineIp = Constants.expoConfig?.extra?.MACHINE_IP;
  const BASE_URL = `http://${machineIp}:8000`;
  const scrollRef = useRef<ScrollView | null>(null);

  // --- Fetch current user ---
  const fetchCurrentUser = async () => {
    const token = await AsyncStorage.getItem("userToken");
    if (!token) return;

    try {
      const response = await axios.get(`${BASE_URL}/api/v1/users/auth/me/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const userData = response.data;
      setCurrentUser(userData);

      setFirstName(userData.first_name || "");
      setLastName(userData.last_name || "");
      setCompanyName(userData.employer_profile?.company?.name || "");
      setWebsite(userData.employer_profile?.company?.website || "");
      setLocation(userData.employer_profile?.location || "");
      setCompanySize(userData.employer_profile?.company?.size || "");
      setBio(userData.employer_profile?.bio || "");
      setJobTitle(userData.employer_profile?.job_title || "");

      // let logo = userData.employer_profile?.profile_image || avatarUri;
      // if (logo && !logo.startsWith("http")) logo = `${BASE_URL}${logo}`;
      // setAvatarUri(logo);
      const logo = userData.employer_profile?.profile_image as string | undefined;
      if (typeof logo === "string" && logo.length > 0) {
        const absolute = logo.startsWith("http") ? logo : `${BASE_URL}${logo}`;
        setAvatarSrc({ uri: absolute }); // string URL
      } else {
        setAvatarSrc(profilePicture);
      }
      setLocalAvatarUri(null);
    } catch (err) {
      console.error("Failed to fetch current user:", err);
    }
  };

  useEffect(() => {
    (async () => {
      // Fetch user data from server
      fetchCurrentUser();

      // Request permissions
      if (Platform.OS !== "web") {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission needed", "We need photo access to change your logo.");
        }
      }
    })();
  }, []);

  // --- Image picker ---
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!result.canceled) {
        const uri = result.assets[0].uri;
        setAvatarSrc({ uri });
        setLocalAvatarUri(uri);
        await uploadPhoto(uri);
      }
    } catch (err) {
      console.error("Image pick error:", err);
    }
  };

  const uploadPhoto = async (uri: string) => {
    const token = await AsyncStorage.getItem("userToken");
    if (!token) return;

    try {
      const formData = new FormData();
      const filename = uri.split("/").pop() || "logo.jpg";
      const ext = filename.split(".").pop() || "jpg";
      // @ts-ignore
      formData.append("profile_image", { uri, name: filename, type: `image/${ext}` });

      const response = await axios.put(`${BASE_URL}/api/v1/users/update-profile/`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data) {
        Alert.alert("Logo updated", "Profile logo updated successfully.");
        await fetchCurrentUser();
      }
    } catch (err) {
      console.error("Upload failed:", err);
      Alert.alert("Error", "Failed to upload logo.");
    }
  };

  const updateNotificationPreference = async (enabled: boolean) => {
    const token = await AsyncStorage.getItem("userToken");
    if (!token) return;

    // Optimistically update currentUser to immediately reflect UI change
    setCurrentUser((prev: any) => ({
      ...prev,
      employer_profile: {
        ...prev.employer_profile,
        notifications_enabled: enabled,
      },
    }));

    try {
      await axios.put(
        `${BASE_URL}/api/v1/users/notifications-preference/`,
        { notifications_enabled: enabled },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      // Fetch updated user data to confirm the change
      await fetchCurrentUser();
    } catch (err) {
      console.error("Failed to update notification preference:", err);
      Alert.alert("Error", "Failed to update notification preference.");
      // Fetch again to revert to actual server state on error
      await fetchCurrentUser();
    }
  };

  // --- Save handler ---
  const saveProfile = async () => {
    setLoadingSave(true);
    const token = await AsyncStorage.getItem("userToken");
    if (!token) return;

    try {
      const formData = new FormData();
      formData.append("first_name", firstName);
      formData.append("last_name", lastName);
      formData.append("company_name", companyName);
      formData.append("company_website", website);
      formData.append("job_title", jobTitle);
      formData.append("location", location);
      formData.append("company_size", companySize);
      formData.append("bio", bio);

      if (
        localAvatarUri &&
        (localAvatarUri.startsWith("file://") ||
          localAvatarUri.startsWith("content://") ||
          localAvatarUri.startsWith("/"))
      ) {
        const filename = localAvatarUri.split("/").pop() || "logo.jpg";
        const ext = filename.split(".").pop() || "jpg";
        // @ts-ignore
        formData.append("profile_image", { uri: localAvatarUri, name: filename, type: `image/${ext}` });
      }

      await axios.put(`${BASE_URL}/api/v1/users/update-profile/`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 1800);
      Alert.alert("Saved", "Profile updated successfully.");
      await fetchCurrentUser();
      setIsEditing(false);
    } catch (err) {
      console.error("Save failed:", err.response?.data || err);
      Alert.alert("Error", "Failed to save employer profile.");
    } finally {
      setLoadingSave(false);
    }
  };

  const displayName =
    currentUser ? `${currentUser.first_name || ""} ${currentUser.last_name || ""}`.trim() : "Employer";

  return (
    <View style={styles.container}>
      <KeyboardAwareScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        enableOnAndroid
        extraScrollHeight={80}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: spacing.xl }}
      >
        {/* Header */}
        <View style={styles.profileHeader}>
          <TouchableOpacity onPress={pickImage}>
            <Image source={imageSource} style={styles.avatar as ImageStyle} />
          </TouchableOpacity>
          <Text style={styles.changePhotoText}>Tap to change logo</Text>

          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.title}>{companyName || "Company"}</Text>
          <Text style={styles.title}>{jobTitle || ""}</Text>

          <View style={styles.headerButtons}>
            <TouchableOpacity style={styles.editButton} onPress={() => setIsEditing(true)}>
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Company Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.bio}>{bio || "No company bio yet."}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Website</Text>
          <Text style={styles.linkText}>{website || "—"}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          <Text style={styles.fieldText}>{location || "—"}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Company Size</Text>
          <Text style={styles.fieldText}>{companySize || "—"}</Text>
        </View>

        {/* Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.rowBetween}>
            <Text style={styles.fieldLabel}>Push notifications</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={updateNotificationPreference}
            />
          </View>
        </View>
      </KeyboardAwareScrollView>

      {/* Editing Modal */}
      <Modal visible={isEditing} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <KeyboardAwareScrollView
              showsVerticalScrollIndicator={false}
              enableOnAndroid
              extraScrollHeight={120}
              keyboardShouldPersistTaps="handled"
            >
              <TouchableOpacity onPress={pickImage} style={{ alignSelf: "center", marginBottom: spacing.md }}>
                <Image source={imageSource} style={styles.modalAvatar as ImageStyle} />
                <Text style={styles.changePhotoTextSmall}>Change logo</Text>
              </TouchableOpacity>

              <Text style={styles.modalSectionTitle}>Personal</Text>
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                placeholder="First name"
                placeholderTextColor={colors.mutedForeground}
                style={styles.input}
              />
              <TextInput
                value={lastName}
                onChangeText={setLastName}
                placeholder="Last name"
                placeholderTextColor={colors.mutedForeground}
                style={styles.input}
              />

              <Text style={styles.modalSectionTitle}>Company</Text>
              <TextInput
                value={companyName}
                onChangeText={setCompanyName}
                placeholder="Company name"
                placeholderTextColor={colors.mutedForeground}
                style={styles.input}
              />
              <TextInput
                value={jobTitle}
                onChangeText={setJobTitle}
                placeholder="Job title"
                placeholderTextColor={colors.mutedForeground}
                style={styles.input}
              />
              <TextInput
                value={website}
                onChangeText={setWebsite}
                placeholder="Website"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="url"
                style={styles.input}
              />
              <TextInput
                value={location}
                onChangeText={setLocation}
                placeholder="Location"
                placeholderTextColor={colors.mutedForeground}
                style={styles.input}
              />
              <TextInput
                value={companySize}
                onChangeText={setCompanySize}
                placeholder="Company Size"
                placeholderTextColor={colors.mutedForeground}
                style={styles.input}
              />

              <Text style={styles.modalSectionTitle}>Bio</Text>
              <TextInput
                value={bio}
                onChangeText={setBio}
                placeholder="Company bio"
                placeholderTextColor={colors.mutedForeground}
                multiline
                style={[styles.input, styles.bioInput]}
              />

              <TouchableOpacity style={[styles.saveButton, loadingSave && styles.saveButtonDisabled]} onPress={saveProfile} disabled={loadingSave}>
                <Text style={styles.saveButtonText}>{loadingSave ? "Saving..." : "Save changes"}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setIsEditing(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </KeyboardAwareScrollView>
          </View>
        </View>
      </Modal>

      {showSuccess && (
        <View style={styles.successToast}>
          <Text style={styles.successText}>Saved ✓</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  profileHeader: { alignItems: "center", paddingHorizontal: spacing.md, paddingVertical: spacing.lg },
  avatar: { width: 120, height: 120, borderRadius: 60, borderWidth: 1, borderColor: colors.border } as ImageStyle,
  changePhotoText: { color: colors.mutedForeground, fontSize: fontSizes.sm, marginTop: spacing.xs },
  name: { fontSize: fontSizes["2xl"], fontWeight: fontWeights.bold, color: colors.foreground, marginTop: spacing.sm },
  title: { fontSize: fontSizes.base, color: colors.mutedForeground, marginTop: spacing.xs },
  headerButtons: { marginTop: spacing.md },
  editButton: { backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full },
  editButtonText: { color: colors.primaryForeground, fontWeight: fontWeights.semibold },

  section: { marginBottom: spacing.lg, paddingHorizontal: spacing.md },
  sectionTitle: { fontSize: fontSizes.lg, fontWeight: fontWeights.semibold, marginBottom: spacing.sm },
  bio: { color: colors.foreground, lineHeight: 22 },
  fieldText: { color: colors.foreground },
  linkText: { color: colors.primary },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.xs },
  fieldLabel: { color: colors.foreground },

  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.35)" },
  modalCard: { backgroundColor: colors.card ?? colors.background, padding: spacing.lg, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "90%" },
  modalAvatar: { width: 96, height: 96, borderRadius: 48 } as ImageStyle,
  changePhotoTextSmall: { textAlign: "center", color: colors.primary, marginTop: 4 },
  modalSectionTitle: { fontWeight: fontWeights.semibold, color: colors.foreground, marginTop: spacing.md, marginBottom: spacing.sm },
  input: { backgroundColor: colors.inputBackground, padding: spacing.md, borderRadius: borderRadius.lg, color: colors.foreground, marginBottom: spacing.sm },
  bioInput: { height: 100, textAlignVertical: "top" },
  saveButton: { backgroundColor: colors.primary, paddingVertical: spacing.md, borderRadius: borderRadius.lg, alignItems: "center", marginTop: spacing.md },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonText: { color: colors.primaryForeground, fontWeight: fontWeights.semibold },
  cancelText: { textAlign: "center", marginTop: spacing.md, color: colors.mutedForeground },
  successToast: { position: "absolute", top: 36, alignSelf: "center", backgroundColor: "#1B8F36", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
  successText: { color: "#fff", fontWeight: "600" },
});
