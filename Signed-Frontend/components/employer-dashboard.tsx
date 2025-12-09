import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Modal,
  Pressable,
  RefreshControl,
  TextInput,
} from 'react-native';
import {
  PlusIcon,
  EyeIcon,
  HeartIcon,
  UserIcon,
  BriefcaseIcon,
  ChevronRightIcon,
  SearchIcon,
} from './icons';
import { colors, spacing, fontSizes, fontWeights, borderRadius, shadows } from '../styles/colors';
import axios from 'axios';
import Constants from 'expo-constants';
import { JobCard as FullJobCard } from './job-card';
import CreateJobPosting from './create-job-posting';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

function daysSince(iso?: string): number {
  if (!iso) return 0;
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const d = Math.floor(diff / (1000 * 60 * 60 * 24));
  return Math.max(d, 0);
}

function toDashboard(items: APIJobPosting[]): DashboardJob[] {
  return items.map((jp) => ({
    id: jp.id,
    title: jp.job_title,
    location: jp.location || '—',
    status: jp.is_active ? 'active' : 'paused',
    postedDays: daysSince(jp.date_posted),
    applicants: 0,
    matches: 0,
  }));
}

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

type Props = {
  userId: string;        // for CreateJobPosting
  userEmail: string;     // personal filter
};

type DateFilter = 'all' | 'day' | 'week' | 'month';

export const useDebouncedValue = <T,>(value: T, delay = 300) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
};

