import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  FlatList,
  Modal,
  Dimensions,
  Pressable
} from 'react-native';
import axios from "axios";
import Constants from "expo-constants";
import { SearchIcon, FilterIcon, MapPinIcon, DollarSignIcon, ClockIcon } from './icons';
import { colors, spacing, fontSizes, fontWeights, borderRadius, shadows } from '../styles/colors';
import { JobCard, Job as FullJob } from './job-card';

const machineIp = Constants.expoConfig?.extra?.MACHINE_IP;
const { height: screenHeight } = Dimensions.get('window');

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
};

export const useDebouncedValue = <T,>(value: T, delay = 300) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
};

export const SearchScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQ = useDebouncedValue(searchQuery, 300);

  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedJob, setSelectedJob] = useState<FullJob | null>(null);
  const [showModal, setShowModal] = useState(false);

  // 2a) Fetch all pages into cache once
  useEffect(() => {
    let cancelled = false;

    const fetchAll = async () => {
      try {
        setLoading(true);
        const collected: Job[] = [];
        let page = 1;
        while (true) {
          const url = `http://${machineIp}:8000/api/v1/users/get-job-postings/?page=${page}`;
          const { data } = await axios.get(url);
          const pageJobs: Job[] = data.job_postings || [];
          collected.push(...pageJobs);
          if (!data.pagination?.has_next) break;
          page += 1;
        }
        if (!cancelled) setAllJobs(collected);
      } catch (e) {
        console.error("Search fetch error:", e);
        if (!cancelled) setAllJobs([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchAll();
    return () => { cancelled = true; };
  }, []);

  // 2b) (Optional) button to fetch again later if needed
  const refetch = async () => {
    setLoadingMore(true);
    try {
      const collected: Job[] = [];
      let page = 1;
      while (true) {
        const url = `http://${machineIp}:8000/api/v1/users/get-job-postings/?page=${page}`;
        const { data } = await axios.get(url);
        collected.push(...(data.job_postings || []));
        if (!data.pagination?.has_next) break;
        page += 1;
      }
      setAllJobs(collected);
    } finally {
      setLoadingMore(false);
    }
  };

  // 2c) Simple normalize helper
  const norm = (s?: string | null) =>
    (s ?? "").toLowerCase().normalize("NFKD");

  // 2d) Filter across title, company, tags, location, description
  const filteredJobs = useMemo(() => {
    const q = norm(debouncedQ);
    if (!q) return allJobs;

    return allJobs.filter((j) => {
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
  }, [allJobs, debouncedQ]);

  const renderSkillBadge = (skill: string) => (
    <View key={skill} style={styles.skillBadge}>
      <Text style={styles.skillText}>{skill}</Text>
    </View>
  );

  const onPressJob = (job: Job) => {
    const normalized: FullJob = {
      id: job.id,
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
    };
  
    setSelectedJob(normalized);
    setShowModal(true);
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
          <TouchableOpacity style={styles.filterButton} onPress={refetch} disabled={loadingMore}>
            <FilterIcon size={20} color={colors.foreground} />
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
                {selectedJob ? (
                  <View style={modalStyles.jobCardClamp}>
                    <JobCard
                      job={selectedJob}
                      userRole="applicant"
                      onEditJobPosting={() => {}}
                      onToggleSuccess={() => {}}
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