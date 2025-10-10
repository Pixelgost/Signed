// components/employer-profile-screen.tsx

import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  borderRadius,
  colors,
  fontSizes,
  fontWeights,
  spacing
} from '../styles/colors';
import {
  BellIcon,
  BriefcaseIcon,
  ChevronRightIcon,
  MapPinIcon,
  MessageCircleIcon,
  SettingsIcon,
  UserIcon,
} from './icons';

import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

type EmployerProfile = {
  company_name: string;
  job_title?: string;
  company_size?: string;
  company_website?: string;
  location?: string;
  industry?: string;
  about?: string;
  values?: string[];
  logo_url?: string;
  open_roles?: Array<{
    title: string;
    location: string;
    duration: string;
    description: string;
  }>;
};

type MeResponse = {
  first_name: string;
  last_name: string;
  role: 'employer' | 'applicant';
  employer_profile?: EmployerProfile;
};

export const EmployerProfileScreen = () => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showLocation, setShowLocation] = useState(true);
  const [autoScreening, setAutoScreening] = useState(false);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [avatarUri, setAvatarUri] = useState<string>(
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde'
  );

  const machineIp = Constants.expoConfig?.extra?.MACHINE_IP;
  const BASE_URL = `http://${machineIp}:8000`;

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);

      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        setError('Not signed in');
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(`${BASE_URL}/api/v1/users/auth/me/`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const userData = response.data;
        setMe(userData);

        let profileImage =
        userData.applicant_profile?.profile_image ||
        userData.employer_profile?.profile_image ||
        avatarUri;

        // if backend returns a relative url
        if (profileImage && !profileImage.startsWith('http')) {
            profileImage = `${BASE_URL}${profileImage}`;
        }

        console.log("Resolved profile image URL:", profileImage);
        setAvatarUri(profileImage);
      } catch (err: any) {
        setError(err?.message ?? 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    })();

    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Camera roll permissions are required to change your profile photo.');
      }
    })();
  }, []);

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
        await uploadPhoto(uri);
      }
    } catch (err) {
      console.error('Error picking image:', err);
    }
  };

  const uploadPhoto = async (uri: string) => {
    const token = await AsyncStorage.getItem('userToken');
    if (!token) return;

    const formData = new FormData();
    const fileName = uri.split('/').pop();
    const fileType = fileName?.split('.').pop();

    formData.append('profile_image', {
      uri,
      name: fileName,
      type: `image/${fileType}`,
    } as any);

    try {
      const response = await axios.post(
        `${BASE_URL}/api/v1/users/auth/me/upload-photo/`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.profile_image) {
        setAvatarUri(response.data.profile_image);
      }
    } catch (error: any) {
      console.error('Upload failed:', error.response?.data || error.message);
    }
  };

  const employerData = useMemo(() => {
    const ep: EmployerProfile | undefined = me?.employer_profile;
    return {
      companyName: ep?.company_name ?? 'Your Company',
      headline: ep?.job_title ?? 'Employer',
      industry: ep?.industry ?? 'N/A',
      location: ep?.location ?? 'Unknown',
      logo: avatarUri,
      about: ep?.about ?? 'No description available.',
      values: ep?.values ?? [],
      size: ep?.company_size ?? 'N/A',
      founded: '—',
      website: ep?.company_website ?? 'Not provided',
      openRoles: ep?.open_roles ?? [],
    };
  }, [me, avatarUri]);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8, color: colors.mutedForeground }}>
          Loading Profile...
        </Text>
      </View>
    );
  }

  const Section = ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );

  const SettingsItem = ({
    icon,
    title,
    subtitle,
    rightComponent,
  }: {
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    rightComponent?: React.ReactNode;
  }) => (
    <View style={styles.settingsItem}>
      <View style={styles.settingsItemLeft}>
        <View style={styles.settingsIcon}>{icon}</View>
        <View>
          <Text style={styles.settingsTitle}>{title}</Text>
          {subtitle ? <Text style={styles.settingsSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      {rightComponent || <ChevronRightIcon size={20} color={colors.mutedForeground} />}
    </View>
  );

  const ValueBadge = ({ label }: { label: string }) => (
    <View style={styles.valueBadge}>
      <Text style={styles.valueText}>{label}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Company header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={pickImage}>
          <Image source={{ uri: employerData.logo }} style={styles.logo} />
        </TouchableOpacity>
        <Text style={styles.companyName}>{employerData.companyName}</Text>
        {/* <Text style={styles.headline}>{employerData.headline}</Text> */}

        <View style={styles.metaRow}>
          <BriefcaseIcon size={16} color={colors.mutedForeground} />
          <Text style={styles.metaText}>{employerData.headline}</Text>
        </View>

        <View style={styles.metaRow}>
          <MapPinIcon size={16} color={colors.mutedForeground} />
          <Text style={styles.metaText}>{employerData.location}</Text>
        </View>

        <TouchableOpacity style={styles.editButton}>
          <Text style={styles.editButtonText}>Edit Company Profile</Text>
        </TouchableOpacity>
      </View>

      {/* About */}
      <Section title="About">
        <Text style={styles.bodyText}>{employerData.about}</Text>
      </Section>

      {/* Company details */}
      <Section title="Company Details">
        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Company Size</Text>
            <Text style={styles.detailValue}>{employerData.size}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Website</Text>
            <Text style={styles.detailValue}>{employerData.website}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>HQ</Text>
            <Text style={styles.detailValue}>{employerData.location}</Text>
          </View>
        </View>
      </Section>

      {/* Values */}
      {employerData.values.length > 0 && (
        <Section title="Company Values">
          <View style={styles.valuesWrap}>
            {employerData.values.map((v) => (
              <ValueBadge key={v} label={v} />
            ))}
          </View>
        </Section>
      )}

      {/* Preferences */}
      <Section title="Preferences">
        <SettingsItem
          icon={<BellIcon size={20} color={colors.foreground} />}
          title="Enable Notifications"
          subtitle="Get alerts about applicants and updates"
          rightComponent={
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor={colors.background}
            />
          }
        />
        <SettingsItem
          icon={<MapPinIcon size={20} color={colors.foreground} />}
          title="Show Company Location"
          subtitle="Visible on your public profile"
          rightComponent={
            <Switch
              value={showLocation}
              onValueChange={setShowLocation}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor={colors.background}
            />
          }
        />
        <SettingsItem
          icon={<BriefcaseIcon size={20} color={colors.foreground} />}
          title="Auto-Screening"
          subtitle="Reject candidates who don’t meet requirements"
          rightComponent={
            <Switch
              value={autoScreening}
              onValueChange={setAutoScreening}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor={colors.background}
            />
          }
        />
      </Section>

      <View style={{ height: spacing.xl }} />
    </ScrollView>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  logo: {
    width: 112,
    height: 112,
    borderRadius: 24,
    marginBottom: spacing.md,
  },
  companyName: {
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.bold,
    color: colors.foreground,
  },
  headline: {
    marginTop: spacing.xs,
    fontSize: fontSizes.base,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  metaText: {
    color: colors.mutedForeground,
    fontSize: fontSizes.base,
  },
  editButton: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  editButtonText: {
    color: colors.primaryForeground,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.medium,
  },
  section: {
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    color: colors.foreground,
    marginBottom: spacing.md,
  },
  bodyText: {
    color: colors.foreground,
    fontSize: fontSizes.base,
    lineHeight: 24,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  detailItem: {
    width: '47%',
    paddingVertical: spacing.sm,
  },
  detailLabel: {
    color: colors.mutedForeground,
    fontSize: fontSizes.sm,
    marginBottom: 2,
  },
  detailValue: {
    color: colors.foreground,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.medium,
  },
  valuesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  valueBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  valueText: {
    color: colors.primaryForeground,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingsIcon: {
    marginRight: spacing.md,
  },
  settingsTitle: {
    color: colors.foreground,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.medium,
  },
  settingsSubtitle: {
    color: colors.mutedForeground,
    fontSize: fontSizes.sm,
    marginTop: 2,
  },
});