export const EmployerDashboard = ({ userId, userEmail }: Props) => {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'jobs' | 'candidates'>('overview');
  const [companyName, setCompanyName] = useState<string>("");

  // My jobs & company jobs
  const [myJobs, setMyJobs] = useState<APIJobPosting[]>([]);
  const [companyJobs, setCompanyJobs] = useState<APIJobPosting[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // For modal/details
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  // Create modal
  const [showCreateJobPosting, setShowCreateJobPosting] = useState(false);

  // For refresh
  const [refreshing, setRefreshing] = useState(false);

  // For filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const debouncedQ = useDebouncedValue(searchQuery, 300);

  function dedupeAndSort(items: APIJobPosting[]) {
    const map = new Map<string, APIJobPosting>();
    for (const it of items) map.set(it.id, it);
    return Array.from(map.values()).sort((a, b) => {
      const aT = a.date_posted ? new Date(a.date_posted).getTime() : 0;
      const bT = b.date_posted ? new Date(b.date_posted).getTime() : 0;
      return bT - aT;
    });
  }

  async function fetchPaged(base: string, filtersObj: Record<string, any>) {
    const filters = encodeURIComponent(JSON.stringify(filtersObj));
    let page = 1;
    let hasNext = true;
    const acc: APIJobPosting[] = [];
    while (hasNext) {
      const url = `${base}?page=${page}&fetch_inactive=True&filters=${filters}`;
      console.log(url);
      const { data } = await axios.get(url);
      const items: APIJobPosting[] = data?.job_postings ?? [];
      const next: boolean = !!data?.pagination?.has_next;
      acc.push(...items);
      hasNext = next;
      page += 1;
    }
    return acc;
  }

  const fetchCompanyData = async (isRefresh: boolean = false) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      console.log(token);
      if (!token) {
        return;
      }
      if (isRefresh) {
        setRefreshing(true);
      }
      console.log(`http://${machineIp}:8000/api/v1/users/auth/get-company/`);
      const response = await axios.get(
        `http://${machineIp}:8000/api/v1/users/auth/get-company/`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log(response.data);

      if (response.data.status === "success") {
        const data = response.data.data;
        setCompanyName(data.company_name || "");
      }
    } catch (error: any) {
      console.log("Failed to fetch company data:", error?.response?.data || error.message);
    }
    finally {
      if (isRefresh) {
        setRefreshing(false);
      }
    }
  };

  async function fetchAll() {
    try {
      setIsLoading(true);
      setError(null);
      const base = `http://${machineIp}:8000/api/v1/users/get-job-postings/`;

      const cleanEmail = (userEmail || '').trim().replace(/^["']|["']$/g, '');
      const cleanCompany = (companyName || '').trim();
      console.log(cleanCompany);

      const [mine, company] = await Promise.all([
        cleanEmail ? fetchPaged(base, { user_email: cleanEmail }) : Promise.resolve([]),
        cleanCompany ? fetchPaged(base, { user_company: cleanCompany }) : Promise.resolve([]),
      ]);

      setMyJobs(dedupeAndSort(mine));
      setCompanyJobs(dedupeAndSort(company));
    } catch (e: any) {
      setError(e?.message ?? 'Failed to fetch jobs');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchCompanyData();
  }, []);

  useEffect(() => {
    if (!companyName && !userEmail) return;
    fetchAll();
  }, [companyName, userEmail]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCompanyData(true);
    await fetchAll();
    setRefreshing(false);
  };

  // union for overview & details
  const allJobs = dedupeAndSort([...myJobs, ...companyJobs]);
  const dashboardJobs = toDashboard(allJobs);
  const norm = (s?: string | null) =>
  (s ?? "").toLowerCase().normalize("NFKD");

  const filteredJobs = React.useMemo(() => {
    let filtered = allJobs;

    // Search filter
    const q = norm(debouncedQ);
    if (q) {
      filtered = filtered.filter((j) => {
        const haystack = [
          j.job_title,
          j.company,
          j.location,
          j.job_type,
          j.salary ?? "",
          j.company_size ?? "",
          (j.tags || []).join(" "),
          j.job_description ?? "",
        ]
          .map(norm)
          .join(" ");

        return haystack.includes(q);
      });
    }

    // Date filter
    if (dateFilter !== 'all') {
      filtered = filtered.filter((job) => {
        if (!job.date_posted) return false;

        const jobTime = new Date(job.date_posted).getTime();

        // Block invalid dates
        if (isNaN(jobTime)) return false;

        const now = Date.now();
        const diffDays = (now - jobTime) / 86400000;

        // Block FUTURE jobs from passing all filters
        if (diffDays < 0) return false;

        if (dateFilter === 'day') return diffDays <= 1;
        if (dateFilter === 'week') return diffDays <= 7;
        if (dateFilter === 'month') return diffDays <= 30;

        return true;
      });
    }

    // Status filter
    if (statusFilter === 'active') {
      filtered = filtered.filter((job) => job.is_active === true);
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter((job) => job.is_active === false);
    }

    // Tag filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter((job) =>
        job.tags?.some((t) =>
          selectedTags.some((sel) => norm(sel) === norm(t))
        )
      );
    }

    return filtered;
  }, [allJobs, debouncedQ, dateFilter, selectedTags]);

  const activeCount = dashboardJobs.filter((j) => j.status === 'active').length;

  function openDetails(jobId: string) {
    setSelectedJobId(jobId);
    setDetailsOpen(true);
  }
  function closeDetails() {
    setDetailsOpen(false);
    setSelectedJobId(null);
  }

  const allTags = React.useMemo(() => {
    const tagSet = new Set<string>();
    [...myJobs, ...companyJobs].forEach((job) => {
      if (job.tags?.length) {
        job.tags.forEach((t) => tagSet.add(t.trim()));
      }
    });
    return Array.from(tagSet).sort();
  }, [myJobs, companyJobs]);

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

  function formatDaysAgo(days: number) {
    return days === 1 ? '1 day ago' : `${days} days ago`;
  }

  const JobRow = ({
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
          <Text style={styles.jobPosted}>Posted {formatDaysAgo(job.postedDays)}</Text>
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
    candidate: (typeof staticTopCandidates)[0];
//     candidate: (typeof dashboardData.topCandidates)[0];
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

  const renderRecentJobs = () => {
    if (isLoading && dashboardJobs.length === 0) return <Text style={styles.jobLocation}>Loading jobs…</Text>;
    if (error && dashboardJobs.length === 0) return <Text style={styles.jobLocation}>Error: {error}</Text>;
    return dashboardJobs.slice(0, 2).map((job) => (
      <JobRow key={job.id} job={job} onPress={(j) => openDetails(j.id)} />
    ));
  };

  const renderSection = (title: string, list: APIJobPosting[]) => {
    const rows = toDashboard(
      filteredJobs.filter((j) =>
        list.some((orig) => orig.id === j.id)
      )
    );
    if (isLoading && rows.length === 0) return <Text style={styles.jobLocation}>Loading jobs…</Text>;
    if (error && rows.length === 0) return <Text style={styles.jobLocation}>Error: {error}</Text>;
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
       {rows.length === 0 && (
        <Text style={styles.jobLocation}>No jobs yet!</Text>
       )}
        {rows.map((job) => (
          <JobRow key={job.id} job={job} onPress={(j) => openDetails(j.id)} />
        ))}
      </View>
    );
  };

  const renderContent = () => {
    switch (selectedTab) {
      case "overview":
        return (
          <>
            <View style={styles.statsContainer}>
              <StatCard
                icon={<EyeIcon />}
                value={staticStats.totalViews}
                label="Total Views"
                color="#3b82f6"
              />
              <StatCard
                icon={<HeartIcon />}
                value={staticStats.totalLikes}
                label="Total Likes"
                color="#ef4444"
              />
              <StatCard
                icon={<UserIcon />}
                value={staticStats.totalMatches}
                label="Matches"
                color="#10b981"
              />
              <StatCard
                icon={<BriefcaseIcon />}
                value={activeCount}
                label="Active Jobs"
                color="#f59e0b"
              />
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Jobs</Text>
                <TouchableOpacity onPress={() => setSelectedTab("jobs")}>
                  <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
              </View>
              {renderRecentJobs()}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Top Candidates</Text>
                <TouchableOpacity onPress={() => setSelectedTab("candidates")}>
                  <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
              </View>
              {staticTopCandidates.map((c) => (
                <CandidateCard key={c.id} candidate={c} />
              ))}
            </View>
          </>
        );

      case "jobs":
        const hasAnyJobs = myJobs.length > 0 || companyJobs.length > 0;
        return (
          <>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>All Job Postings</Text>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                    onPress={() => setShowFilterModal(true)}
                  >
                    <SearchIcon size={20} color={colors.primary} />
                    <Text style={{ color: colors.primary, fontWeight: fontWeights.bold }}>
                      Filter
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setShowCreateJobPosting(true)}
                  >
                    <PlusIcon size={20} color={colors.primaryForeground} />
                  </TouchableOpacity>
                </View>
              </View>
              {!hasAnyJobs && (
                <Text style={styles.jobLocation}>No jobs yet!</Text>
              )}
            </View>

            {hasAnyJobs && renderSection('Your Job Postings', myJobs)}
            {hasAnyJobs && renderSection('Company Job Postings', companyJobs)}
            </>
          );

      case "candidates":
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

  const allForDetails = dedupeAndSort([...myJobs, ...companyJobs]);

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        <TabButton tab="overview" title="Overview" />
        <TabButton tab="jobs" title="Jobs" />
        <TabButton tab="candidates" title="Candidates" />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {renderContent()}
      </ScrollView>

      {/* Job details modal */}
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

            <View style={modalStyles.cardBody}>
              {(() => {
                const full = allForDetails.find((j) => j.id === selectedJobId);
                if (!full) {
                  return <Text style={{ color: colors.mutedForeground }}>Couldn't find that job.</Text>;
                }
                return <FullJobCard job={full} onToggleSuccess={fetchAll} userRole='employer' onEditJobPosting={fetchAll}/>;
              })()}
            </View>
          </View>
        </View>
      </Modal>

      {/* Create posting modal (refresh both lists on success) */}
      <Modal visible={showCreateJobPosting} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <CreateJobPosting
              userId={userId}
              onCancel={() => setShowCreateJobPosting(false)}
              onSuccessfulSubmit={async () => {
                setShowCreateJobPosting(false);
                await fetchAll();
                setSelectedTab('jobs');
              }}
            />
          </View>
        </View>
      </Modal>

      {/* FILTER MODAL */}
      <Modal
        transparent
        animationType="slide"
        visible={showFilterModal}
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={filterStyles.backdrop}>
          <View style={filterStyles.container}>
            {/* Header */}
            <View style={filterStyles.header}>
              <Text style={filterStyles.title}>Filter Jobs</Text>
              <Pressable onPress={() => setShowFilterModal(false)}>
                <Text style={filterStyles.done}>Done</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Search */}
              <View style={filterStyles.section}>
                <Text style={filterStyles.label}>Search</Text>
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Job title, skills, salary..."
                  placeholderTextColor={colors.mutedForeground}
                  style={filterStyles.input}
                />
              </View>

              {/* Date Filter */}
              <View style={filterStyles.section}>
                <Text style={filterStyles.label}>Date Posted</Text>
                <View style={filterStyles.row}>
                  {(['all', 'day', 'week', 'month'] as DateFilter[]).map((opt) => {
                    const labels: any = {
                      all: 'All',
                      day: '24h',
                      week: '7d',
                      month: '30d',
                    };
                    const active = dateFilter === opt;
                    return (
                      <TouchableOpacity
                        key={opt}
                        style={[
                          filterStyles.pill,
                          active && filterStyles.pillActive,
                        ]}
                        onPress={() => setDateFilter(opt)}
                      >
                        <Text
                          style={[
                            filterStyles.pillText,
                            active && filterStyles.pillTextActive,
                          ]}
                        >
                          {labels[opt]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Status Filter */}
              <View style={filterStyles.section}>
                <Text style={filterStyles.label}>Job Status</Text>
                <View style={filterStyles.row}>
                  {(['all', 'active', 'inactive'] as const).map((opt) => {
                    const labels: any = {
                      all: 'All',
                      active: 'Active',
                      inactive: 'Inactive',
                    };
                    const active = statusFilter === opt;
                    return (
                      <TouchableOpacity
                        key={opt}
                        style={[
                          filterStyles.pill,
                          active && filterStyles.pillActive,
                        ]}
                        onPress={() => setStatusFilter(opt)}
                      >
                        <Text
                          style={[
                            filterStyles.pillText,
                            active && filterStyles.pillTextActive,
                          ]}
                        >
                          {labels[opt]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Tags */}
              <View style={filterStyles.section}>
                <Text style={filterStyles.label}>Skills / Tags</Text>

                {allTags.length === 0 ? (
                  <Text style={{ color: colors.mutedForeground }}>No tags available</Text>
                ) : (
                  <View style={filterStyles.row}>
                    {allTags.map((tag) => {
                      const active = selectedTags.includes(tag);
                      return (
                        <TouchableOpacity
                          key={tag}
                          style={[
                            filterStyles.tag,
                            active && filterStyles.tagActive,
                          ]}
                          onPress={() => {
                            if (active) {
                              setSelectedTags(selectedTags.filter((t) => t !== tag));
                            } else {
                              setSelectedTags([...selectedTags, tag]);
                            }
                          }}
                        >
                          <Text
                            style={[
                              filterStyles.tagText,
                              active && filterStyles.tagTextActive,
                            ]}
                          >
                            {tag}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* Clear */}
              {(dateFilter !== 'all' || statusFilter !== 'all' || selectedTags.length > 0 || searchQuery) && (
                <TouchableOpacity
                  style={filterStyles.clearButton}
                  onPress={() => {
                    setSearchQuery('');
                    setDateFilter('all');
                    setSelectedTags([]);
                    setStatusFilter('all');
                  }}
                >
                  <Text style={filterStyles.clearText}>Clear All Filters</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

/** ——— Styles ——— */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
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
  tabButtonActive: { backgroundColor: colors.background, ...shadows.sm },
  tabText: {
    fontSize: fontSizes.base,
    color: colors.mutedForeground,
    fontWeight: fontWeights.medium,
  },
  tabTextActive: { color: colors.foreground },
  content: { flex: 1 },
  contentContainer: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
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
  sectionTitle: { fontSize: fontSizes.lg, fontWeight: fontWeights.semibold, color: colors.foreground },
  viewAllText: { fontSize: fontSizes.base, color: colors.primary, fontWeight: fontWeights.medium },
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    // gap: spacing.sm 
  },
  jobInfo: { flex: 1, marginBottom: spacing.sm, paddingRight: spacing.xs },
  jobTitle: { fontSize: fontSizes.base, fontWeight: fontWeights.semibold, color: colors.foreground, flexShrink: 1 },
  jobLocation: { fontSize: fontSizes.sm, color: colors.mutedForeground, marginTop: 2 },
  jobPosted: {
    fontSize: fontSizes.xs,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginRight: spacing.md,
    // position: "absolute",
    // top: 0,
    // right: 0,
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
  candidateAvatar: { width: 60, height: 60, borderRadius: 30, marginRight: spacing.sm },
  candidateInfo: { flex: 1 },
  candidateName: { fontSize: fontSizes.base, fontWeight: fontWeights.semibold, color: colors.foreground },
  candidateTitle: { fontSize: fontSizes.sm, color: colors.mutedForeground, marginTop: 2 },
  candidateLocation: { fontSize: fontSizes.xs, color: colors.mutedForeground, marginTop: 2 },
  candidateSkills: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs, gap: spacing.xs },
  skillBadge: { backgroundColor: colors.muted, paddingHorizontal: spacing.xs, paddingVertical: 2, borderRadius: borderRadius.sm },
  skillText: { fontSize: fontSizes.xs, color: colors.foreground },
  moreSkills: { fontSize: fontSizes.xs, color: colors.mutedForeground },
  matchScore: { alignItems: 'center' },
  matchScoreValue: { fontSize: fontSizes.lg, fontWeight: fontWeights.bold, color: colors.primary },
  matchScoreLabel: { fontSize: fontSizes.xs, color: colors.mutedForeground },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: 'white', borderRadius: 16, flex: 1 },
});

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
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
  headerTitle: { fontSize: fontSizes.lg, fontWeight: fontWeights.semibold, color: colors.foreground },
  closeText: { fontSize: fontSizes.base, color: colors.primary, fontWeight: fontWeights.medium },
  cardBody: { alignSelf: 'stretch', height: Math.floor(screenHeight * 0.6) },
});

const filterStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.card,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colors.foreground,
  },
  done: {
    fontSize: fontSizes.base,
    color: colors.primary,
    fontWeight: fontWeights.bold,
  },
  section: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    marginBottom: spacing.xs,
    color: colors.foreground,
  },
  input: {
    backgroundColor: colors.inputBackground,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSizes.base,
    color: colors.foreground,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pill: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
  },
  pillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillText: {
    color: colors.foreground,
    fontSize: fontSizes.sm,
  },
  pillTextActive: {
    color: colors.primaryForeground,
  },
  tag: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tagText: {
    fontSize: fontSizes.sm,
    color: colors.foreground,
  },
  tagTextActive: {
    color: colors.primaryForeground,
  },
  clearButton: {
    backgroundColor: colors.muted,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  clearText: {
    fontWeight: fontWeights.semibold,
    color: colors.foreground,
  },
});

export default EmployerDashboard;
