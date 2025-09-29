import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { SearchIcon, FilterIcon, MapPinIcon, DollarSignIcon, ClockIcon } from './icons';
import { colors, spacing, fontSizes, fontWeights, borderRadius, shadows } from '../styles/colors';

const sampleSearchResults = [
  {
    id: '1',
    title: 'Software Engineer Intern',
    company: 'Google',
    location: 'Mountain View, CA',
    type: 'Internship',
    salary: '$40-50/hr',
    skills: ['Python', 'Java', 'Algorithms'],
    logo: "https://images.unsplash.com/photo-1657885428127-38a40be4e232?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx8Y29tcGFueSUyMGxvZ28lMjBkZXNpZ258ZW58MXx8fHwxNzU3NDM3NTQ1fDA&ixlib=rb-4.1.0&q=80&w=1080"
  },
  {
    id: '2',
    title: 'Product Manager',
    company: 'Meta',
    location: 'Menlo Park, CA',
    type: 'Full-time',
    salary: '$120K-150K',
    skills: ['Strategy', 'Analytics', 'Leadership'],
    logo: "https://images.unsplash.com/photo-1657885428127-38a40be4e232?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx8Y29tcGFueSUyMGxvZ28lMjBkZXNpZ258ZW58MXx8fHwxNzU3NDM3NTQ1fDA&ixlib=rb-4.1.0&q=80&w=1080"
  },
  {
    id: '3',
    title: 'UX Designer Intern',
    company: 'Apple',
    location: 'Cupertino, CA',
    type: 'Internship',
    salary: '$35-45/hr',
    skills: ['Figma', 'Prototyping', 'User Research'],
    logo: "https://images.unsplash.com/photo-1657885428127-38a40be4e232?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx8Y29tcGFueSUyMGxvZ28lMjBkZXNpZ258ZW58MXx8fHwxNzU3NDM3NTQ1fDA&ixlib=rb-4.1.0&q=80&w=1080"
  }
];

export const SearchScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const renderSkillBadge = (skill: string) => (
    <View key={skill} style={styles.skillBadge}>
      <Text style={styles.skillText}>{skill}</Text>
    </View>
  );

  const renderJobCard = (job: typeof sampleSearchResults[0]) => (
    <TouchableOpacity key={job.id} style={styles.jobCard}>
      <View style={styles.jobHeader}>
        <Image source={{ uri: job.logo }} style={styles.companyLogo} />
        <View style={styles.jobTitleSection}>
          <Text style={styles.jobTitle}>{job.title}</Text>
          <Text style={styles.companyName}>{job.company}</Text>
        </View>
      </View>

      <View style={styles.jobDetails}>
        <View style={styles.detailRow}>
          <MapPinIcon size={16} color={colors.mutedForeground} />
          <Text style={styles.detailText}>{job.location}</Text>
        </View>

        <View style={styles.detailColumns}>
          <View style={styles.detailRow}>
            <ClockIcon size={16} color={colors.mutedForeground} />
            <Text style={styles.detailText}>{job.type}</Text>
          </View>
          <View style={styles.detailRow}>
            <DollarSignIcon size={16} color={colors.mutedForeground} />
            <Text style={styles.detailText}>{job.salary}</Text>
          </View>
        </View>
      </View>

      <View style={styles.skillsContainer}>
        {job.skills.map(renderSkillBadge)}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Search Jobs</Text>
        
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <SearchIcon size={20} color={colors.mutedForeground} />
            <TextInput
              placeholder="Job title, company, or skills..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
              placeholderTextColor={colors.mutedForeground}
            />
          </View>
          <TouchableOpacity style={styles.filterButton}>
            <FilterIcon size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.resultsCount}>
          {sampleSearchResults.length} opportunities found
        </Text>
        
        {sampleSearchResults.map(renderJobCard)}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.bold,
    color: colors.foreground,
    marginBottom: spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBackground,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSizes.base,
    color: colors.foreground,
  },
  filterButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  resultsCount: {
    fontSize: fontSizes.sm,
    color: colors.mutedForeground,
    marginBottom: spacing.md,
  },
  jobCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  jobHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  companyLogo: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    marginRight: spacing.sm,
  },
  jobTitleSection: {
    flex: 1,
  },
  jobTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.medium,
    color: colors.foreground,
  },
  companyName: {
    fontSize: fontSizes.sm,
    color: colors.mutedForeground,
  },
  jobDetails: {
    marginBottom: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  detailColumns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailText: {
    fontSize: fontSizes.sm,
    color: colors.mutedForeground,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  skillBadge: {
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  skillText: {
    fontSize: fontSizes.xs,
    color: colors.secondaryForeground,
    fontWeight: fontWeights.medium,
  },
});