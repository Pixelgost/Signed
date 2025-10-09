import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Switch,
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

type ProfileScreenProps = {
  currentUser: any;
};

export const ProfileScreen = ({ currentUser }: ProfileScreenProps) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationVisible, setLocationVisible] = useState(true);

  // Fallbacks if currentUser is missing fields
  const user = currentUser || {};
  const name = user.first_name
    ? `${user.first_name} ${user.last_name || ''}`
    : 'Applicant';
  const title = user.title || 'Aspiring Professional';
  const location = user.location || 'Unknown Location';
  const avatar =
    user.avatar ||
    "https://images.unsplash.com/photo-1739298061757-7a3339cee982?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080";
  const bio =
    user.bio ||
    'You have not added a bio yet. Update your profile to let employers know more about you.';
  const skills = user.skills || ['No skills have been added'];
  const experience = user.experience || [''];

  const renderSkillBadge = (skill: string) => (
    <View key={skill} style={styles.skillBadge}>
      <Text style={styles.skillText}>{skill}</Text>
    </View>
  );

  const renderExperience = (
    exp: { title: string; company: string; duration: string; description: string },
    index: number
  ) => (
    <View key={index} style={styles.experienceItem}>
      <View style={styles.experienceHeader}>
        <Text style={styles.experienceTitle}>{exp.title}</Text>
        <Text style={styles.experienceDuration}>{exp.duration}</Text>
      </View>
      <Text style={styles.experienceCompany}>{exp.company}</Text>
      <Text style={styles.experienceDescription}>{exp.description}</Text>
    </View>
  );

  const SettingsSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );

  const SettingsItem = ({
    icon,
    title,
    subtitle,
    onPress,
    rightComponent,
  }: {
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightComponent?: React.ReactNode;
  }) => (
    <TouchableOpacity style={styles.settingsItem} onPress={onPress}>
      <View style={styles.settingsItemLeft}>
        <View style={styles.settingsIcon}>{icon}</View>
        <View>
          <Text style={styles.settingsTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingsSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {rightComponent || <ChevronRightIcon size={20} color={colors.mutedForeground} />}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <Image source={{ uri: avatar }} style={styles.avatar} />
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.title}>{title}</Text>

        <View style={styles.locationContainer}>
          <MapPinIcon size={16} color={colors.mutedForeground} />
          <Text style={styles.location}>{location}</Text>
        </View>

        <TouchableOpacity style={styles.editButton}>
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Bio Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.bio}>{bio}</Text>
      </View>

      {/* Skills Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Skills</Text>
        <View style={styles.skillsContainer}>
          {skills.map(renderSkillBadge)}
        </View>
      </View>

      {/* Experience Section */}
      {experience.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Experience</Text>
          {experience.map(renderExperience)}
        </View>
      )}

      {/* Preferences Section */}
      <SettingsSection title="Preferences">
        <SettingsItem
          icon={<BellIcon size={20} color={colors.foreground} />}
          title="Push Notifications"
          subtitle="Get notified about new matches"
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
          title="Show Location"
          subtitle="Let employers see your location"
          rightComponent={
            <Switch
              value={locationVisible}
              onValueChange={setLocationVisible}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor={colors.background}
            />
          }
        />
      </SettingsSection>

      {/* Account Settings */}
      <SettingsSection title="Account">
        <SettingsItem
          icon={<UserIcon size={20} color={colors.foreground} />}
          title="Account Settings"
          subtitle="Manage your account details"
          onPress={() => console.log('Account settings')}
        />

        <SettingsItem
          icon={<MessageCircleIcon size={20} color={colors.foreground} />}
          title="Privacy Settings"
          subtitle="Control who can see your profile"
          onPress={() => console.log('Privacy settings')}
        />

        <SettingsItem
          icon={<SettingsIcon size={20} color={colors.foreground} />}
          title="App Settings"
          subtitle="Customize your app experience"
          onPress={() => console.log('App settings')}
        />
      </SettingsSection>

      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: spacing.md,
  },
  name: {
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.bold,
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: fontSizes.lg,
    color: colors.mutedForeground,
    marginBottom: spacing.sm,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  location: {
    fontSize: fontSizes.base,
    color: colors.mutedForeground,
  },
  editButton: {
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
  bio: {
    fontSize: fontSizes.base,
    color: colors.foreground,
    lineHeight: 24,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  skillBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  skillText: {
    fontSize: fontSizes.sm,
    color: colors.primaryForeground,
    fontWeight: fontWeights.medium,
  },
  experienceItem: {
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  experienceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  experienceTitle: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.foreground,
    flex: 1,
  },
  experienceDuration: {
    fontSize: fontSizes.sm,
    color: colors.mutedForeground,
  },
  experienceCompany: {
    fontSize: fontSizes.base,
    color: colors.mutedForeground,
    marginBottom: spacing.xs,
  },
  experienceDescription: {
    fontSize: fontSizes.sm,
    color: colors.foreground,
    lineHeight: 20,
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
    fontSize: fontSizes.base,
    fontWeight: fontWeights.medium,
    color: colors.foreground,
  },
  settingsSubtitle: {
    fontSize: fontSizes.sm,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  bottomSpacing: {
    height: spacing.xl,
  },
});
