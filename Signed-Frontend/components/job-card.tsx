import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  Dimensions,
} from 'react-native';
import { MapPinIcon, DollarSignIcon, ClockIcon } from './icons';
import { colors, spacing, fontSizes, fontWeights, borderRadius, shadows } from '../styles/colors';

const { width: screenWidth } = Dimensions.get('window');

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  type: string;
  duration: string;
  description: string;
  requirements: string[];
  companyLogo: string;
  images: string[];
}

interface JobCardProps {
  job: Job;
}

export const JobCard = ({ job }: JobCardProps) => {
  const renderRequirement = (requirement: string) => (
    <View key={requirement} style={styles.requirementBadge}>
      <Text style={styles.requirementText}>{requirement}</Text>
    </View>
  );

  return (
    <View style={styles.card}>
      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Main image */}
        <Image 
          source={{ uri: job.images[0] }} 
          style={styles.mainImage}
          resizeMode="cover"
        />

        {/* Content */}
        <View style={styles.content}>
          {/* Company header */}
          <View style={styles.companyHeader}>
            <Image 
              source={{ uri: job.companyLogo }} 
              style={styles.companyLogo}
            />
            <View style={styles.companyInfo}>
              <Text style={styles.jobTitle}>{job.title}</Text>
              <Text style={styles.companyName}>{job.company}</Text>
            </View>
          </View>

          {/* Job details */}
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <MapPinIcon size={16} color={colors.mutedForeground} />
              <Text style={styles.detailText}>{job.location}</Text>
            </View>

            <View style={styles.detailColumns}>
              <View style={styles.detailRow}>
                <DollarSignIcon size={16} color={colors.mutedForeground} />
                <Text style={styles.detailText}>{job.salary}</Text>
              </View>
              <View style={styles.detailRow}>
                <ClockIcon size={16} color={colors.mutedForeground} />
                <Text style={styles.detailText}>{job.type}</Text>
              </View>
            </View>

            <Text style={styles.duration}>Duration: {job.duration}</Text>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About the Role</Text>
            <Text style={styles.description}>{job.description}</Text>
          </View>

          {/* Requirements */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Requirements</Text>
            <View style={styles.requirementsContainer}>
              {job.requirements.map(renderRequirement)}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.lg,
  },
  scrollContainer: {
    flex: 1,
  },
  mainImage: {
    width: '100%',
    height: 200,
  },
  content: {
    padding: spacing.md,
  },
  companyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  companyLogo: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.lg,
    marginRight: spacing.sm,
  },
  companyInfo: {
    flex: 1,
  },
  jobTitle: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colors.foreground,
    marginBottom: 2,
  },
  companyName: {
    fontSize: fontSizes.lg,
    color: colors.mutedForeground,
  },
  detailsContainer: {
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  detailColumns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: spacing.xs,
  },
  detailText: {
    fontSize: fontSizes.sm,
    color: colors.mutedForeground,
  },
  duration: {
    fontSize: fontSizes.sm,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    color: colors.foreground,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: fontSizes.base,
    lineHeight: 24,
    color: colors.foreground,
  },
  requirementsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  requirementBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  requirementText: {
    fontSize: fontSizes.sm,
    color: colors.primaryForeground,
    fontWeight: fontWeights.medium,
  },
});