import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from "axios";
import * as Clipboard from 'expo-clipboard';
import Constants from "expo-constants";
import { useVideoPlayer, VideoView } from "expo-video";
import { useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import WebView from "react-native-webview";
import {
  borderRadius,
  colors,
  fontSizes,
  fontWeights,
  shadows,
  spacing,
} from "../styles/colors";
import EditJobPosting from "./edit-job-posting";
import { BookmarkFilledIcon, BookmarkOutlineIcon, ClockIcon, DollarSignIcon, HeartFilledIcon, HeartOutlineIcon, LinkedInIcon, MailIcon, MapPinIcon } from "./icons";


const { width: screenWidth } = Dimensions.get("window");
const extractJobId = (j: any) =>
  String(j?.id ?? j?.post_id ?? j?.uuid ?? j?.job_posting_id ?? j?.pk ?? "");

export interface MediaItem {
  file_type: string;
  file_size: number;
  download_link: string;
  file_name: string;
}

export interface Job {
  similarity_score: string;
  id: string;
  job_title: string;
  company: string;
  location: string;
  salary: string;
  job_type: string;
  job_description: string;
  tags: string[];
  company_logo: MediaItem | null;
  media_items: MediaItem[];
  company_size: string;
  date_posted: string;
  date_updated: string;
  is_active: boolean;
  is_liked?: boolean;
  is_bookmarked?: boolean;
  likes_count?: number;
  posted_by?: {
    user_id: string;
    user_email: string;
    user_company: string;
    user_linkedin_url?: string;
  };
}

interface JobCardProps {
  job: Job;
  onToggleSuccess?: () => void;
  userRole: "employer" | "applicant";
  onEditJobPosting: () => void;
  currentUserId?: string;
}

const machineIp = Constants.expoConfig?.extra?.MACHINE_IP;

const VideoWebViewer = ({ item }: { item: MediaItem }) => {
  const webViewRef = useRef(null);
  if (item.file_type !== "mov") {
    return (
      <WebView
        source={{ uri: item.download_link }}
        style={{ flex: 1, height: 300, width: 300 }}
        mediaPlaybackRequiresUserAction={true}
        javaScriptEnabled={true}
      />
    );
  } else {
    const player = useVideoPlayer(item.download_link, (player) => {
      player.loop = true;
    });
    return (
      <VideoView
        style={{ flex: 1, height: 300, width: 300 }}
        player={player}
        allowsFullscreen
        allowsPictureInPicture
      />
    );
  }
};

export const JobCard = ({ job, onToggleSuccess, userRole, onEditJobPosting, currentUserId }: JobCardProps) => {
  const [isActive, setIsActive] = useState(job.is_active);
  const [loading, setLoading] = useState(false);
  const [showEditJobPosting, setShowEditJobPosting] = useState<boolean>(false);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(!!job.is_bookmarked);
  const [showLinkedInModal, setShowLinkedInModal] = useState(false);
  const [isLiked, setIsLiked] = useState<boolean>(!!job.is_liked);
  const [likesCount, setLikesCount] = useState<number>(job.likes_count ?? 0);
  const [liking, setLiking] = useState(false);

  const handleBookmarkToggle = async () => {
    if (userRole !== "applicant") return;

    const nextBookmarked = !isBookmarked;
    setIsBookmarked(nextBookmarked);

    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) throw new Error("Not authenticated");

      // 1) job id
      const jobId = extractJobId(job);
      if (!jobId) throw new Error("Missing job id");

      // 2) user id
      let userId = currentUserId;
      if (!userId) {
        const { data } = await axios.get(
          `http://${machineIp}:8000/api/v1/users/auth/me/`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        userId = data?.id;
      }
      if (!userId) throw new Error("Missing user id");

      // 3) POST bookmark toggle
      const res = await axios.post(
        `http://${machineIp}:8000/api/v1/users/bookmark-job-posting/`,
        { job_id: jobId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.status === "success") {
        setIsBookmarked(Boolean(res.data.bookmarked));
      } else {
        throw new Error("Server rejected bookmark");
      }
    } catch (e: any) {
      console.error("bookmark-job-posting failed:", e?.response?.data || e?.message || e);
      // rollback UI
      setIsBookmarked(!nextBookmarked);
      Alert.alert("Error", "Couldn't update bookmark. Please try again.");
    }
  };

  const handleContactEmployer = async () => {
    if (!job.posted_by?.user_email) {
      Alert.alert("Error", "Employer email is not available for this job posting.");
      return;
    }

    const email = job.posted_by?.user_email;
    const subject = encodeURIComponent(`Interested in ${job.job_title} position at ${job.posted_by?.user_company}`);
    const body = encodeURIComponent(
      `Hello,\n\nI am writing to express my interest in the ${job.job_title} position at ${job.posted_by?.user_company}.\n\nI would love to discuss this opportunity further.\n\nBest regards`
    );

    const mailtoUrl = `mailto:${email}?subject=${subject}&body=${body}`;

    try {
      const canOpen = await Linking.canOpenURL(mailtoUrl);
      if (canOpen) {
        await Linking.openURL(mailtoUrl);
      } else {
        Alert.alert("Error", "Unable to open email client. Please ensure you have an email app configured.");
      }
    } catch (error) {
      console.error("Error opening email:", error);
      Alert.alert("Error", "Failed to open email client.");
    }
  };

  const handleLinkedInConnect = () => {
    if (!job.posted_by?.user_linkedin_url) {
      Alert.alert("Error", "LinkedIn profile is not available for this employer.");
      return;
    }
    setShowLinkedInModal(true);
  };

  const openLinkedInProfile = async () => {
    if (!job.posted_by?.user_linkedin_url) return;

    try {
      const canOpen = await Linking.canOpenURL(job.posted_by.user_linkedin_url);
      if (canOpen) {
        await Linking.openURL(job.posted_by.user_linkedin_url);
      } else {
        Alert.alert("Error", "Unable to open LinkedIn profile.");
      }
    } catch (error) {
      console.error("Error opening LinkedIn:", error);
      Alert.alert("Error", "Failed to open LinkedIn profile.");
    }
  };

  const toggleLike = async () => {
    if (userRole !== "applicant") return;

    // optimistic UI
    const nextLiked = !isLiked;
    setIsLiked(nextLiked);
    setLikesCount((c) => Math.max(0, c + (nextLiked ? 1 : -1)));
    setLiking(true);

    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) throw new Error("Not authenticated");

      // 1) job id (needs to be stored locally)
      const jobId = extractJobId(job);
      if (!jobId) throw new Error("Missing job id");

      // 2) use id (working?)
      let userId = currentUserId;
      if (!userId) {
        const { data } = await axios.get(
          `http://${machineIp}:8000/api/v1/users/auth/me/`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        userId = data?.id;
      }
      if (!userId) throw new Error("Missing user id");

      // 3) POST with BOTH job_id and user_id 
      console.log("like payload", { job_id: jobId, user_id: userId }); // TEMP: verify in Metro logs

      const res = await axios.post(
        `http://${machineIp}:8000/api/v1/users/like-job-posting/`,
        { job_id: jobId, user_id: userId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.status === "success") {
        setIsLiked(Boolean(res.data.liked));
        setLikesCount(Number(res.data.likes_count ?? 0));
      } else {
        throw new Error("Server rejected like");
      }
    } catch (e: any) {
      console.error("like-job-posting failed:", e?.response?.data || e?.message || e);
      // rollback UI
      setIsLiked(!nextLiked);
      setLikesCount((c) => Math.max(0, c + (nextLiked ? -1 : 1)));
      Alert.alert("Error", "Couldn't update like. Please try again.");
    } finally {
      setLiking(false);
    }
  };

// const getUserId = async (): Promise<string | null> => {
//   if (currentUserId) return currentUserId;
//   try {
//     const { data } = await axios.get(`http://${machineIp}:8000/api/v1/users/auth/me/`);
//     return data?.id ?? null;
//   } catch {
//     return null;
//   }
// };

  // const toggleLike = async () => {
  //   if (userRole !== "applicant") return;

    
  //   const nextLiked = !isLiked;
  //   setIsLiked(nextLiked);
  //   setLikesCount((c) => Math.max(0, c + (nextLiked ? 1 : -1)));
  //   setLiking(true);

  //   try {
  //     const uid = await getUserId();
  //     if (!uid) {
  //       throw new Error("Missing user id");
  //     }
      
  //     const url = `http://${machineIp}:8000/api/v1/users/like-job-posting/?user_id=${uid}`;
  //     const res = await axios.post(url, { job_id: job.id });

  //     if (res.data?.status === "success") {
  //       setIsLiked(Boolean(res.data.liked));
  //       setLikesCount(Number(res.data.likes_count ?? 0));
  //     } else {
  //       throw new Error("Server rejected like");
  //     }
  //   } catch (e) {
  //     // rollback UI
  //     setIsLiked(!nextLiked);
  //     setLikesCount((c) => Math.max(0, c + (nextLiked ? -1 : 1)));
  //     Alert.alert("Error", "Couldn't update like. Please try again.");
  //   } finally {
  //     setLiking(false);
  //   }
  // };



  const copyLinkedInMessage = async () => {
    const message = `Hi! I came across the ${job.job_title} position at ${job.posted_by?.user_company} and I'm very interested in learning more about this opportunity. I believe my skills and experience align well with the role. Would you be open to connecting?`;

    await Clipboard.setStringAsync(message);
    Alert.alert("Success", "Message copied to clipboard! You can now paste it in your LinkedIn connection request.");
  };

  const toggleActive = async (value: boolean) => {
    setLoading(true);
    try {
      const response = await axios.patch(
        `http://${machineIp}:8000/api/v1/users/get-job-postings/`,
        { is_active: value },
        { params: { filters: JSON.stringify({ id: job.id }) } }
      );

      if (response.data.status === "success") {
        setIsActive(response.data.is_active);
        onToggleSuccess?.();
      } else {
        Alert.alert("Error", "Failed to update job status.");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to update job status.");
    } finally {
      setLoading(false);
    }
  };

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
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ alignItems: "center" }}
          >
            {job.media_items.map((item, index) => (
              <View
                key={index}
                style={{
                  width: 320,
                  height: 320,
                  justifyContent: "center",
                  alignItems: "center",
                  marginHorizontal: 20,
                }}
              >
                <VideoWebViewer item={item} />
              </View>
            ))}
          </ScrollView>
        ) : (
          <View style={[styles.mainImage, styles.placeholderImage]}>
            <Text style={styles.placeholderText}>No Image</Text>
          </View>
        )}

        {/* Content */}
        <View style={styles.content}>
          {/* Company header */}
          <View style={styles.companyHeader}>
            {job.company_logo && job.company_logo.download_link ? (
              <Image
                source={{ uri: job.company_logo.download_link }}
                style={styles.companyLogoImage}
              />
            ) : (
              <View style={[styles.companyLogo, styles.placeholderLogo]}>
                <Text style={styles.logoText}>
                  {job.posted_by?.user_company.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.companyInfo}>
              <Text style={styles.jobTitle}>{job.job_title}</Text>
              <Text style={styles.companyName}>{job.posted_by?.user_company}</Text>
            </View>
          </View>

          {/* Active Toggle */}
          {userRole === "employer" && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: spacing.md,
              }}
            >
              <Text style={{ marginRight: 10, fontWeight: "bold" }}>
                Active:
              </Text>
              <Switch
                value={isActive}
                onValueChange={toggleActive}
                disabled={loading}
              />
            </View>
          )}

          {/* Job details */}
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <MapPinIcon size={16} color={colors.mutedForeground} />
              <Text style={styles.detailText}>{job.location}</Text>
            </View>

            <View style={styles.detailColumns}>
              <View style={styles.detailRow}>
                {/* <DollarSignIcon size={16} color={colors.mutedForeground} /> */}
                <Text style={styles.detailText}>{job.salary}</Text>
              </View>
              <View style={styles.detailRow}>
                <ClockIcon size={16} color={colors.mutedForeground} />
                <Text style={styles.detailText}>{job.job_type}</Text>
              </View>
            </View>

            <Text style={styles.duration}>
              Company Size: {job.company_size} employees
            </Text>
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

          {/* Contact Employer button - only for applicants */}
          {userRole === "applicant" && (job.posted_by?.user_email || job.posted_by?.user_linkedin_url) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Contact</Text>
              <View style={styles.contactButtonsContainer}>
                {job.posted_by?.user_email && (
                  <TouchableOpacity
                    style={styles.contactButton}
                    onPress={handleContactEmployer}
                  >
                    <MailIcon size={24} color={colors.primary} />
                  </TouchableOpacity>
                )}
                {job.posted_by?.user_linkedin_url && (
                  <TouchableOpacity
                    style={styles.contactButton}
                    onPress={handleLinkedInConnect}
                  >
                    <LinkedInIcon size={24} color={colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Bookmark button - only for applicants */}
          {userRole === "applicant" && (
            <TouchableOpacity
              style={styles.bookmarkButton}
              onPress={handleBookmarkToggle}
            >
              {isBookmarked ? (
                <BookmarkFilledIcon size={28} color={colors.primary} />
              ) : (
                <BookmarkOutlineIcon size={28} color={colors.mutedForeground} />
              )}
            </TouchableOpacity>
          )}

          {/* for like button */}
          {userRole === "applicant" && (
            <TouchableOpacity
              style={styles.likeButton}
              onPress={toggleLike}
              disabled={liking}
            >
              {/* If you have Heart icons, use them; reusing Bookmark icons for now */}
              {isLiked ? (
                <HeartFilledIcon size={28} color={colors.primary} />
              ) : (
                <HeartOutlineIcon size={28} color={colors.mutedForeground} />
              )}
              <Text style={styles.likeCountText}>{likesCount}</Text>
            </TouchableOpacity>
          )}

          {/* Edit job posting */}

          {userRole === "employer" && (
            <>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  setShowEditJobPosting(true);
                }}
              >
                <Text style={styles.actionButtonText}>Edit</Text>
              </TouchableOpacity>
              <Modal
                visible={showEditJobPosting}
                animationType="slide"
                transparent
              >
                <View style={styles.modalOverlay}>
                  <View style={styles.modalContent}>
                    <EditJobPosting
                      onSuccessfulSubmit={async () => {
                        setShowEditJobPosting(false);
                        onEditJobPosting();
                      }}
                      postId={job.id}
                    />
                  </View>
                </View>
              </Modal>
            </>
          )}
        </View>

        {/* LinkedIn Modal */}
        <Modal
          visible={showLinkedInModal}
          animationType="fade"
          transparent
          onRequestClose={() => setShowLinkedInModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.linkedInModalContent}>
              <Text style={styles.modalTitle}>Connect on LinkedIn</Text>
              <Text style={styles.modalDescription}>
                Use this message to connect with the employer:
              </Text>

              <View style={styles.messageBox}>
                <Text style={styles.messageText}>
                  Hi! I came across the {job.job_title} position at {job.posted_by?.user_company} and I'm very interested in learning more about this opportunity. I believe my skills and experience align well with the role. Would you be open to connecting?
                </Text>
              </View>

              <TouchableOpacity
                style={styles.modalButton}
                onPress={copyLinkedInMessage}
              >
                <Text style={styles.modalButtonText}>Copy Message</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={openLinkedInProfile}
              >
                <Text style={[styles.modalButtonText, { color: colors.primary }]}>
                  Open LinkedIn Profile
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowLinkedInModal(false)}
              >
                <Text style={styles.modalCloseButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    overflow: "hidden",
    ...shadows.lg,
  },
  scrollContainer: {
    flex: 1,
  },
  mainImage: {
    width: "100%",
    height: 200,
  },
  mainImageStyle: {
    width: 350,
    height: 350,
  },
  content: {
    padding: spacing.md,
  },
  companyHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
    marginRight: 10,
  },
  companyLogo: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.lg,
    marginRight: 15,
  },
  companyLogoImage: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.lg,
    marginRight: 15,
  },
  companyInfo: {
    flex: 1,
  },
  jobTitle: {
    fontSize: fontSizes.xl,
    fontWeight: "bold" as const,
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
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  detailColumns: {
    flexDirection: "row",
    justifyContent: "space-between",
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
    fontWeight: "600" as const,
    color: colors.foreground,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: fontSizes.base,
    lineHeight: 24,
    color: colors.foreground,
  },
  requirementsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
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
    fontWeight: "500" as const,
  },
  placeholderImage: {
    backgroundColor: colors.muted,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    fontSize: fontSizes.lg,
    color: colors.mutedForeground,
    fontWeight: "500" as const,
  },
  placeholderLogo: {
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: {
    fontSize: fontSizes.xl,
    color: colors.primaryForeground,
    fontWeight: "bold" as const,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: { backgroundColor: "white", borderRadius: 16, flex: 1 },
  actionButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.md,
    ...shadows.md,
  },
  actionButtonText: {
    color: colors.primaryForeground,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
  },
  bookmarkButton: {
    position: "absolute",
    bottom: spacing.md,
    right: spacing.md,
    padding: spacing.sm,
  },
  contactButtonsContainer: {
    flexDirection: "row",
    gap: spacing.md,
  },
  contactButton: {
    alignSelf: "flex-start",
    padding: spacing.sm,
  },
  linkedInModalContent: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    width: "90%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: fontSizes.xl,
    fontWeight: "bold" as const,
    color: colors.foreground,
    marginBottom: spacing.md,
  },
  modalDescription: {
    fontSize: fontSizes.base,
    color: colors.mutedForeground,
    marginBottom: spacing.md,
  },
  messageBox: {
    backgroundColor: colors.muted,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  messageText: {
    fontSize: fontSizes.base,
    color: colors.foreground,
    lineHeight: 22,
  },
  modalButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  modalButtonSecondary: {
    backgroundColor: colors.muted,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  modalButtonText: {
    color: colors.primaryForeground,
    fontSize: fontSizes.base,
    fontWeight: "600" as const,
  },
  modalCloseButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  modalCloseButtonText: {
    color: colors.mutedForeground,
    fontSize: fontSizes.base,
  },
  likeButton: {
    position: "absolute",
    bottom: spacing.md + 44, // ~44px above the bookmark
    right: spacing.md,
    padding: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
  },
  likeCountText: {
    marginLeft: 6,
    color: colors.mutedForeground,
    fontSize: fontSizes.base,
    fontWeight: "600" as const,
  },
});
