import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { MessageCircleIcon, MapPinIcon, DollarSignIcon } from './icons';
import { colors, spacing, fontSizes, fontWeights, borderRadius, shadows } from '../styles/colors';

const matches = [
  {
    id: '1',
    title: 'Frontend Developer Intern',
    company: 'TechFlow',
    location: 'San Francisco, CA',
    salary: '$35-45/hr',
    companyLogo: "https://images.unsplash.com/photo-1657885428127-38a40be4e232?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx8Y29tcGFueSUyMGxvZ28lMjBkZXNpZ258ZW58MXx8fHwxNzU3NDM3NTQ1fDA&ixlib=rb-4.1.0&q=80&w=1080",
    matchedAt: '2 hours ago',
    status: 'new'
  },
  {
    id: '2',
    title: 'UX Designer',
    company: 'DesignCorp',
    location: 'Austin, TX',
    salary: '$60K-80K',
    companyLogo: "https://images.unsplash.com/photo-1657885428127-38a40be4e232?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx8Y29tcGFueSUyMGxvZ28lMjBkZXNpZ258ZW58MXx8fHwxNzU3NDM3NTQ1fDA&ixlib=rb-4.1.0&q=80&w=1080",
    matchedAt: '1 day ago',
    status: 'viewed'
  },
  {
    id: '3',
    title: 'Software Engineer',
    company: 'CodeBase',
    location: 'Seattle, WA',
    salary: '$95K-120K',
    companyLogo: "https://images.unsplash.com/photo-1657885428127-38a40be4e232?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx8Y29tcGFueSUyMGxvZ28lMjBkZXNpZ258ZW58MXx8fHwxNzU3NDM3NTQ1fDA&ixlib=rb-4.1.0&q=80&w=1080",
    matchedAt: '3 days ago',
    status: 'contacted'
  }
];

interface MatchesScreenProps {
  onMessageClick?: (matchId: string) => void;
}

export const MatchesScreen = ({ onMessageClick }: MatchesScreenProps) => {
  const renderMatch = (match: typeof matches[0]) => (
    <View key={match.id} style={styles.matchCard}>
      <View style={styles.matchHeader}>
        <Image source={{ uri: match.companyLogo }} style={styles.companyLogo} />
        <View style={styles.matchInfo}>
          <Text style={styles.jobTitle}>{match.title}</Text>
          <Text style={styles.companyName}>{match.company}</Text>
          <View style={styles.locationContainer}>
            <MapPinIcon size={14} color={colors.mutedForeground} />
            <Text style={styles.locationText}>{match.location}</Text>
          </View>
        </View>
        
        {match.status === 'new' && (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>NEW</Text>
          </View>
        )}
      </View>

      <View style={styles.matchDetails}>
        <View style={styles.salaryContainer}>
          <DollarSignIcon size={16} color={colors.mutedForeground} />
          <Text style={styles.salaryText}>{match.salary}</Text>
        </View>
        <Text style={styles.matchTime}>Matched {match.matchedAt}</Text>
      </View>

      <TouchableOpacity
        style={styles.messageButton}
        onPress={() => onMessageClick?.(match.id)}
      >
        <MessageCircleIcon size={20} color={colors.primaryForeground} />
        <Text style={styles.messageButtonText}>
          {match.status === 'contacted' ? 'Continue Chat' : 'Send Message'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Matches</Text>
        <Text style={styles.subtitle}>
          {matches.length} companies are interested in you
        </Text>
      </View>

      <ScrollView
        style={styles.matchesList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.matchesContent}
      >
        {matches.map(renderMatch)}
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
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSizes.base,
    color: colors.mutedForeground,
  },
  matchesList: {
    flex: 1,
  },
  matchesContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  matchCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  matchHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  companyLogo: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.lg,
    marginRight: spacing.sm,
  },
  matchInfo: {
    flex: 1,
  },
  jobTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    color: colors.foreground,
    marginBottom: 2,
  },
  companyName: {
    fontSize: fontSizes.base,
    color: colors.mutedForeground,
    marginBottom: spacing.xs,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: fontSizes.sm,
    color: colors.mutedForeground,
  },
  newBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.sm,
  },
  newBadgeText: {
    fontSize: fontSizes.xs,
    color: colors.primaryForeground,
    fontWeight: fontWeights.bold,
  },
  matchDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  salaryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  salaryText: {
    fontSize: fontSizes.sm,
    color: colors.foreground,
    fontWeight: fontWeights.medium,
  },
  matchTime: {
    fontSize: fontSizes.sm,
    color: colors.mutedForeground,
  },
  messageButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
  },
  messageButtonText: {
    color: colors.primaryForeground,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
  },
});