import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  Modal,
  Pressable,
} from 'react-native';
import {
  PlusIcon,
  EyeIcon,
  HeartIcon,
  UserIcon,
  BriefcaseIcon,
  ChevronRightIcon,
} from '../components/icons';
import { colors, spacing, fontSizes, fontWeights, borderRadius, shadows } from '../styles/colors';
import axios from 'axios';
import Constants from 'expo-constants';
import { JobCard as FullJobCard } from '../components/job-card';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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
};

type DashboardJob = {
  id: string;
  title: string;
  location: string;
  status: 'active' | 'paused';
  postedDays: number;
  applicants: number;
  matches: number;
};

function daysSince(iso: string): number {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const d = Math.floor(diff / (1000 * 60 * 60 * 24));
  return Math.max(d, 0);
}

function mapApiToDashboardJobs(items: APIJobPosting[]): DashboardJob[] {
  return items.map((jp) => ({
    id: jp.id,
    title: jp.job_title,
    location: jp.location || '—',
    status: jp.is_active ? 'active' : 'paused',
    postedDays: jp.date_posted ? daysSince(jp.date_posted) : 0,
    applicants: 0,
    matches: 0,
  }));
}

/** Replace the old dashboardData with these (UI stays the same) */
const staticStats = {
  totalViews: 1247,
  totalLikes: 89,
  totalMatches: 23,
};

const staticTopCandidates = [
  {
    id: '1',
    name: 'Sarah Chen',
    title: 'Frontend Developer',
    location: 'San Francisco, CA',
    matchScore: 95,
    avatar:
      'https://images.unsplash.com/photo-1739298061757-7a3339cee982?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx8cHJvZmVzc2lvbmFsJTIwYnVzaW5lc3MlMjB0ZWFtfGVufDF8fHx8MTc1NzQ3MTQ1MXww&ixlib=rb-4.1.0&q=80&w=1080',
    skills: ['React', 'TypeScript', 'CSS'],
  },
  {
    id: '2',
    name: 'Michael Rodriguez',
    title: 'Full Stack Developer',
    location: 'Austin, TX',
    matchScore: 88,
    avatar:
      'https://images.unsplash.com/photo-1739298061757-7a3339cee982?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx8cHJvZmVzc2lvbmFsJTIwYnVzaW5lc3MlMjB0ZWFtfGVufDF8fHx8MTc1NzQ3MTQ1MXww&ixlib=rb-4.1.0&q=80&w=1080',
    skills: ['Node.js', 'Python', 'React'],
  },
];

const machineIp = Constants.expoConfig?.extra?.MACHINE_IP;

