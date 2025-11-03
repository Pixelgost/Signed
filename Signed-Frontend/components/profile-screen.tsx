// ProfileScreen.tsx (replace your existing file)
// Requires: expo-image-picker, expo-document-picker, @react-native-async-storage/async-storage, axios
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Switch,
  Modal,
  TextInput,
  Platform,
  Alert,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
  FlatList,
} from 'react-native';
import {
  UserIcon,
  SettingsIcon,
  BellIcon,
  MessageCircleIcon,
  ChevronRightIcon,
  MapPinIcon,
} from './icons';
import { colors, spacing, fontSizes, fontWeights, borderRadius } from '../styles/colors';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

export const ProfileScreen = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [avatarUri, setAvatarUri] = useState<string>(
    'https://images.unsplash.com/photo-1739298061757-7a3339cee982?...'
  );
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);
  const [locationVisible, setLocationVisible] = useState<boolean>(true);

  const machineIp = Constants.expoConfig?.extra?.MACHINE_IP;
  const BASE_URL = `http://${machineIp}:8000`;

  const [isEditing, setIsEditing] = useState<boolean>(false);

  // editable primitive fields
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  const [major, setMajor] = useState<string>('');
  const [school, setSchool] = useState<string>('');
  // Skills - we use an array for chips and keep an input to add new skill
  const [skillInput, setSkillInput] = useState<string>('');
  const [skillsArr, setSkillsArr] = useState<string[]>([]);
  const [portfolioUrl, setPortfolioUrl] = useState<string>('');
  const [resumeText, setResumeText] = useState<string>('');
  // resume file (DocumentPicker result)
  const [resumeFile, setResumeFile] = useState<any>(null);
  // local avatar file uri if user just picked one and hasn't uploaded to server yet
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);

  const [loadingSave, setLoadingSave] = useState<boolean>(false);
  const scrollRef = useRef<ScrollView | null>(null);

  // success message (brief)
  const [showSuccess, setShowSuccess] = useState<boolean>(false);

  // fetch user
  const fetchCurrentUser = async () => {
    const token = await AsyncStorage.getItem('userToken');
    if (!token) return;

    try {
      const response = await axios.get(`${BASE_URL}/api/v1/users/auth/me/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const userData = response.data;
      setCurrentUser(userData);

      setFirstName(userData.first_name || '');
      setLastName(userData.last_name || '');
      setBio(userData.applicant_profile?.bio || '');
      setMajor(userData.applicant_profile?.major || '');
      setSchool(userData.applicant_profile?.school || '');

      // normalize skills into array
      const rawSkills = userData.applicant_profile?.skills;
      if (Array.isArray(rawSkills)) {
        setSkillsArr(rawSkills);
      } else if (typeof rawSkills === 'string' && rawSkills.trim().length > 0) {
        setSkillsArr(rawSkills.split(',').map((s: string) => s.trim()).filter(Boolean));
      } else {
        setSkillsArr([]);
      }

      setPortfolioUrl(userData.applicant_profile?.portfolio_url || '');
      setResumeText(userData.applicant_profile?.resume || '');
      setResumeFile(userData.applicant_profile?.resume_file || null);

      // profile image (relative -> absolute)
      let profileImage = userData.applicant_profile?.profile_image || avatarUri;
      if (profileImage && !profileImage.startsWith('http')) {
        profileImage = `${BASE_URL}${profileImage}`;
      }
      setAvatarUri(profileImage);
      setLocalAvatarUri(null);
    } catch (err) {
      console.error('Failed to fetch current user:', err);
    }
  };

  useEffect(() => {
    fetchCurrentUser();

    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permissions needed', 'We need access to your photos to change profile image.');
        }
      }
    })();
  }, []);

  // --- Image picker (gallery only) ---
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
        setAvatarUri(uri);
        setLocalAvatarUri(uri);
        // we upload immediately to keep remote in sync and reduce work on Save
        await uploadPhoto(uri);
      }
    } catch (err) {
      console.error('Error picking image:', err);
    }
  };

  const uploadPhoto = async (uri: string) => {
    const token = await AsyncStorage.getItem('userToken');
    if (!token) return;

    try {
      const formData = new FormData();
      const filename = uri.split('/').pop() || 'profile.jpg';
      const ext = filename.split('.').pop() || 'jpg';
      // @ts-ignore
      formData.append('profile_image', {
        uri,
        name: filename,
        type: `image/${ext}`,
      });

      const response = await axios.post(`${BASE_URL}/api/v1/users/auth/me/upload-photo/`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data && response.data.profile_image) {
        setAvatarUri(response.data.profile_image);
        setLocalAvatarUri(null);
      }
    } catch (err) {
      console.error('Upload failed:', err);
      Alert.alert('Upload error', 'Failed to upload profile photo.');
    }
  };

  // --- Resume Document Picker ---
  const pickResume = async () => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/*",
      ],
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return;
    }

    const file = result.assets[0]; // The actual picked file
    setResumeFile(file);
    Alert.alert("Resume selected", file.name);
  } catch (err) {
    console.error("Resume pick error", err);
  }
};


  // --- Skills chips operations ---
  const addSkill = () => {
    const s = skillInput.trim();
    if (!s) return;
    if (skillsArr.includes(s)) {
      setSkillInput('');
      return;
    }
    setSkillsArr(prev => [...prev, s]);
    setSkillInput('');
    // scroll to bottom so user sees new chip (helps on small screens)
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
  };

  const removeSkill = (skill: string) => {
    setSkillsArr(prev => prev.filter(s => s !== skill));
  };

  // --- Save handler ---
  const saveProfile = async () => {
    setLoadingSave(true);
    const token = await AsyncStorage.getItem('userToken');
    if (!token) {
      setLoadingSave(false);
      Alert.alert('Not authenticated', 'Please login and try again.');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('first_name', firstName);
      formData.append('last_name', lastName);
      formData.append('bio', bio);
      formData.append('major', major);
      formData.append('school', school);
      // send skills as comma-separated string (backend already handled this earlier)
      formData.append('skills', skillsArr.join(', '));
      formData.append('portfolio_url', portfolioUrl);
      formData.append('resume', resumeText);

      // include resume file if picked (new DocumentPicker format)
      if (resumeFile && resumeFile.uri) {
        formData.append("resume_file", {
          uri: resumeFile.uri,
          name: resumeFile.name ?? "resume.pdf",
          type: resumeFile.mimeType ?? "application/octet-stream",
        } as any);
      }

      // If avatar is local and not uploaded previously, include it
      if (localAvatarUri && (localAvatarUri.startsWith('file://') || localAvatarUri.startsWith('content://') || localAvatarUri.startsWith('/'))) {
        const filename = localAvatarUri.split('/').pop() || 'profile.jpg';
        const ext = filename.split('.').pop() || 'jpg';
        // @ts-ignore
        formData.append('profile_image', {
          uri: localAvatarUri,
          name: filename,
          type: `image/${ext}`,
        });
      }

      const res = await axios.put(`${BASE_URL}/api/v1/users/update-profile/`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      // success feedback
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 1800);
      Alert.alert('Saved', 'Profile updated successfully.');

      // refresh data from server
      await fetchCurrentUser();
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to save profile:', err.response?.data || err);
      Alert.alert('Save error', 'Failed to save profile. Please try again.');
    } finally {
      setLoadingSave(false);
    }
  };

  const name = currentUser ? `${currentUser.first_name || firstName} ${currentUser.last_name || lastName}`.trim() : 'Applicant';
  const title = currentUser?.title || 'Aspiring Professional';

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
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            </TouchableOpacity>
            <Text style={styles.changePhotoText}>Tap to change photo</Text>

            <Text style={styles.name}>{name || 'Applicant'}</Text>
            <Text style={styles.title}>{title}</Text>

            <View style={styles.headerButtons}>
              <TouchableOpacity style={styles.editButton} onPress={() => setIsEditing(true)}>
                <Text style={styles.editButtonText}>Edit Profile</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* About */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.bio}>{bio || currentUser?.applicant_profile?.bio || 'No bio added yet'}</Text>
          </View>

          {/* Education */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Education</Text>
            <Text style={styles.fieldText}>{currentUser?.applicant_profile?.major || major || '—'}</Text>
            <Text style={styles.fieldText}>{currentUser?.applicant_profile?.school || school || '—'}</Text>
          </View>

          {/* Skills */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Skills</Text>
            <View style={styles.skillsContainer}>
              {skillsArr.length > 0 ? skillsArr.map((s, i) => (
                <TouchableOpacity key={`${s}-${i}`} style={styles.skillBadge} onPress={() => removeSkill(s)}>
                  <Text style={styles.skillText}>{s} ✕</Text>
                </TouchableOpacity>
              )) : <Text style={styles.muted}>No skills added</Text>}
            </View>
          </View>

          {/* Portfolio */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Portfolio</Text>
            <Text style={styles.linkText}>{currentUser?.applicant_profile?.portfolio_url || portfolioUrl || '—'}</Text>
          </View>

          {/* Resume */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Resume</Text>
            <Text style={styles.fieldText}>{currentUser?.applicant_profile?.resume || resumeText || 'No resume summary'}</Text>
            {resumeFile ? <Text style={styles.muted}>{resumeFile.name}</Text> : currentUser?.applicant_profile?.resume_file ? <Text style={styles.muted}>Resume file present</Text> : null}
          </View>

          {/* Preferences */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preferences</Text>
            <View style={styles.rowBetween}>
              <Text style={styles.fieldLabel}>Push notifications</Text>
              <Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled} />
            </View>
            <View style={[styles.rowBetween, { marginTop: spacing.sm }]}>
              <Text style={styles.fieldLabel}>Show location</Text>
              <Switch value={locationVisible} onValueChange={setLocationVisible} />
            </View>
          </View>

          <View style={{ height: spacing.xl }} />
        </KeyboardAwareScrollView>

        {/* Editing modal - keyboard avoiding bottom sheet */}
        <Modal visible={isEditing} transparent animationType="slide">
          <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0} style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHandle} />

              <KeyboardAwareScrollView
                showsVerticalScrollIndicator={false}
                enableOnAndroid
                extraScrollHeight={120}
                keyboardOpeningTime={0}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 80 }}
              >
                {/* Avatar */}
                <TouchableOpacity onPress={pickImage} style={{ alignSelf: 'center', marginBottom: spacing.md }}>
                  <Image source={{ uri: avatarUri }} style={styles.modalAvatar} />
                  <Text style={styles.changePhotoTextSmall}>Change photo</Text>
                </TouchableOpacity>

                {/* Personal */}
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

                {/* About */}
                <Text style={styles.modalSectionTitle}>About</Text>
                <TextInput
                  value={bio}
                  onChangeText={setBio}
                  placeholder="Short bio"
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                  style={[styles.input, styles.bioInput]}
                />

                {/* Education */}
                <Text style={styles.modalSectionTitle}>Education</Text>
                <TextInput value={major} onChangeText={setMajor} placeholder="Major" placeholderTextColor={colors.mutedForeground} style={styles.input} />
                <TextInput value={school} onChangeText={setSchool} placeholder="School" placeholderTextColor={colors.mutedForeground} style={styles.input} />

                {/* Skills editor */}
                <Text style={styles.modalSectionTitle}>Skills</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    value={skillInput}
                    onChangeText={setSkillInput}
                    placeholder="Add a skill"
                    placeholderTextColor={colors.mutedForeground}
                    style={[styles.input, { flex: 1 }]}
                    onSubmitEditing={addSkill}
                    returnKeyType="done"
                  />
                  <TouchableOpacity onPress={addSkill} style={styles.addSkillButton}>
                    <Text style={styles.addSkillText}>+</Text>
                  </TouchableOpacity>
                </View>

                <View style={[styles.skillsContainer, { marginTop: spacing.sm }]}>
                  {skillsArr.map((s, i) => (
                    <TouchableOpacity key={`${s}-${i}`} style={styles.skillBadgeEditable} onPress={() => removeSkill(s)}>
                      <Text style={styles.skillTextEditable}>{s} ✕</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Portfolio */}
                <Text style={styles.modalSectionTitle}>Portfolio</Text>
                <TextInput value={portfolioUrl} onChangeText={setPortfolioUrl} placeholder="Portfolio URL" placeholderTextColor={colors.mutedForeground} style={styles.input} keyboardType="url" />

                {/* Resume summary + file */}
                <Text style={styles.modalSectionTitle}>Resume</Text>
                <TextInput
                  value={resumeText}
                  onChangeText={setResumeText}
                  placeholder="A short summary of your experience"
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                  style={[styles.input, styles.bioInput]}
                />
                <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center', marginTop: spacing.sm }}>
                  <TouchableOpacity onPress={pickResume} style={styles.resumeButton}>
                    <Text style={styles.resumeButtonText}>{resumeFile ? 'Change file' : 'Upload file'}</Text>
                  </TouchableOpacity>
                  <Text style={styles.muted}>{resumeFile ? resumeFile.name : (currentUser?.applicant_profile?.resume_file ? 'Resume on file' : 'No file')}</Text>
                </View>

                {/* Buttons */}
                <TouchableOpacity style={[styles.saveButton, loadingSave && styles.saveButtonDisabled]} onPress={saveProfile} disabled={loadingSave}>
                  <Text style={styles.saveButtonText}>{loadingSave ? 'Saving...' : 'Save changes'}</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setIsEditing(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>

                <View style={{ height: spacing.lg }} />
              </KeyboardAwareScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* small success indicator */}
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
  profileHeader: { alignItems: 'center', paddingHorizontal: spacing.md, paddingTop: spacing.lg, paddingBottom: spacing.lg },
  avatar: { width: 120, height: 120, borderRadius: 60, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.inputBackground ?? '#f4f4f4' },
  changePhotoText: { color: colors.mutedForeground, fontSize: fontSizes.sm, marginTop: spacing.xs },
  name: { fontSize: fontSizes['2xl'], fontWeight: fontWeights.bold, color: colors.foreground, marginTop: spacing.sm },
  title: { fontSize: fontSizes.base, color: colors.mutedForeground, marginTop: spacing.xs },
  headerButtons: { flexDirection: 'row', marginTop: spacing.md },
  editButton: { backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full },
  editButtonText: { color: colors.primaryForeground, fontWeight: fontWeights.semibold },

  section: { marginBottom: spacing.lg, paddingHorizontal: spacing.md },
  sectionTitle: { fontSize: fontSizes.lg, fontWeight: fontWeights.semibold, color: colors.foreground, marginBottom: spacing.sm },
  bio: { fontSize: fontSizes.base, color: colors.foreground, lineHeight: 22 },
  fieldText: { fontSize: fontSizes.base, color: colors.foreground, marginBottom: spacing.xs },
  muted: { color: colors.mutedForeground },

  skillsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  skillBadge: { backgroundColor: colors.inputBackground ?? '#f1f1f1', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.full, marginRight: spacing.xs, marginBottom: spacing.xs },
  skillText: { fontSize: fontSizes.sm, color: colors.foreground },

  // editable chips
  skillBadgeEditable: { backgroundColor: colors.card ?? '#fff', borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.full, marginRight: spacing.xs, marginBottom: spacing.xs },
  skillTextEditable: { fontSize: fontSizes.sm, color: colors.foreground },

  linkText: { color: colors.primary },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.xs },
  fieldLabel: { fontSize: fontSizes.base, color: colors.foreground },

  // modal / sheet
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  modalCard: { backgroundColor: colors.card ?? colors.background, padding: spacing.lg, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '90%', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12 },
  modalHandle: { width: 45, height: 5, borderRadius: 3, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.md },
  modalAvatar: { width: 96, height: 96, borderRadius: 48, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.inputBackground ?? '#f4f4f4' },
  changePhotoTextSmall: { color: colors.primary, fontSize: fontSizes.sm, marginTop: 6, textAlign: 'center' },
  modalSectionTitle: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.foreground, marginBottom: spacing.sm, marginTop: spacing.md },

  input: { backgroundColor: colors.inputBackground ?? '#f4f4f4', padding: spacing.md, borderRadius: borderRadius.lg, fontSize: fontSizes.base, color: colors.foreground, marginBottom: spacing.sm },
  bioInput: { height: 110, textAlignVertical: 'top' },

  addSkillButton: { backgroundColor: colors.primary, width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginLeft: spacing.xs },
  addSkillText: { color: colors.primaryForeground, fontSize: 20, fontWeight: fontWeights.semibold },

  // resume
  resumeButton: { backgroundColor: colors.card ?? '#fff', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border },
  resumeButtonText: { color: colors.foreground },

  saveButton: { backgroundColor: colors.primary, paddingVertical: spacing.md, borderRadius: borderRadius.lg, alignItems: 'center', marginTop: spacing.md },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonText: { color: colors.primaryForeground, fontWeight: fontWeights.semibold, fontSize: fontSizes.base },
  cancelText: { textAlign: 'center', marginTop: spacing.md, color: colors.mutedForeground },

  successToast: { position: 'absolute', top: 36, alignSelf: 'center', backgroundColor: '#1B8F36', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
  successText: { color: '#fff', fontWeight: '600' },
});
