import React from 'react';
import { View, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { XIcon, FeatherIcon } from './icons';
import { colors, spacing, shadows } from '../styles/colors';

interface SwipeButtonsProps {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}

export const SwipeButtons = ({ onSwipeLeft, onSwipeRight }: SwipeButtonsProps) => {
  const handlePassPress = () => {
    // Add button animation feedback
    onSwipeLeft();
  };

  const handleLikePress = () => {
    // Add button animation feedback
    onSwipeRight();
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, styles.passButton]}
        onPress={handlePassPress}
        activeOpacity={0.8}
      >
        <XIcon size={32} color={colors.destructiveForeground} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.likeButton]}
        onPress={handleLikePress}
        activeOpacity={0.8}
      >
        <FeatherIcon size={32} color={colors.primaryForeground} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.xl,
    gap: spacing.xl,
  },
  button: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.lg,
  },
  passButton: {
    backgroundColor: colors.destructive,
  },
  likeButton: {
    backgroundColor: colors.primary,
  },
});