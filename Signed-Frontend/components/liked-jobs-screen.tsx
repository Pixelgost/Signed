import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Constants from "expo-constants";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { borderRadius, colors, fontSizes, fontWeights, spacing } from "../styles/colors";
import { Job, JobCard } from "./job-card";

const machineIp = Constants.expoConfig?.extra?.MACHINE_IP;
const BASE_URL = `http://${machineIp}:8000`;

type LikedJobsScreenProps = {
  userId?: string;
  onClose: () => void;
};

export const LikedJobsScreen = ({ userId, onClose }: LikedJobsScreenProps) => {
  const [likedJobs, setLikedJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolvedUserId, setResolvedUserId] = useState<string | undefined>(userId);

  const ensureUserId = useCallback(async (): Promise<string | null> => {
    if (resolvedUserId) return resolvedUserId;
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) return null;
      const res = await axios.get(`${BASE_URL}/api/v1/users/auth/me/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const id = res.data?.id;
      if (id) setResolvedUserId(id);
      return id ?? null;
    } catch {
      return null;
    }
  }, [resolvedUserId]);

  const fetchLikedJobs = useCallback(async (isRefresh = false) => {
    const targetUserId = resolvedUserId || (await ensureUserId());
    if (!targetUserId) {
      setError("Missing user id");
      setLoading(false);
      return;
    }

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        throw new Error("Not authenticated");
      }

      const response = await axios.get(`${BASE_URL}/api/v1/users/liked-job-postings/`, {
        params: { user_id: targetUserId },
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data?.status === "success") {
        setLikedJobs(response.data.liked_jobs || []);
        setError(null);
      } else {
        setError("Failed to load liked jobs.");
      }
    } catch (e: any) {
      const message = e?.response?.data?.message || e?.message || "Failed to load liked jobs.";
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [ensureUserId, resolvedUserId]);

  useEffect(() => {
    fetchLikedJobs();
  }, [fetchLikedJobs]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Liked Posts</Text>
        <TouchableOpacity onPress={onClose} hitSlop={10}>
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.muted}>Loading your likes...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchLikedJobs()}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : likedJobs.length === 0 ? (
        <View style={styles.centerContent}>
          <Text style={styles.muted}>You have not liked any jobs yet.</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.lg }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchLikedJobs(true)}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          {likedJobs.map((job) => (
            <View key={job.id} style={styles.cardWrapper}>
              <JobCard
                job={job}
                userRole="applicant"
                onEditJobPosting={() => {}}
                onToggleSuccess={() => fetchLikedJobs()}
                currentUserId={resolvedUserId}
              />
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: fontSizes.lg, fontWeight: fontWeights.bold, color: colors.foreground },
  closeText: { color: colors.primary, fontWeight: fontWeights.semibold, fontSize: fontSizes.base },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  muted: { color: colors.mutedForeground, marginTop: spacing.sm, textAlign: "center" },
  errorText: { color: colors.destructive ?? "#d9534f", textAlign: "center", marginBottom: spacing.sm },
  retryButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
  },
  retryText: { color: colors.primaryForeground, fontWeight: fontWeights.semibold },
  cardWrapper: { marginBottom: spacing.md },
});
