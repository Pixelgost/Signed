import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolate,
  runOnJS,
} from "react-native-reanimated";
import axios, { AxiosError } from "axios";
import Constants from "expo-constants";
import { JobCard, Job, MediaItem } from "./job-card";
import { SwipeButtons } from "./swipe-buttons";
import { colors, spacing } from "../styles/colors";

const machineIp = Constants.expoConfig?.extra?.MACHINE_IP;

const fetchJobsFromAPI = async (
  page: number,
  uid: string
): Promise<{ jobs: Job[]; hasMore: boolean }> => {
  const API_ENDPOINT = `http://${machineIp}:8000/api/v1/users/get-job-postings/?page=${page}`;
  console.log(`API Call: ${API_ENDPOINT}`);
  return axios
    .get(API_ENDPOINT, {
      params: {
        user_uid: uid,
      },
    })
    .then((response: { data: any }) => {
      console.log(
        `Fetched page ${page}. Jobs received: ${response.data.job_postings.length}. Has more: ${response.data.pagination.has_next}`
      );
      return {
        jobs: response.data.job_postings,
        hasMore: response.data.pagination.has_next,
      };
    })
    .catch((error: AxiosError) => {
      console.error(`Error fetching page ${page}:`, error.message);
      return {
        jobs: [],
        hasMore: false,
      };
    });
};

// --- SwipeInterface Component ---

interface SwipeInterfaceProps {
  userId: string;
}

