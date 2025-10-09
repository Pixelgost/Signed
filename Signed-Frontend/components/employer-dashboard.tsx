import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Modal,
} from "react-native";
import {
  PlusIcon,
  EyeIcon,
  HeartIcon,
  UserIcon,
  BriefcaseIcon,
  ChevronRightIcon,
} from "./icons";
import {
  colors,
  spacing,
  fontSizes,
  fontWeights,
  borderRadius,
  shadows,
} from "../styles/colors";
import CreateJobPosting from "./create-job-posting";
import EditJobPosting from "./edit-job-posting";

interface EmployerDashboardProps {
  userId: string;
}

const { width: screenWidth } = Dimensions.get("window");

const dashboardData = {
  stats: {
    totalViews: 1247,
    totalLikes: 89,
    totalMatches: 23,
    activeJobs: 4,
  },
  recentJobs: [
    {
      id: "1",
      title: "Frontend Developer Intern",
      location: "San Francisco, CA",
      applicants: 34,
      matches: 8,
      status: "active",
      postedDays: 3,
    },
    {
      id: "2",
      title: "UX Designer",
      location: "Remote",
      applicants: 67,
      matches: 12,
      status: "active",
      postedDays: 7,
    },
    {
      id: "3",
      title: "Product Manager",
      location: "Austin, TX",
      applicants: 89,
      matches: 3,
      status: "paused",
      postedDays: 14,
    },
  ],
  topCandidates: [
    {
      id: "1",
      name: "Sarah Chen",
      title: "Frontend Developer",
      location: "San Francisco, CA",
      matchScore: 95,
      avatar:
        "https://images.unsplash.com/photo-1739298061757-7a3339cee982?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx8cHJvZmVzc2lvbmFsJTIwYnVzaW5lc3MlMjB0ZWFtfGVufDF8fHx8MTc1NzQ3MTQ1MXww&ixlib=rb-4.1.0&q=80&w=1080",
      skills: ["React", "TypeScript", "CSS"],
    },
    {
      id: "2",
      name: "Michael Rodriguez",
      title: "Full Stack Developer",
      location: "Austin, TX",
      matchScore: 88,
      avatar:
        "https://images.unsplash.com/photo-1739298061757-7a3339cee982?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx8cHJvZmVzc2lvbmFsJTIwYnVzaW5lc3MlMjB0ZWFtfGVufDF8fHx8MTc1NzQ3MTQ1MXww&ixlib=rb-4.1.0&q=80&w=1080",
      skills: ["Node.js", "Python", "React"],
    },
  ],
};

export const EmployerDashboard = ({ userId }: EmployerDashboardProps) => {
  const [selectedTab, setSelectedTab] = useState<
    "overview" | "jobs" | "candidates"
  >("overview");

  const [showCreateJobPosting, setShowCreateJobPosting] =
    useState<boolean>(false);

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
      <View style={[styles.statIcon, { backgroundColor: color + "20" }]}>
        {React.cloneElement(icon as React.ReactElement, {
          size: 24,
          color: color,
        })}
      </View>
      <Text style={styles.statValue}>{value.toLocaleString()}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const JobCard = ({ job }: { job: (typeof dashboardData.recentJobs)[0] }) => (
    <TouchableOpacity style={styles.jobCard}>
      <View style={styles.jobHeader}>
        <View style={styles.jobInfo}>
          <Text style={styles.jobTitle}>{job.title}</Text>
          <Text style={styles.jobLocation}>{job.location}</Text>
          <Text style={styles.jobPosted}>Posted {job.postedDays} days ago</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                job.status === "active" ? colors.primary : colors.muted,
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              {
                color:
                  job.status === "active"
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

  const CandidateCard = ({
    candidate,
  }: {
    candidate: (typeof dashboardData.topCandidates)[0];
  }) => (
    <TouchableOpacity style={styles.candidateCard}>
      <Image
        source={{ uri: candidate.avatar }}
        style={styles.candidateAvatar}
      />
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
            <Text style={styles.moreSkills}>
              +{candidate.skills.length - 2}
            </Text>
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
      <Text
        style={[styles.tabText, selectedTab === tab && styles.tabTextActive]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );

  const renderContent = () => {
    switch (selectedTab) {
      case "overview":
        return (
          <>
            {/* Stats overview */}
            <View style={styles.statsContainer}>
              <StatCard
                icon={<EyeIcon />}
                value={dashboardData.stats.totalViews}
                label="Total Views"
                color="#3b82f6"
              />
              <StatCard
                icon={<HeartIcon />}
                value={dashboardData.stats.totalLikes}
                label="Total Likes"
                color="#ef4444"
              />
              <StatCard
                icon={<UserIcon />}
                value={dashboardData.stats.totalMatches}
                label="Matches"
                color="#10b981"
              />
              <StatCard
                icon={<BriefcaseIcon />}
                value={dashboardData.stats.activeJobs}
                label="Active Jobs"
                color="#f59e0b"
              />
            </View>

            {/* Recent activity */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Jobs</Text>
                <TouchableOpacity onPress={() => setSelectedTab("jobs")}>
                  <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
              </View>
              {dashboardData.recentJobs.slice(0, 2).map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </View>

            {/* Top candidates */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Top Candidates</Text>
                <TouchableOpacity onPress={() => setSelectedTab("candidates")}>
                  <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
              </View>
              {dashboardData.topCandidates.map((candidate) => (
                <CandidateCard key={candidate.id} candidate={candidate} />
              ))}
            </View>
          </>
        );

      case "jobs":
        return (
          <>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>All Job Postings</Text>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => setShowCreateJobPosting(true)}
                >
                  <PlusIcon size={20} color={colors.primaryForeground} />
                </TouchableOpacity>
              </View>

              {dashboardData.recentJobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </View>
            <Modal
              visible={showCreateJobPosting}
              animationType="slide"
              transparent={true}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <CreateJobPosting
                    userId={userId}
                    onCancel={() => {
                      setShowCreateJobPosting(false);
                    }}
                    onSuccessfulSubmit={() => {
                      setShowCreateJobPosting(false);
                    }}
                  />

                  {/* <EditJobPosting
                    userId={userId}
                    postId="1b91738c-1ced-4aeb-ae14-bbc196a3e052"
                    onSuccessfulSubmit={() => {
                      setShowCreateJobPosting(false);
                    }}
                  ></EditJobPosting> */}
                  
                </View>
              </View>
            </Modal>
          </>
        );

      case "candidates":
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>All Candidates</Text>
            {dashboardData.topCandidates.map((candidate) => (
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: colors.muted,
    margin: spacing.md,
    borderRadius: borderRadius.lg,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: "center",
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
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  statCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: "center",
    width: (screenWidth - spacing.md * 2 - spacing.sm) / 2,
    ...shadows.sm,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
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
    textAlign: "center",
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
    justifyContent: "center",
    alignItems: "center",
    ...shadows.md,
  },
  jobCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
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
    position: "absolute",
    top: 0,
    right: 0,
  },
  statusText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
  },
  jobStats: {
    flexDirection: "row",
    gap: spacing.md,
    marginRight: spacing.md,
  },
  jobStat: {
    alignItems: "center",
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
    flexDirection: "row",
    alignItems: "center",
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
    flexDirection: "row",
    alignItems: "center",
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
    alignItems: "center",
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
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 16,
    // padding: 20,
    flex: 1,
  },
  closeButton: {
    marginTop: 16,
    alignSelf: "center",
  },
  closeText: {
    color: colors.primary,
    fontWeight: "bold",
  },
});
