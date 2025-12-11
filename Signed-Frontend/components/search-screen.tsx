import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Constants from "expo-constants";
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  RefreshControl
} from 'react-native';
import { borderRadius, getColors, fontSizes, fontWeights, shadows, spacing } from '../styles/colors';
import { useTheme } from '../contexts/ThemeContext';
import { ClockIcon, DollarSignIcon, FilterIcon, MapPinIcon, SearchIcon } from './icons';
import { Job as FullJob, JobCard } from './job-card';


const machineIp = Constants.expoConfig?.extra?.MACHINE_IP;
const { height: screenHeight } = Dimensions.get('window');
const extractJobId = (j: any) =>
  String(j?.id ?? j?.post_id ?? j?.uuid ?? j?.job_posting_id ?? j?.pk ?? "");

type Job = {
  id: string;
  job_title: string;
  company: string;
  location: string;
  job_type: string;
  salary?: string | null;
  company_size?: string | null;
  tags?: string[];
  job_description?: string | null;
  company_logo?: { download_link: string } | null;
  date_posted?: string;
  company_id: string;
  is_following_company?: boolean;
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

export const SearchScreen = () => {
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQ = useDebouncedValue(searchQuery, 300);

  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedJob, setSelectedJob] = useState<FullJob | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Filter state
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Follow
  const [followMap, setFollowMap] = useState<Record<string, boolean>>({});

  // Refresh
  const [refreshing, setRefreshing] = useState(false);

  // 2a) Fetch all pages into cache once
  useEffect(() => {
    let cancelled = false;
    if (!currentUserId) return;

    const fetchAll = async () => {
      try {
        setLoading(true);
        const collected: Job[] = [];
        let page = 1;
        while (true) {
          const url = `http://${machineIp}:8000/api/v1/users/get-job-postings/?page=${page}&user_uid=${currentUserId}`;
          const { data } = await axios.get(url);
          const pageJobs: Job[] = data.job_postings || [];
          collected.push(...pageJobs);
          if (!data.pagination?.has_next) break;
          page += 1;
        }
        if (!cancelled) {
          setAllJobs(collected);
          const map: Record<string, boolean> = {};
          collected.forEach((job) => {
            if (job.company_id) {
              map[job.company_id] = !!job.is_following_company;
            }
          });
          setFollowMap(map);
        }
      } catch (e) {
        console.error("Search fetch error:", e);
        if (!cancelled) setAllJobs([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchAll();
    return () => { cancelled = true; };
  }, [currentUserId]);
  
  //for getting current user for like feature-remove if pmo
  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (!token) return;
        const { data } = await axios.get(`http://${machineIp}:8000/api/v1/users/auth/me/`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (data?.id) setCurrentUserId(String(data.id));
      } catch (e) {
        console.error("Failed to load current user id (search-screen):", e);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem("userToken");
        if (!token) return;

        const { data } = await axios.get(
          `http://${machineIp}:8000/api/v1/users/company/get-following-companies/`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const map: Record<string, boolean> = {};
        (data.companies || []).forEach((c: any) => {
          map[c.id] = true;
        });

        setFollowMap(map);

      } catch (err) {
        console.error("Failed fetching followed companies:", err);
      }
    })();
  }, []);

  // 2b) (Optional) button to fetch again later if needed
  const refetch = async () => {
    if (!currentUserId) return;
    setLoadingMore(true);
    try {
      const collected: Job[] = [];
      let page = 1;
      while (true) {
        const url = `http://${machineIp}:8000/api/v1/users/get-job-postings/?page=${page}&user_uid=${currentUserId}`;
        const { data } = await axios.get(url);
        collected.push(...(data.job_postings || []));
        if (!data.pagination?.has_next) break;
        page += 1;
      }
      setAllJobs(collected);
      const newFollowMap: Record<string, boolean> = {};
      collected.forEach((job) => {
        if (job.company_id) {
          newFollowMap[job.company_id] = !!job.is_following_company;
        }
      });
      setFollowMap(newFollowMap);
    } finally {
      setLoadingMore(false);
    }
  };

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await refetch();   // reuse your existing pagination fetch
    } finally {
      setRefreshing(false);
    }
  };

  // Extract all unique tags from jobs
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    allJobs.forEach((job) => {
      if (job.tags && Array.isArray(job.tags)) {
        job.tags.forEach((tag) => {
          if (tag && typeof tag === 'string' && tag.trim()) {
            tagSet.add(tag.trim());
          }
        });
      }
    });
    return Array.from(tagSet).sort();
  }, [allJobs]);

  // 2c) Simple normalize helper
  const norm = (s?: string | null) =>
    (s ?? "").toLowerCase().normalize("NFKD");


  // 2d) Filter across title, company, tags, location, description, date, and tags
  const filteredJobs = useMemo(() => {
    let filtered = allJobs;

    // Apply search query filter
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

    // Apply date filter
    if (dateFilter !== 'all') {
      filtered = filtered.filter((job) => {
        if (!job.date_posted) return false;
        const jobDate = new Date(job.date_posted);
        const now = new Date();
        const diffMs = now.getTime() - jobDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        switch (dateFilter) {
          case 'day':
            return diffDays <= 1;
          case 'week':
            return diffDays <= 7;
          case 'month':
            return diffDays <= 30;
          default:
            return true;
        }
      });
    }

    // Apply tag filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter((job) => {
        if (!job.tags || !Array.isArray(job.tags)) return false;
        // Job must have at least one of the selected tags
        return selectedTags.some((selectedTag) =>
          job.tags!.some((jobTag) => norm(jobTag) === norm(selectedTag))
        );
      });
    }

    return filtered;
  }, [allJobs, debouncedQ, dateFilter, selectedTags]);

  const renderSkillBadge = (skill: string) => (
    <View key={skill} style={styles.skillBadge}>
      <Text style={styles.skillText}>{skill}</Text>
    </View>
  );

  const onPressJob = (job: Job) => {
    const normalized: FullJob = {
      id: extractJobId(job),
      job_title: job.job_title,
      company: job.company,
      location: job.location,
      salary: job.salary ?? "",
      job_type: job.job_type,
      job_description: job.job_description ?? "",
      tags: Array.isArray(job.tags) ? job.tags : [],
      company_logo: job.company_logo ? {
        file_name: 'logo',
        file_type: 'image/png',
        file_size: 0,
        download_link: job.company_logo.download_link,
      } : null,
      media_items: Array.isArray((job as any).media_items) ? (job as any).media_items : [],
      company_size: job.company_size ?? "",
      date_posted: (job as any).date_posted ?? new Date().toISOString(),
      date_updated: (job as any).date_updated ?? new Date().toISOString(),
      is_active: (job as any).is_active ?? true,
      company_id: job.company_id,
      is_following_company: job.is_following_company,
    };
  
    setSelectedJob(normalized);
    setShowModal(true);
  };

  const toggleFollowCompany = async (companyId: string) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const { data } = await axios.post(
        `http://${machineIp}:8000/api/v1/users/company/follow-toggle/`,
        { company_id: companyId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data?.status === "success") {
        setFollowMap((prev) => ({
          ...prev,
          [companyId]: data.is_following_company,
        }));
        setAllJobs((prev) => prev.map((job) =>
          job.company_id === companyId ? { ...job, is_following_company: data.is_following_company } : job));
      }
    } catch (err) {
      console.error("Follow toggle failed:", err);
    }
  };

  const jobWithLiveFollowState = selectedJob ? {
    ...selectedJob,
    is_following_company: followMap[selectedJob.company_id],
  } : null;

  const handleRefreshButton = async () => {
    if (loadingMore || loading) return;
    await refetch();
  };

  const renderJobCard = ({ item: job }: { item: Job }) => (
    <TouchableOpacity key={job.id} style={styles.jobCard} onPress={() => onPressJob(job)}>
      <View style={styles.jobHeader}>
        <Image
          source={{ uri: job.company_logo?.download_link ?? "https://images.unsplash.com/photo-1657885428127-38a40be4e232?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx8Y29tcGFueSUyMGxvZ28lMjBkZXNpZ258ZW58MXx8fHwxNzU3NDM3NTQ1fDA&ixlib=rb-4.1.0&q=80&w=1080" }}
          style={styles.companyLogo}
        />
        <View style={styles.jobTitleSection}>
          <Text style={styles.jobTitle}>{job.job_title}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.companyName}>{job.company}</Text>
            {job.company_id && (
              <TouchableOpacity
                onPress={() => toggleFollowCompany(job.company_id)}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 12,
                  backgroundColor: followMap[job.company_id]
                    ? colors.muted
                    : colors.primary,
                }}
              >
                <Text style={{
                  color: followMap[job.company_id]
                    ? colors.foreground
                    : colors.primaryForeground,
                  fontSize: 12,
                  fontWeight: '600'
                }}>
                  {followMap[job.company_id] ? "Following ✓" : "Follow"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
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
            <Text style={styles.detailText}>{job.job_type}</Text>
          </View>
          <View style={styles.detailRow}>
            <DollarSignIcon size={16} color={colors.mutedForeground} />
            <Text style={styles.detailText}>{job.salary ?? "—"}</Text>
          </View>
        </View>
      </View>

      {!!job.tags?.length && (
        <View style={styles.skillsContainer}>
          {job.tags!.map(renderSkillBadge)}
        </View>
      )}
    </TouchableOpacity>
  );

  const styles = createStyles(colors);
  const modalStyles = createModalStyles(colors);
  const filterModalStyles = createFilterModalStyles(colors);

  if (loading) {
    return (
      <View style={[styles.container, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 8, color: colors.mutedForeground }}>Loading jobs…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.refreshButton,
          (loading || loadingMore) && styles.refreshButtonDisabled
        ]}
        onPress={handleRefreshButton}
        disabled={loading || loadingMore}
        activeOpacity={0.7}
      >
        <RefreshIcon size={18} color={colors.foreground} />
      </TouchableOpacity>
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
              returnKeyType='search'
            />
          </View>
          <TouchableOpacity 
            style={[
              styles.filterButton,
              (dateFilter !== 'all' || selectedTags.length > 0) && styles.filterButtonActive
            ]} 
            onPress={() => setShowFilterModal(true)}
          >
            <FilterIcon 
              size={20} 
              color={(dateFilter !== 'all' || selectedTags.length > 0) ? colors.primary : colors.foreground} 
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.resultsCount}>
          {`${filteredJobs.length} opportunit${filteredJobs.length === 1 ? "y" : "ies"} found`}
        </Text>

        <FlatList
          data={filteredJobs}
          keyExtractor={(j) => j.id}
          renderItem={renderJobCard}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: spacing.lg, flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateText}>
                Couldn't find any jobs matching your search.
              </Text>
            </View>
          }
        />

        <Modal
          transparent
          statusBarTranslucent
          presentationStyle="overFullScreen"
          animationType="fade"
          visible={showModal}
          onRequestClose={() => setShowModal(false)}
        >
          <View style={modalStyles.backdrop}>
            <View style={modalStyles.cardWrapper}>
              <View style={modalStyles.headerRow}>
                <Text style={modalStyles.headerTitle}>Job Details</Text>
                <Pressable onPress={() => setShowModal(false)} hitSlop={10}>
                  <Text style={modalStyles.closeText}>Close</Text>
                </Pressable>
              </View>

              <View style={modalStyles.cardBody}>
                {selectedJob && jobWithLiveFollowState ? (
                  <View style={modalStyles.jobCardClamp}>
                    <JobCard
                      job={jobWithLiveFollowState}
                      userRole="applicant"
                      onEditJobPosting={() => {}}
                      onToggleSuccess={() => {}}
                      currentUserId={currentUserId ?? undefined}
                      onFollowCompany={toggleFollowCompany}
                    />
                  </View>
                ) : (
                  <Text style={{ color: colors.mutedForeground }}>Couldn’t find that job.</Text>
                )}
              </View>
            </View>
          </View>
        </Modal>

        {loadingMore && (
          <ActivityIndicator style={{ marginVertical: spacing.md }} color={colors.mutedForeground} />
        )}
      </View>

      {/* Filter Modal */}
      <Modal
        transparent
        visible={showFilterModal}
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={filterModalStyles.backdrop}>
          <View style={filterModalStyles.container}>
            <View style={filterModalStyles.header}>
              <Text style={filterModalStyles.headerTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Text style={filterModalStyles.closeButton}>Done</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={filterModalStyles.content} showsVerticalScrollIndicator={false}>
              {/* Date Filter Section */}
              <View style={filterModalStyles.section}>
                <Text style={filterModalStyles.sectionTitle}>Date Posted</Text>
                <View style={filterModalStyles.optionsContainer}>
                  {(['all', 'day', 'week', 'month'] as DateFilter[]).map((option) => {
                    const labels = {
                      all: 'All Time',
                      day: 'Last Day',
                      week: 'Last Week',
                      month: 'Last Month',
                    };
                    const isSelected = dateFilter === option;
                    return (
                      <TouchableOpacity
                        key={option}
                        style={[
                          filterModalStyles.optionButton,
                          isSelected && filterModalStyles.optionButtonSelected,
                        ]}
                        onPress={() => setDateFilter(option)}
                      >
                        <Text
                          style={[
                            filterModalStyles.optionText,
                            isSelected && filterModalStyles.optionTextSelected,
                          ]}
                        >
                          {labels[option]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Tags Filter Section */}
              <View style={filterModalStyles.section}>
                <Text style={filterModalStyles.sectionTitle}>Tags / Categories</Text>
                <Text style={filterModalStyles.sectionSubtitle}>
                  Select one or more tags to filter jobs
                </Text>
                {allTags.length === 0 ? (
                  <Text style={filterModalStyles.emptyText}>No tags available</Text>
                ) : (
                  <View style={filterModalStyles.tagsContainer}>
                    {allTags.map((tag) => {
                      const isSelected = selectedTags.includes(tag);
                      return (
                        <TouchableOpacity
                          key={tag}
                          style={[
                            filterModalStyles.tagButton,
                            isSelected && filterModalStyles.tagButtonSelected,
                          ]}
                          onPress={() => {
                            if (isSelected) {
                              setSelectedTags(selectedTags.filter((t) => t !== tag));
                            } else {
                              setSelectedTags([...selectedTags, tag]);
                            }
                          }}
                        >
                          <Text
                            style={[
                              filterModalStyles.tagText,
                              isSelected && filterModalStyles.tagTextSelected,
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

              {/* Clear Filters Button */}
              {(dateFilter !== 'all' || selectedTags.length > 0) && (
                <TouchableOpacity
                  style={filterModalStyles.clearButton}
                  onPress={() => {
                    setDateFilter('all');
                    setSelectedTags([]);
                  }}
                >
                  <Text style={filterModalStyles.clearButtonText}>Clear All Filters</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (colors: ReturnType<typeof getColors>) => StyleSheet.create({
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
  filterButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '15',
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
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  emptyStateText: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.mutedForeground,
    textAlign: 'center',
    maxWidth: '80%',
    lineHeight: 22,
  },
  refreshButton: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
  refreshButtonDisabled: {
    opacity: 0.5,
  },
});

const createModalStyles = (colors: ReturnType<typeof getColors>) => StyleSheet.create({
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
    ...shadows.lg,
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
  jobCardClamp: {
    flex: 1,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
});

const createFilterModalStyles = (colors: ReturnType<typeof getColors>) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.card,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '85%',
    ...shadows.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colors.foreground,
  },
  closeButton: {
    fontSize: fontSizes.base,
    color: colors.primary,
    fontWeight: fontWeights.semibold,
  },
  content: {
    padding: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: fontSizes.sm,
    color: colors.mutedForeground,
    marginBottom: spacing.md,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  optionButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  optionButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionText: {
    fontSize: fontSizes.base,
    color: colors.foreground,
    fontWeight: fontWeights.medium,
  },
  optionTextSelected: {
    color: colors.primaryForeground,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tagButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  tagButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tagText: {
    fontSize: fontSizes.sm,
    color: colors.foreground,
    fontWeight: fontWeights.medium,
  },
  tagTextSelected: {
    color: colors.primaryForeground,
  },
  emptyText: {
    fontSize: fontSizes.sm,
    color: colors.mutedForeground,
    fontStyle: 'italic',
    paddingVertical: spacing.md,
  },
  clearButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.muted,
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: fontSizes.base,
    color: colors.foreground,
    fontWeight: fontWeights.semibold,
  },
});