export const SwipeInterface = ({ userId }: SwipeInterfaceProps) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [currentJobIndex, setCurrentJobIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMorePages, setHasMorePages] = useState(true);

  // a state holding a set of jobs that the user has swiped on in this session.
  // we fetch all the jobs again upon a user swiping in order to update the similarity scores.
  // this prevents the user from seeing the exact same job multiple times.
  const swipedJobs = useRef<Set<string>>(new Set());

  const translateX = useSharedValue(0);
  const rotate = useSharedValue(0);

  const PREFETCH_THRESHOLD = 1;

  // FIX 1: Simplify useCallback dependencies.
  // We use the functional setter for setHasMorePages in the success/error blocks.
  const fetchJobs = useCallback(
    async (page: number) => {
      // 1. Primary guard against simultaneous fetches
      if (isLoading) return;

      // 2. Secondary guard against fetching past the last known page.
      // We get the current page state via functional update to avoid stale closure here.
      let isFetchingNextPage = false;
      setCurrentPage((prevPage) => {
        isFetchingNextPage = page > prevPage;
        return prevPage;
      });

      if (isFetchingNextPage && !hasMorePages) return;

      setIsLoading(true);
      try {
        let { jobs: newJobs, hasMore } = await fetchJobsFromAPI(page, userId);

        if (newJobs.length > 0) {
          // filter out the jobs the user has already swiped on in this session
          console.log(swipedJobs.current);
          let uniqueNewJobs = newJobs.filter(
              (newJob) => !swipedJobs.current.has(newJob.id)
            );
          while (uniqueNewJobs.length == 0 && hasMore) {
            page +=1;
            const { jobs: newJobs, hasMore: loadMore } = await fetchJobsFromAPI(page, userId);
              uniqueNewJobs = newJobs.filter(
              (newJob) => !swipedJobs.current.has(newJob.id)
               );
              hasMore = loadMore;
          }
          setJobs(uniqueNewJobs);
          setCurrentPage(page);
        }

        setHasMorePages(hasMore);
      } catch (error) {
        setHasMorePages(false);
        if (axios.isAxiosError(error)) {
          console.error("Axios Failed to fetch jobs:", error.message);
        } else {
          console.error("General Failed to fetch jobs:", error);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, hasMorePages]
  );

  const initialFetch = React.useRef(true);

  useEffect(() => {
    if (initialFetch.current) {
      fetchJobs(1);
      initialFetch.current = false;
    }
  }, [fetchJobs]);

  const currentJob = jobs[currentJobIndex];

  const shouldLoadNextPage =
    !isLoading &&
    jobs.length > 0 &&
    currentJobIndex >= jobs.length - PREFETCH_THRESHOLD;

  const nextCard = () => {
    // const nextIndex = 0;
    // if (shouldLoadNextPage && hasMorePages) {
    //   console.log(`Prefetching page ${currentPage + 1}...`);
    //   fetchJobs(currentPage + 1);
    // }

    // if (nextIndex < jobs.length) {
    //   setCurrentJobIndex(nextIndex);
    // } else if (hasMorePages) {
    //   setCurrentJobIndex(jobs.length);
    //   console.log("Waiting for next page of jobs to load...");
    // } else {
    //   setCurrentJobIndex(jobs.length);
    //   console.log("Reached end of all jobs.");
    // }
  };

  const handleSwipeRight = async () => {
    const API_ENDPOINT = `http://${machineIp}:8000/api/v1/users/apply-to-job/`;

    await axios
      .get(API_ENDPOINT, {
        params: {
          user_id: userId,
          job_id: jobs[currentJobIndex].id,
        },
      })
      .then(async (response: { data: any }) => {
        console.log(`Success: ${response.data}`);

        swipedJobs.current.add(jobs[currentJobIndex].id);

        await fetchJobs(1);
        nextCard();
      })
      .catch((error: AxiosError) => {
        console.error(`Error applying to job:`, error.message);
      });
  };

  const handleSwipeLeft = async () => {
    const API_ENDPOINT = `http://${machineIp}:8000/api/v1/users/reject-job/`;

    await axios
      .get(API_ENDPOINT, {
        params: {
          user_id: userId,
          job_id: jobs[currentJobIndex].id,
        },
      })
      .then(async (response: { data: any }) => {
        console.log(`Success: ${response.data}`);

        swipedJobs.current.add(jobs[currentJobIndex].id);


        await fetchJobs(1);
        nextCard();
      })
      .catch((error: AxiosError) => {
        console.error(`Error applying to job:`, error.message);
      });
  };

  // ... (Reanimated logic remains the same) ...

  const startX = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      startX.value = translateX.value;
    })
    .onUpdate((event) => {
      translateX.value = startX.value + event.translationX;
      rotate.value = interpolate(
        translateX.value,
        [-300, 0, 300],
        [-15, 0, 15],
        Extrapolate.CLAMP
      );
    })
    .onEnd((event) => {
      const shouldSwipe =
        Math.abs(event.velocityX) > 500 || Math.abs(translateX.value) > 150;

      if (shouldSwipe) {
        if (translateX.value > 0) {
          translateX.value = withSpring(400, {}, () => {
            runOnJS(handleSwipeRight)();
            translateX.value = 0;
            rotate.value = 0;
          });
        } else {
          translateX.value = withSpring(-400, {}, () => {
            runOnJS(handleSwipeLeft)();
            translateX.value = 0;
            rotate.value = 0;
          });
        }
      } else {
        translateX.value = withSpring(0);
        rotate.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { rotate: `${rotate.value}deg` },
      ],
    };
  });

  const likeOpacity = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        translateX.value,
        [0, 150],
        [0, 1],
        Extrapolate.CLAMP
      ),
    };
  });

  const passOpacity = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        translateX.value,
        [-150, 0],
        [1, 0],
        Extrapolate.CLAMP
      ),
    };
  });

  // --- Rendering Logic (unchanged) ---

  if (!currentJob && isLoading && jobs.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Fetching jobs...</Text>
      </View>
    );
  }

  if (!currentJob) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          {hasMorePages && isLoading
            ? "Loading next page of jobs..."
            : hasMorePages && !isLoading
            ? "No more jobs to show!"
            : "No more jobs to show!"}
        </Text>
        {isLoading && hasMorePages && (
          <ActivityIndicator
            size="small"
            color={colors.mutedForeground}
            style={{ marginTop: spacing.sm }}
          />
        )}
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.cardContainer, animatedStyle]}>
            <JobCard job={currentJob} userRole="applicant" />

            {/* Like overlay */}
            <Animated.View
              style={[styles.overlay, styles.likeOverlay, likeOpacity]}
            >
              <Text style={styles.overlayText}>LIKE</Text>
            </Animated.View>

            {/* Pass overlay */}
            <Animated.View
              style={[styles.overlay, styles.passOverlay, passOpacity]}
            >
              <Text style={styles.overlayText}>PASS</Text>
            </Animated.View>
          </Animated.View>
        </GestureDetector>

        <View style={styles.numberOverlay}>
          <Text style={styles.numberText}>
            Similarity Score: {currentJob.similarity_score}
          </Text>
        </View>

        <SwipeButtons
          onSwipeLeft={handleSwipeLeft}
          onSwipeRight={handleSwipeRight}
        />
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  // ... (Styles remain the same)
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    backgroundColor: "#f5f5f5",
  },
  cardContainer: {
    width: "100%",
    height: "70%",
    position: "relative",
  },
  overlay: {
    position: "absolute",
    top: 50,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 4,
    zIndex: 10,
  },
  likeOverlay: {
    right: 20,
    borderColor: "#4ade80",
    backgroundColor: "rgba(74, 222, 128, 0.1)",
    transform: [{ rotate: "20deg" }],
  },
  passOverlay: {
    left: 20,
    borderColor: "#ef4444",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    transform: [{ rotate: "-20deg" }],
  },
  overlayText: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.foreground,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 18,
    color: colors.mutedForeground,
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: spacing.sm,
    color: colors.mutedForeground,
  },
  numberOverlay: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  numberText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
});

export default SwipeInterface;
