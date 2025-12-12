import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Constants from "expo-constants";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { borderRadius, colors, fontSizes, fontWeights, spacing } from "../styles/colors";

const machineIp = Constants.expoConfig?.extra?.MACHINE_IP;
const BASE_URL = `http://${machineIp}:8000`;

type TimeseriesPoint = { date: string; impressions: number; likes: number; applicants: number };

type StatsPayload = {
  totals: { job_posts: number; impressions: number; likes: number; applicants: number };
  timeseries: TimeseriesPoint[];
  top_jobs: { id: string; title: string; impressions: number; likes: number; applicants: number }[];
};

type Props = {
  employerId?: string;
  visible: boolean;
  onClose: () => void;
};

const metricOptions = [
  { key: "impressions", label: "Impressions" },
  { key: "likes", label: "Likes" },
  { key: "applicants", label: "Applicants" },
];

export const EmployerStatsModal = ({ employerId, visible, onClose }: Props) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metric, setMetric] = useState<"impressions" | "likes" | "applicants">("impressions");
  const [data, setData] = useState<StatsPayload | null>(null);

  const fetchStats = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const token = await AsyncStorage.getItem("userToken");
      if (!token) throw new Error("Not authenticated");

      const res = await axios.get(`${BASE_URL}/api/v1/users/employer-stats/`, {
        params: employerId ? { employer_id: employerId } : {},
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data?.status === "success") {
        setData({
          totals: res.data.totals,
          timeseries: res.data.timeseries || [],
          top_jobs: res.data.top_jobs || [],
        });
        setError(null);
      } else {
        throw new Error(res.data?.message || "Failed to load stats");
      }
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Failed to load stats";
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchStats();
    }
  }, [visible]);

  const seriesForMetric = useMemo(() => {
    if (!data) return [];
    return data.timeseries.map((p) => ({ label: p.date, value: p[metric] }));
  }, [data, metric]);

  const maxValue = Math.max(1, ...seriesForMetric.map((p) => p.value));

  const Dropdown = () => (
    <View style={styles.dropdown}>
      {metricOptions.map((opt) => (
        <TouchableOpacity
          key={opt.key}
          style={[styles.dropdownItem, metric === opt.key && styles.dropdownItemActive]}
          onPress={() => setMetric(opt.key as any)}
        >
          <Text style={[styles.dropdownText, metric === opt.key && styles.dropdownTextActive]}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const BarRow = ({ label, value }: { label: string; value: number }) => {
    const pct = Math.max(4, (value / maxValue) * 100);
    return (
      <View style={styles.barRow}>
        <Text style={styles.barLabel}>{label}</Text>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${pct}%` }]} />
        </View>
        <Text style={styles.barValue}>{value}</Text>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Employer Analytics</Text>
          <TouchableOpacity onPress={onClose} hitSlop={10}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.muted}>Loading stats...</Text>
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => fetchStats()}>
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : !data ? null : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: spacing.md }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => fetchStats(true)}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
          >
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Totals</Text>
              <View style={styles.totalsRow}>
                <View style={styles.totalItem}>
                  <Text style={styles.totalValue}>{data.totals.job_posts}</Text>
                  <Text style={styles.totalLabel}>Job Posts</Text>
                </View>
                <View style={styles.totalItem}>
                  <Text style={styles.totalValue}>{data.totals.impressions}</Text>
                  <Text style={styles.totalLabel}>Impressions</Text>
                </View>
                <View style={styles.totalItem}>
                  <Text style={styles.totalValue}>{data.totals.likes}</Text>
                  <Text style={styles.totalLabel}>Likes</Text>
                </View>
                <View style={styles.totalItem}>
                  <Text style={styles.totalValue}>{data.totals.applicants}</Text>
                  <Text style={styles.totalLabel}>Applicants</Text>
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.sectionTitle}>Trends</Text>
                <Dropdown />
              </View>
              {seriesForMetric.length === 0 ? (
                <Text style={styles.muted}>No data yet.</Text>
              ) : (
                seriesForMetric.map((p) => <BarRow key={p.label} label={p.label} value={p.value} />)
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Top Posts</Text>
              {data.top_jobs.length === 0 ? (
                <Text style={styles.muted}>No posts yet.</Text>
              ) : (
                data.top_jobs.map((job) => (
                  <View key={job.id} style={styles.topJobRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.topJobTitle}>{job.title}</Text>
                      <Text style={styles.muted}>
                        {job.impressions} impressions · {job.likes} likes · {job.applicants} applicants
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: fontSizes.lg, fontWeight: fontWeights.bold, color: colors.foreground },
  closeText: { color: colors.primary, fontWeight: fontWeights.semibold },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  muted: { color: colors.mutedForeground, marginTop: spacing.sm },
  errorText: { color: colors.destructive, marginBottom: spacing.sm, textAlign: "center" },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  retryText: { color: colors.primaryForeground, fontWeight: fontWeights.semibold },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: { fontSize: fontSizes.base, fontWeight: fontWeights.semibold, color: colors.foreground, marginBottom: spacing.sm },
  totalsRow: { flexDirection: "row", justifyContent: "space-between" },
  totalItem: { alignItems: "center", flex: 1 },
  totalValue: { fontSize: fontSizes.lg, fontWeight: fontWeights.bold, color: colors.foreground },
  totalLabel: { color: colors.mutedForeground, marginTop: 4 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  dropdown: {
    flexDirection: "row",
    backgroundColor: colors.inputBackground,
    borderRadius: borderRadius.full,
    padding: 2,
  },
  dropdownItem: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
  },
  dropdownItemActive: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  dropdownText: { color: colors.mutedForeground, fontSize: fontSizes.sm },
  dropdownTextActive: { color: colors.foreground, fontWeight: fontWeights.semibold },
  barRow: { marginVertical: spacing.xs },
  barLabel: { color: colors.foreground, marginBottom: 4, fontSize: fontSizes.sm },
  barTrack: {
    width: "100%",
    height: 8,
    backgroundColor: colors.inputBackground,
    borderRadius: borderRadius.full,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  barValue: { color: colors.foreground, marginTop: 4, fontSize: fontSizes.sm },
  topJobRow: { paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.border },
  topJobTitle: { fontWeight: fontWeights.semibold, color: colors.foreground },
});
