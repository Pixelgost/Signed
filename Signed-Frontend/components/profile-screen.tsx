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
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {
  ChevronRightIcon,
} from './icons';
import { colors, spacing, fontSizes, fontWeights, borderRadius } from '../styles/colors';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { PersonalityQuiz } from "@/components/personality-quiz";
import { JobCard as FullJobCard } from './job-card';

export function PersonalityQuizScreen({ onBack }) {
  return (
    <View style={{ flex: 1, justifyContent:'center', alignItems:'center' }}>
      <Text style={{ fontSize: 22, marginBottom: 20 }}>Personality Quiz Here</Text>

      <TouchableOpacity onPress={onBack} style={{ padding: 12, backgroundColor: 'black', borderRadius: 12 }}>
        <Text style={{ color: 'white' }}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}

type APIJobPosting = {
  id: string;
  job_title: string;
  company: string;
  location: string;
  job_type: string;
  salary: string | null;
  company_size: string | null;
  tags: string[];
  job_description: string | null;
  company_logo: {
    file_name: string;
    file_type: string;
    file_size: number;
    download_link: string;
  } | null;
  media_items: Array<{
    file_name: string;
    file_type: string;
    file_size: number;
    download_link: string;
  }>;
  date_posted: string;
  date_updated: string;
  is_active: boolean;
  similarity_score?: number;
};

type DashboardAppliedJob = {
  id: string;
  title: string;
  location: string;
  status: 'active' | 'paused';
  postedDays: number;
  applicants: number;
  matches: number;
};

function toDashboard(items: APIJobPosting[]): DashboardAppliedJob[] {
  return items.map((jp) => ({
    id: jp.id,
    title: jp.job_title,
    location: jp.location || '—',
    status: jp.is_active ? 'active' : 'paused',
    postedDays: daysSince(jp.date_posted),
    applicants: 0,
    matches: 0,
  }));
}

function daysSince(iso?: string): number {
  if (!iso) return 0;
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const d = Math.floor(diff / (1000 * 60 * 60 * 24));
  return Math.max(d, 0);
}

function formatDaysAgo(days: number) {
  return days === 1 ? '1 day ago' : `${days} days ago`;
}

export const ProfileScreen = ({ currUser, onStartPersonalityQuiz }) => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [avatarUri, setAvatarUri] = useState<string>(
    'https://images.unsplash.com/photo-1739298061757-7a3339cee982?...'
  );
  // Computed notification preference from currentUser
  //const notificationsEnabled = currentUser?.applicant_profile?.notifications_enabled ?? true;
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const machineIp = Constants.expoConfig?.extra?.MACHINE_IP;
  const BASE_URL = `http://${machineIp}:8000`;

  const [isEditing, setIsEditing] = useState<boolean>(false);

  // editable primitive fields
  const [id, setId] = useState<string>('');
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  const [major, setMajor] = useState<string>('');
  const [school, setSchool] = useState<string>('');
  const [personality, setPersonality] = useState<string>('');
  // Skills - use an array for chips and keep an input to add new skill
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
  const [showPersonalityQuiz, setShowPersonalityQuiz] = useState(false);

  const [appliedJobsFull, setAppliedJobsFull] = useState<APIJobPosting[]>([]);
  const dashboardAppliedJobs = toDashboard(appliedJobsFull);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [errorJobs, setErrorJobs] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const openDetails = (jobId: string) => {
    setSelectedJobId(jobId);
    setDetailsOpen(true);
  };
  const closeDetails = () => {
    setSelectedJobId(null);
    setDetailsOpen(false);
  };

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

      setNotificationsEnabled(userData.applicant_profile?.notifications_enabled ?? true);
      setId(userData.id || '');
      setFirstName(userData.first_name || '');
      setLastName(userData.last_name || '');
      setBio(userData.applicant_profile?.bio || '');
      setMajor(userData.applicant_profile?.major || '');
      setSchool(userData.applicant_profile?.school || '');
      setPersonality(userData.applicant_profile?.personality_type || '');

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
    (async () => {
      // Fetch user data from server
      fetchCurrentUser();

      // Request permissions
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permissions needed', 'We need access to your photos to change profile image.');
        }
      }
    })();
  }, []);

  // Image picker (gallery only)
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

  // Resume Document Picker
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

  // Skills chips operations
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

  const updateNotificationPreference = async (enabled: boolean) => {
    const token = await AsyncStorage.getItem('userToken');
    if (!token) return;

    setNotificationsEnabled(enabled);

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
      console.error('Failed to update notification preference:', err);
      Alert.alert('Error', 'Failed to update notification preference.');
      // Fetch again to revert to actual server state on error
      //await fetchCurrentUser();
      setNotificationsEnabled(!enabled);
    }
  };

  // Save handler
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
      // send skills as comma-separated string
      formData.append('skills', skillsArr.join(', '));
      formData.append('portfolio_url', portfolioUrl);
      formData.append('resume', resumeText);

      // include resume file if picked
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

  const fetchAppliedJobs = async (isRefresh: boolean = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoadingJobs(true);
      }
      console.log(currentUser);
      console.log(currentUser.id);
      if (!currentUser) {
        return;
      }
      console.log(`${BASE_URL}/api/v1/users/get-applied-jobs/?user_id=${currentUser.id}`);
      const response = await axios.get(`${BASE_URL}/api/v1/users/get-applied-jobs/?user_id=${currentUser.id}`);
      if (!response.data) return;
      const jobs: APIJobPosting[] = response.data?.applied_job_postings ?? [];
      setAppliedJobsFull(jobs);
    } catch (error: any) {
      console.error('Error fetching applied jobs:', error);
      const status = error?.response?.status;
      const data = error?.response?.data;
      console.log('ERROR STATUS', status);
      console.log('ERROR DATA', data);
      setErrorJobs(error?.message ?? 'Failed to fetch applied jobs');
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoadingJobs(false);
      }
    }
  };

  useEffect(() => {
    if (currentUser?.id) fetchAppliedJobs();
  }, [currentUser?.id]);

  const JobRow = ({ job, onPress }: { job: DashboardAppliedJob; onPress: (j: DashboardAppliedJob) => void }) => (
    <TouchableOpacity style={styles.jobCard} onPress={() => onPress(job)}>
      <View style={styles.jobHeader}>
        <View style={styles.jobInfo}>
          <Text style={styles.jobTitle}>{job.title}</Text>
          <Text style={styles.jobLocation}>{job.location}</Text>
          <Text style={styles.jobPosted}>Posted {formatDaysAgo(job.postedDays)}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: job.status === 'active' ? colors.primary : colors.muted },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: job.status === 'active' ? colors.primaryForeground : colors.mutedForeground },
            ]}
          >
            {job.status.toUpperCase()}
          </Text>
        </View>
      </View>
      <ChevronRightIcon size={20} color={colors.mutedForeground} />
    </TouchableOpacity>
  );

  const name = currentUser ? `${currentUser.first_name || firstName} ${currentUser.last_name || lastName}`.trim() : 'Applicant';
  const title = currentUser?.title || 'Aspiring Professional';

  if (showPersonalityQuiz) {
    return (
      <PersonalityQuiz
        onComplete={() => setShowPersonalityQuiz(false)}
      />
    );
  }
  const onRefresh = async () => {
    await fetchAppliedJobs(true);
  };

  return (
      <View style={styles.container}>
        <KeyboardAwareScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          enableOnAndroid
          extraScrollHeight={80}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: spacing.xl }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          {/* Header */}
          <View style={styles.profileHeader}>
            <TouchableOpacity onPress={pickImage}>
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            </TouchableOpacity>
            <Text style={styles.changePhotoText}>Tap to change photo</Text>

            <Text style={styles.name}>{name || 'Applicant'}</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.quizButtonText}>{personality || currentUser?.applicant_profile?.personality_type || 'Take the personality quiz to know your type!'}</Text>

            <View style={styles.headerButtons}>
              <TouchableOpacity style={styles.editButton} onPress={() => setIsEditing(true)}>
                <Text style={styles.editButtonText}>Edit Profile</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Only show the quiz button if no personality is stored */}
          {(!personality || personality.trim().length === 0) && (
            <View style={styles.section}>     
              <TouchableOpacity onPress={() => setShowPersonalityQuiz(true)} style={styles.quizButton}>
                <Text style={styles.quizButtonText}>Take Personality Quiz</Text>
              </TouchableOpacity>
            </View>
          )}


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
              <Switch value={notificationsEnabled} onValueChange={updateNotificationPreference} />
            </View>
          </View>

          {/* Applied Jobs */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Applied Jobs</Text>
            {loadingJobs ? (
              <ActivityIndicator size="large" color={colors.primary} />
            ) : errorJobs ? (
              <Text style={styles.jobLocation}>Error: {errorJobs}</Text>
            ) : dashboardAppliedJobs.length === 0 ? (
              <Text style={styles.muted}>You haven't applied to any jobs yet.</Text>
            ) : (
              dashboardAppliedJobs.map((job) => (
                <JobRow key={job.id} job={job} onPress={(j) => openDetails(j.id)} />
              ))
            )}
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


        {/* ✅ Details modal with FullJobCard */}
        <Modal
          animationType="fade"
          transparent
          visible={detailsOpen}
          onRequestClose={closeDetails}
          statusBarTranslucent
          presentationStyle="overFullScreen"
        >
          <View style={modalStyles.backdrop}>
            <View style={modalStyles.cardWrapper}>
              <View style={modalStyles.headerRow}>
                <Text style={modalStyles.headerTitle}>Job Details</Text>
                <TouchableOpacity onPress={closeDetails} hitSlop={10}>
                  <Text style={modalStyles.closeText}>Close</Text>
                </TouchableOpacity>
              </View>
              <View style={modalStyles.cardBody}>
                {(() => {
                  const full = appliedJobsFull.find((j) => j.id === selectedJobId);
                  if (!full) {
                    return <Text style={{ color: colors.mutedForeground }}>Couldn't find that job.</Text>;
                  }
                  return (
                    <FullJobCard
                      job={full}
                      userRole="applicant"
                      onToggleSuccess={fetchAppliedJobs}
                      onEditJobPosting={fetchAppliedJobs}
                    />
                  );
                })()}
              </View>
            </View>
          </View>
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

  quizButton: { marginTop: spacing.lg, marginHorizontal: spacing.md, backgroundColor: colors.card ?? colors.inputBackground, paddingVertical: spacing.md, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6 },
  quizButtonText: { fontSize: fontSizes.base, fontWeight: fontWeights.semibold, color: colors.foreground },
  jobCard: {
      backgroundColor: colors.card,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      marginBottom: spacing.sm,
      flexDirection: "row",
      alignItems: "center",
    },
    jobHeader: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'flex-start',
      // gap: spacing.sm 
    },
    jobInfo: { flex: 1, marginBottom: spacing.sm, paddingRight: spacing.xs },
    jobTitle: { fontSize: fontSizes.base, fontWeight: fontWeights.semibold, color: colors.foreground, flexShrink: 1 },
    jobLocation: { fontSize: fontSizes.sm, color: colors.mutedForeground, marginTop: 2 },
    jobPosted: {
      fontSize: fontSizes.xs,
      color: colors.mutedForeground,
      marginTop: 2,
    },
    statusBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs / 2,
      borderRadius: borderRadius.sm,
      alignSelf: 'flex-start',
      marginRight: spacing.md,
      // position: "absolute",
      // top: 0,
      // right: 0,
    },
    statusText: {
      fontSize: fontSizes.xs,
      fontWeight: fontWeights.bold,
    },
});

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardWrapper: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    width: '92%',
    maxWidth: 720,
    maxHeight: '85%',
    alignSelf: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  headerTitle: { fontSize: fontSizes.lg, fontWeight: fontWeights.semibold, color: colors.foreground },
  closeText: { fontSize: fontSizes.base, color: colors.primary, fontWeight: fontWeights.medium },
  cardBody: { alignSelf: 'stretch', height: 520 },
});
