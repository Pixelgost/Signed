import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanGestureHandler,
  State,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  runOnJS,
  withSpring,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { JobCard } from './job-card';
import { SwipeButtons } from './swipe-buttons';
import { colors, spacing } from '../styles/colors';

const sampleJobs = [
  {
    id: '1',
    title: 'Frontend Developer Intern',
    company: 'TechFlow',
    location: 'San Francisco, CA',
    salary: '$35-45/hr',
    type: 'Internship',
    duration: '3 months',
    description: 'Join our dynamic team to build cutting-edge web applications using React and TypeScript.',
    requirements: ['React', 'TypeScript', 'CSS'],
    companyLogo: "https://images.unsplash.com/photo-1657885428127-38a40be4e232?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx8Y29tcGFueSUyMGxvZ28lMjBkZXNpZ258ZW58MXx8fHwxNzU3NDM3NTQ1fDA&ixlib=rb-4.1.0&q=80&w=1080",
    images: [
      "https://images.unsplash.com/photo-1497366216548-37526070297c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx8b2ZmaWNlJTIwd29ya3NwYWNlfGVufDF8fHx8MTc1NzQ3MTQ1MXww&ixlib=rb-4.1.0&q=80&w=1080"
    ]
  },
  {
    id: '2',
    title: 'Data Science Intern',
    company: 'DataCore',
    location: 'New York, NY',
    salary: '$40-50/hr',
    type: 'Internship',
    duration: '4 months',
    description: 'Work with large datasets and machine learning models to drive business insights.',
    requirements: ['Python', 'Machine Learning', 'SQL'],
    companyLogo: "https://images.unsplash.com/photo-1657885428127-38a40be4e232?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx8Y29tcGFueSUyMGxvZ28lMjBkZXNpZ258ZW58MXx8fHwxNzU3NDM3NTQ1fDA&ixlib=rb-4.1.0&q=80&w=1080",
    images: [
      "https://images.unsplash.com/photo-1551434678-e076c223a692?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx8ZGF0YSUyMGFuYWx5dGljcyUyMG9mZmljZXxlbnwxfHx8fDE3NTc0NzE0NTF8MA&ixlib=rb-4.1.0&q=80&w=1080"
    ]
  },
  {
    id: '3',
    title: 'Product Manager',
    company: 'InnovateCorp',
    location: 'Austin, TX',
    salary: '$120K-150K',
    type: 'Full-time',
    duration: 'Permanent',
    description: 'Lead product strategy and development for our flagship mobile application.',
    requirements: ['Product Strategy', 'Agile', 'Analytics'],
    companyLogo: "https://images.unsplash.com/photo-1657885428127-38a40be4e232?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx8Y29tcGFueSUyMGxvZ28lMjBkZXNpZ258ZW58MXx8fHwxNzU3NDM3NTQ1fDA&ixlib=rb-4.1.0&q=80&w=1080",
    images: [
      "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx8bW9kZXJuJTIwb2ZmaWNlJTIwbWVldGluZ3xlbnwxfHx8fDE3NTc0NzE0NTF8MA&ixlib=rb-4.1.0&q=80&w=1080"
    ]
  }
];

interface SwipeInterfaceProps {
  onMatchFound?: () => void;
}

export const SwipeInterface = ({ onMatchFound }: SwipeInterfaceProps) => {
  const [currentJobIndex, setCurrentJobIndex] = useState(0);
  const translateX = useSharedValue(0);
  const rotate = useSharedValue(0);

  const currentJob = sampleJobs[currentJobIndex];

  const nextCard = () => {
    if (currentJobIndex < sampleJobs.length - 1) {
      setCurrentJobIndex(currentJobIndex + 1);
    } else {
      setCurrentJobIndex(0); // Loop back to start
    }
  };

  const handleSwipeRight = () => {
    // Simulate match chance (30% of the time)
    if (Math.random() < 0.3 && onMatchFound) {
      onMatchFound();
    }
    nextCard();
  };

  const handleSwipeLeft = () => {
    nextCard();
  };

  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, context) => {
      context.startX = translateX.value;
    },
    onActive: (event, context) => {
      translateX.value = context.startX + event.translationX;
      rotate.value = interpolate(
        translateX.value,
        [-300, 0, 300],
        [-15, 0, 15],
        Extrapolate.CLAMP
      );
    },
    onEnd: (event) => {
      const shouldSwipe = Math.abs(event.velocityX) > 500 || Math.abs(translateX.value) > 150;
      
      if (shouldSwipe) {
        if (translateX.value > 0) {
          // Swipe right
          translateX.value = withSpring(400, {}, () => {
            runOnJS(handleSwipeRight)();
            translateX.value = 0;
            rotate.value = 0;
          });
        } else {
          // Swipe left
          translateX.value = withSpring(-400, {}, () => {
            runOnJS(handleSwipeLeft)();
            translateX.value = 0;
            rotate.value = 0;
          });
        }
      } else {
        // Return to center
        translateX.value = withSpring(0);
        rotate.value = withSpring(0);
      }
    },
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

  if (!currentJob) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No more jobs to show!</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PanGestureHandler onGestureEvent={gestureHandler}>
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
      </PanGestureHandler>

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
});