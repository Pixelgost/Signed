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

interface MediaItem {
  file_type: string;
  file_size: number;
  download_link: string;
  file_name: string;
}

interface Job {
  id: string;
  job_title: string;
  company: string;
  location: string;
  salary: string;
  job_type: string;
  job_description: string;
  tags: string[];
  company_logo: string | null;
  media_items: MediaItem[];
  company_size: string;
  date_posted: string;
  date_updated: string;
  is_active: boolean;
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
        {job.media_items && job.media_items.length > 0 ? (
          <Image 
            source={{ uri: job.media_items[0].download_link }} 
            style={styles.mainImageStyle}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.mainImage, styles.placeholderImage]}>
            <Text style={styles.placeholderText}>No Image</Text>
          </View>
        )}

        {/* Content */}
        <View style={styles.content}>
          {/* Company header */}
          <View style={styles.companyHeader}>
            {job.company_logo ? (
              <Image 
                source={{ uri: job.company_logo }} 
                style={styles.companyLogoImage}
              />
            ) : (
              <View style={[styles.companyLogo, styles.placeholderLogo]}>
                <Text style={styles.logoText}>{job.company.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.companyInfo}>
              <Text style={styles.jobTitle}>{job.job_title}</Text>
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
                <Text style={styles.detailText}>${job.salary}</Text>
              </View>
              <View style={styles.detailRow}>
                <ClockIcon size={16} color={colors.mutedForeground} />
                <Text style={styles.detailText}>{job.job_type}</Text>
              </View>
            </View>

            <Text style={styles.duration}>Company Size: {job.company_size} employees</Text>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About the Role</Text>
            <Text style={styles.description}>{job.job_description}</Text>
          </View>

          {/* Tags */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tags</Text>
            <View style={styles.requirementsContainer}>
              {job.tags.map(renderRequirement)}
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
  mainImageStyle: {
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
  companyLogoImage: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.lg,
  },
  companyInfo: {
    flex: 1,
  },
  jobTitle: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold' as const,
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
    fontWeight: '600' as const,
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
    fontWeight: '500' as const,
  },
  placeholderImage: {
    backgroundColor: colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: fontSizes.lg,
    color: colors.mutedForeground,
    fontWeight: '500' as const,
  },
  placeholderLogo: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: fontSizes.xl,
    color: colors.primaryForeground,
    fontWeight: 'bold' as const,
  },
});