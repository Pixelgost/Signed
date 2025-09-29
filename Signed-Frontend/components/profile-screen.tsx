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
  BriefcaseIcon 
} from './icons';
import { colors, spacing, fontSizes, fontWeights, borderRadius, shadows } from '../styles/colors';

const profileData = {
  name: 'Alex Johnson',
  title: 'Frontend Developer',
  location: 'San Francisco, CA',
  avatar: "https://images.unsplash.com/photo-1739298061757-7a3339cee982?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx8cHJvZmVzc2lvbmFsJTIwYnVzaW5lc3MlMjB0ZWFtfGVufDF8fHx8MTc1NzQ3MTQ1MXww&ixlib=rb-4.1.0&q=80&w=1080",
  bio: 'Passionate frontend developer with 3 years of experience building user-friendly web applications.',
  skills: ['React', 'TypeScript', 'CSS', 'JavaScript', 'Node.js'],
  experience: [
    {
      title: 'Junior Frontend Developer',
      company: 'TechStart Inc.',
      duration: '2022 - Present',
      description: 'Building responsive web applications using React and TypeScript.'
    },
    {
      title: 'Web Development Intern',
      company: 'Digital Agency',
      duration: '2021 - 2022',
      description: 'Assisted in developing client websites and learned modern web technologies.'
    }
  ]
};

export const ProfileScreen = () => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationVisible, setLocationVisible] = useState(true);

  const renderSkillBadge = (skill: string) => (
    <View key={skill} style={styles.skillBadge}>
      <Text style={styles.skillText}>{skill}</Text>
    </View>
  );

  const renderExperience = (exp: typeof profileData.experience[0], index: number) => (
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
    rightComponent 
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
      {/* Profile header */}
      <View style={styles.profileHeader}>
        <Image source={{ uri: profileData.avatar }} style={styles.avatar} />
        <Text style={styles.name}>{profileData.name}</Text>
        <Text style={styles.title}>{profileData.title}</Text>
        
        <View style={styles.locationContainer}>
          <MapPinIcon size={16} color={colors.mutedForeground} />
          <Text style={styles.location}>{profileData.location}</Text>
        </View>

        <TouchableOpacity style={styles.editButton}>
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Bio section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.bio}>{profileData.bio}</Text>
      </View>

      {/* Skills section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Skills</Text>
        <View style={styles.skillsContainer}>
          {profileData.skills.map(renderSkillBadge)}
        </View>
      </View>

      {/* Experience section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Experience</Text>
        {profileData.experience.map(renderExperience)}
      </View>

      {/* Settings sections */}
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