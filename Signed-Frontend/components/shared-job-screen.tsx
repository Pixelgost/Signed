import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Constants from 'expo-constants';
import { colors, spacing, fontSizes, fontWeights, borderRadius } from '../styles/colors';
import { JobCard } from './job-card';

interface SharedJobScreenProps {
  shareToken: string;
  onClose?: () => void;
}

export const SharedJobScreen: React.FC<SharedJobScreenProps> = ({ shareToken, onClose }) => {
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const machineIp = Constants.expoConfig?.extra?.MACHINE_IP;
  const BASE_URL = `http://${machineIp}:8000`;

  useEffect(() => {
    fetchSharedJob();
  }, [shareToken]);

  const fetchSharedJob = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${BASE_URL}/api/v1/users/shared-job-posting/?token=${shareToken}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const data = await response.json();

      if (response.ok && data.job_posting) {
        setJob(data.job_posting);
      } else {
        setError(data.message || 'Job posting not found');
      }
    } catch (err: any) {
      console.error('Error fetching shared job:', err);
      setError('Failed to load job posting');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading job posting...</Text>
        </View>
      </View>
    );
  }

  if (error || !job) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorTitle}>Unable to Load Job Posting</Text>
          <Text style={styles.errorText}>{error || 'The job posting could not be found.'}</Text>
          {onClose && (
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Job Posting</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <JobCard
          job={job}
          userRole="applicant"
          onEditJobPosting={() => {}}
          onToggleSuccess={fetchSharedJob}
        />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    color: colors.foreground,
  },
  closeIcon: {
    fontSize: fontSizes.xl,
    color: colors.mutedForeground,
    padding: spacing.sm,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSizes.base,
    color: colors.foreground,
  },
  errorTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    color: colors.foreground,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  errorText: {
    fontSize: fontSizes.base,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  closeButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  closeButtonText: {
    color: colors.primaryForeground,
    fontWeight: fontWeights.semibold,
    fontSize: fontSizes.base,
  },
});
