import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolate,
  runOnJS,
} from 'react-native-reanimated';
// --- Import Axios ---
import axios, { AxiosError } from 'axios';
// --- Import Constants ---
import Constants from 'expo-constants';
// --------------------
import { JobCard } from '../../components/job-card';
import { SwipeButtons } from '../../components/swipe-buttons';
import { colors, spacing } from '../../styles/colors';

// --- Placeholder Job Interface and Mock API ---

interface MediaItem {
  file_type: string;
  file_size: number;
  download_link: string;
  file_name: string;
}

interface Job {
  id: string;
  job_title: string;
  company: string;
  location: string;
  salary: string;
  job_type: string;
  job_description: string;
  tags: string[];
  company_logo: string | null;
  media_items: MediaItem[];
  company_size: string;
  date_posted: string;
  date_updated: string;
  is_active: boolean;
}

// Mock API data structure (simulating a backend database)


const machineIp = Constants.expoConfig?.extra?.MACHINE_IP;

const fetchJobsFromAPI = async (page: number): Promise<{ jobs: Job[], hasMore: boolean }> => {
  const API_ENDPOINT = `http://${machineIp}:8000/get-job-postings/`;
  return axios
    .get(API_ENDPOINT)
    .then((response: { data: any }) => {
      return {
        jobs: response.data.job_postings,
        hasMore: response.data.pagination.has_next
      }
    })
              .catch((error: AxiosError) => {
                console.error("Error details:", error);
                return {
                  jobs: [],
                  hasMore: false
                }
              });
};

// --- SwipeInterface Component (remains largely the same, but uses the new fetch function) ---

interface SwipeInterfaceProps {
  onMatchFound?: () => void;
}

const SwipeInterface = ({ onMatchFound }: SwipeInterfaceProps) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [currentJobIndex, setCurrentJobIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMorePages, setHasMorePages] = useState(true);

  const translateX = useSharedValue(0);
  const rotate = useSharedValue(0);
  
  const PREFETCH_THRESHOLD = 1;

  const fetchJobs = useCallback(async (page: number) => {
    if (isLoading || (page > 1 && !hasMorePages)) return;

    setIsLoading(true);
    try {
      // API call using the Axios-based function
      const { jobs: newJobs, hasMore } = await fetchJobsFromAPI(page);
      
      setJobs(prevJobs => {
        const uniqueNewJobs = newJobs.filter(newJob => 
          !prevJobs.some(existingJob => existingJob.id === newJob.id)
        );
        return [...prevJobs, ...uniqueNewJobs];
      });
      setCurrentPage(page);
      setHasMorePages(hasMore);

    } catch (error) {
      // Axios error handling often requires checking error.response
      if (axios.isAxiosError(error)) {
        console.error('Axios Failed to fetch jobs:', error.message);
      } else {
        console.error('General Failed to fetch jobs:', error);
      }
    } finally {
      setIsLoading(false);
    }
  }, []); // Remove isLoading and hasMorePages from dependencies

  // Initial load effect
  useEffect(() => {
    fetchJobs(1);
  }, [fetchJobs]);

  const currentJob = jobs[currentJobIndex];
  
  const shouldLoadNextPage = 
    !isLoading && 
    hasMorePages && 
    jobs.length > 0 && 
    currentJobIndex >= jobs.length - PREFETCH_THRESHOLD;

  const nextCard = () => {
    const nextIndex = currentJobIndex + 1;
    
    if (nextIndex < jobs.length) {
      setCurrentJobIndex(nextIndex);
      
      if (shouldLoadNextPage && hasMorePages) {
          fetchJobs(currentPage + 1);
      }
    } else if (hasMorePages) {
      console.log("Waiting for next page of jobs to load...");
    } else {
      setCurrentJobIndex(jobs.length);
    }
  };

  const handleSwipeRight = () => {
    if (Math.random() < 0.3 && onMatchFound) {
      onMatchFound();
    }
    nextCard();
  };

  const handleSwipeLeft = () => {
    nextCard();
  };

  // ... (Reanimated and styles remain the same) ...

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
      const shouldSwipe = Math.abs(event.velocityX) > 500 || Math.abs(translateX.value) > 150;
      
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

  // --- Rendering Logic ---

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
        <Text style={styles.emptyText}>No more jobs to show!</Text>
        {isLoading && hasMorePages && <ActivityIndicator size="small" color={colors.mutedForeground} style={{ marginTop: spacing.sm }} />}
        {!isLoading && hasMorePages && <Text style={styles.loadingText}>Hold tight, loading next page...</Text>}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.cardContainer, animatedStyle]}>
          <JobCard job={currentJob} />
          
          {/* Like overlay */}
          <Animated.View style={[styles.overlay, styles.likeOverlay, likeOpacity]}>
            <Text style={styles.overlayText}>LIKE</Text>
          </Animated.View>
          
          {/* Pass overlay */}
          <Animated.View style={[styles.overlay, styles.passOverlay, passOpacity]}>
            <Text style={styles.overlayText}>PASS</Text>
          </Animated.View>
        </Animated.View>
      </GestureDetector>

      <SwipeButtons
        onSwipeLeft={handleSwipeLeft}
        onSwipeRight={handleSwipeRight}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    backgroundColor: '#f5f5f5',
  },
  cardContainer: {
    width: '100%',
    height: '70%',
    position: 'relative',
  },
  overlay: {
    position: 'absolute',
    top: 50,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 4,
    zIndex: 10,
  },
  likeOverlay: {
    right: 20,
    borderColor: '#4ade80',
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    transform: [{ rotate: '20deg' }],
  },
  passOverlay: {
    left: 20,
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    transform: [{ rotate: '-20deg' }],
  },
  overlayText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.foreground,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.sm,
    color: colors.mutedForeground,
  }
});

export default SwipeInterface;