export const EmployerDashboard = () => {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'jobs' | 'candidates'>('overview');
  const [jobs, setJobs] = useState<DashboardJob[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Raw jobs for the modal/details view
  const [rawJobs, setRawJobs] = useState<APIJobPosting[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  /** Fetch page 1 of job postings on mount */
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setIsLoading(true);
        setError(null);
        const url = `http://${machineIp}:8000/get-job-postings/?page=1`;
        const { data } = await axios.get(url);
        const apiItems: APIJobPosting[] = data?.job_postings ?? [];
        const mapped = mapApiToDashboardJobs(apiItems);
        if (mounted) {
          setRawJobs(apiItems);
          setJobs(mapped);
        }
      } catch (e: any) {
        if (mounted) setError(e?.message ?? 'Failed to fetch jobs');
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const activeCount = jobs.filter((j) => j.status === 'active').length;

  function openDetails(jobId: string) {
    setSelectedJobId(jobId);
    setDetailsOpen(true);
  }

  function closeDetails() {
    setDetailsOpen(false);
    setSelectedJobId(null);
  }

  /** ——— Internal stat card ——— */
  const StatCard = ({
    icon,
    value,
    label,
    color = colors.primary,
  }: {
    icon: React.ReactNode;
    value: number;
    label: string;
    color?: string;
  }) => (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        {React.cloneElement(icon as React.ReactElement, {
          size: 24,
          color: color,
        })}
      </View>
      <Text style={styles.statValue}>{value.toLocaleString()}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  /** ——— Your existing JobCard (unchanged visuals), now accepts onPress ——— */
  const JobCard = ({
    job,
    onPress,
  }: {
    job: DashboardJob;
    onPress?: (job: DashboardJob) => void;
  }) => (
    <TouchableOpacity style={styles.jobCard} onPress={() => onPress?.(job)}>
      <View style={styles.jobHeader}>
        <View style={styles.jobInfo}>
          <Text style={styles.jobTitle}>{job.title}</Text>
          <Text style={styles.jobLocation}>{job.location}</Text>
          <Text style={styles.jobPosted}>Posted {job.postedDays} days ago</Text>
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
              {
                color:
                  job.status === 'active'
                    ? colors.primaryForeground
                    : colors.mutedForeground,
              },
            ]}
          >
            {job.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.jobStats}>
        <View style={styles.jobStat}>
          <Text style={styles.jobStatValue}>{job.applicants}</Text>
          <Text style={styles.jobStatLabel}>Applicants</Text>
        </View>
        <View style={styles.jobStat}>
          <Text style={styles.jobStatValue}>{job.matches}</Text>
          <Text style={styles.jobStatLabel}>Matches</Text>
        </View>
      </View>

      <ChevronRightIcon size={20} color={colors.mutedForeground} />
    </TouchableOpacity>
  );

  /** ——— Candidate card unchanged ——— */
  const CandidateCard = ({
    candidate,
  }: {
    candidate: (typeof staticTopCandidates)[0];
  }) => (
    <TouchableOpacity style={styles.candidateCard}>
      <Image source={{ uri: candidate.avatar }} style={styles.candidateAvatar} />
      <View style={styles.candidateInfo}>
        <Text style={styles.candidateName}>{candidate.name}</Text>
        <Text style={styles.candidateTitle}>{candidate.title}</Text>
        <Text style={styles.candidateLocation}>{candidate.location}</Text>

        <View style={styles.candidateSkills}>
          {candidate.skills.slice(0, 2).map((skill) => (
            <View key={skill} style={styles.skillBadge}>
              <Text style={styles.skillText}>{skill}</Text>
            </View>
          ))}
          {candidate.skills.length > 2 && (
            <Text style={styles.moreSkills}>+{candidate.skills.length - 2}</Text>
          )}
        </View>
      </View>

      <View style={styles.matchScore}>
        <Text style={styles.matchScoreValue}>{candidate.matchScore}%</Text>
        <Text style={styles.matchScoreLabel}>Match</Text>
      </View>
    </TouchableOpacity>
  );

  const TabButton = ({ tab, title }: { tab: string; title: string }) => (
    <TouchableOpacity
      style={[styles.tabButton, selectedTab === tab && styles.tabButtonActive]}
      onPress={() => setSelectedTab(tab as any)}
    >
      <Text style={[styles.tabText, selectedTab === tab && styles.tabTextActive]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  /** ——— Render helpers for Overview & Jobs lists ——— */
  const renderRecentJobs = () => {
    if (isLoading && jobs.length === 0) {
      return <Text style={styles.jobLocation}>Loading jobs…</Text>;
    }
    if (error && jobs.length === 0) {
      return <Text style={styles.jobLocation}>Error: {error}</Text>;
    }
    return jobs.slice(0, 2).map((job) => (
      <JobCard key={job.id} job={job} onPress={(j) => openDetails(j.id)} />
    ));
  };

  const renderAllJobs = () => {
    if (isLoading && jobs.length === 0) {
      return <Text style={styles.jobLocation}>Loading jobs…</Text>;
    }
    if (error && jobs.length === 0) {
      return <Text style={styles.jobLocation}>Error: {error}</Text>;
    }
    if (jobs.length === 0) {
      return <Text style={styles.jobLocation}>No jobs yet.</Text>;
    }
    return jobs.map((job) => (
      <JobCard key={job.id} job={job} onPress={(j) => openDetails(j.id)} />
    ));
  };

  /** ——— Main render ——— */
  const renderContent = () => {
    switch (selectedTab) {
      case 'overview':
        return (
          <>
            {/* Stats overview */}
            <View style={styles.statsContainer}>
              <StatCard icon={<EyeIcon />} value={staticStats.totalViews} label="Total Views" color="#3b82f6" />
              <StatCard icon={<HeartIcon />} value={staticStats.totalLikes} label="Total Likes" color="#ef4444" />
              <StatCard icon={<UserIcon />} value={staticStats.totalMatches} label="Matches" color="#10b981" />
              <StatCard icon={<BriefcaseIcon />} value={activeCount} label="Active Jobs" color="#f59e0b" />
            </View>

            {/* Recent activity */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Jobs</Text>
                <TouchableOpacity onPress={() => setSelectedTab('jobs')}>
                  <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
              </View>
              {renderRecentJobs()}
            </View>

            {/* Top candidates */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Top Candidates</Text>
                <TouchableOpacity onPress={() => setSelectedTab('candidates')}>
                  <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
              </View>
              {staticTopCandidates.map((candidate) => (
                <CandidateCard key={candidate.id} candidate={candidate} />
              ))}
            </View>
          </>
        );

      case 'jobs':
        return (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>All Job Postings</Text>
              <TouchableOpacity style={styles.addButton}>
                <PlusIcon size={20} color={colors.primaryForeground} />
              </TouchableOpacity>
            </View>
            {renderAllJobs()}
          </View>
        );

      case 'candidates':
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>All Candidates</Text>
            {staticTopCandidates.map((candidate) => (
              <CandidateCard key={candidate.id} candidate={candidate} />
            ))}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* Tab navigation */}
      <View style={styles.tabContainer}>
        <TabButton tab="overview" title="Overview" />
        <TabButton tab="jobs" title="Jobs" />
        <TabButton tab="candidates" title="Candidates" />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {renderContent()}
      </ScrollView>

      {/* Details Modal that reuses the FULL JobCard component */}
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
              <Pressable onPress={closeDetails} hitSlop={10}>
                <Text style={modalStyles.closeText}>Close</Text>
              </Pressable>
            </View>

            {/* Give the card real layout space inside the modal */}
            <View style={modalStyles.cardBody}>
              {(() => {
                const full = rawJobs.find((j) => j.id === selectedJobId);
                if (!full) {
                  return (
                    <Text style={{ color: colors.mutedForeground }}>
                      Couldn’t find that job.
                    </Text>
                  );
                }
                return <FullJobCard job={full} />;
              })()}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

/** ——— Your original styles unchanged ——— */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.muted,
    margin: spacing.md,
    borderRadius: borderRadius.lg,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: colors.background,
    ...shadows.sm,
  },
  tabText: {
    fontSize: fontSizes.base,
    color: colors.mutedForeground,
    fontWeight: fontWeights.medium,
  },
  tabTextActive: {
    color: colors.foreground,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  statCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    width: (screenWidth - spacing.md * 2 - spacing.sm) / 2,
    ...shadows.sm,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colors.foreground,
  },
  statLabel: {
    fontSize: fontSizes.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    color: colors.foreground,
  },
  viewAllText: {
    fontSize: fontSizes.base,
    color: colors.primary,
    fontWeight: fontWeights.medium,
  },
  addButton: {
    backgroundColor: colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  jobCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadows.sm,
  },
  jobHeader: {
    flex: 1,
  },
  jobInfo: {
    marginBottom: spacing.sm,
  },
  jobTitle: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.foreground,
  },
  jobLocation: {
    fontSize: fontSizes.sm,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  jobPosted: {
    fontSize: fontSizes.xs,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.sm,
    position: 'absolute',
    top: 0,
    right: 0,
  },
  statusText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
  },
  jobStats: {
    flexDirection: 'row',
    gap: spacing.md,
    marginRight: spacing.md,
  },
  jobStat: {
    alignItems: 'center',
  },
  jobStatValue: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.foreground,
  },
  jobStatLabel: {
    fontSize: fontSizes.xs,
    color: colors.mutedForeground,
  },
  candidateCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadows.sm,
  },
  candidateAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: spacing.sm,
  },
  candidateInfo: {
    flex: 1,
  },
  candidateName: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.foreground,
  },
  candidateTitle: {
    fontSize: fontSizes.sm,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  candidateLocation: {
    fontSize: fontSizes.xs,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  candidateSkills: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  skillBadge: {
    backgroundColor: colors.muted,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  skillText: {
    fontSize: fontSizes.xs,
    color: colors.foreground,
  },
  moreSkills: {
    fontSize: fontSizes.xs,
    color: colors.mutedForeground,
  },
  matchScore: {
    alignItems: 'center',
  },
  matchScoreValue: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.primary,
  },
  matchScoreLabel: {
    fontSize: fontSizes.xs,
    color: colors.mutedForeground,
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
  headerTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    color: colors.foreground,
  },
  closeText: {
    fontSize: fontSizes.base,
    color: colors.primary,
    fontWeight: fontWeights.medium,
  },
  cardBody: {
    alignSelf: 'stretch',
    height: Math.floor(screenHeight * 0.6),
  },
});

export default EmployerDashboard;
