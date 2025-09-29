import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { FeatherIcon, MessageCircleIcon, XIcon } from './icons';
import { colors, spacing, fontSizes, fontWeights, borderRadius, shadows } from '../styles/colors';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface Job {
  title: string;
  company: string;
  companyLogo: string;
}

interface MatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendMessage: () => void;
  job: Job;
  userAvatar: string;
}

export const MatchModal = ({
  isOpen,
  onClose,
  onSendMessage,
  job,
  userAvatar,
}: MatchModalProps) => {
  return (
    <Modal
      visible={isOpen}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <XIcon size={24} color={colors.mutedForeground} />
          </TouchableOpacity>

          <View style={styles.content}>
            {/* Celebration header */}
            <View style={styles.celebrationContainer}>
              <FeatherIcon size={48} color={colors.primary} />
              <Text style={styles.title}>It's a Match!</Text>
              <Text style={styles.subtitle}>
                You and {job.company} liked each other
              </Text>
            </View>

            {/* Avatar section */}
            <View style={styles.avatarSection}>
              <View style={styles.avatarContainer}>
                <Image source={{ uri: userAvatar }} style={styles.userAvatar} />
                <View style={styles.avatarLabel}>
                  <Text style={styles.avatarLabelText}>You</Text>
                </View>
              </View>

              <View style={styles.matchConnector}>
                <View style={styles.matchLine} />
                <FeatherIcon size={24} color={colors.primary} />
                <View style={styles.matchLine} />
              </View>

              <View style={styles.avatarContainer}>
                <Image source={{ uri: job.companyLogo }} style={styles.companyAvatar} />
                <View style={styles.avatarLabel}>
                  <Text style={styles.avatarLabelText}>{job.company}</Text>
                </View>
              </View>
            </View>

            {/* Job info */}
            <View style={styles.jobInfo}>
              <Text style={styles.jobTitle}>{job.title}</Text>
              <Text style={styles.companyName}>at {job.company}</Text>
            </View>

            {/* Action buttons */}
            <View style={styles.actions}>
              <TouchableOpacity style={styles.messageButton} onPress={onSendMessage}>
                <MessageCircleIcon size={20} color={colors.primaryForeground} />
                <Text style={styles.messageButtonText}>Send Message</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.keepSwipingButton} onPress={onClose}>
                <Text style={styles.keepSwipingText}>Keep Swiping</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  modal: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    width: '100%',
    maxWidth: 400,
    ...shadows.lg,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    zIndex: 10,
    padding: spacing.xs,
  },
  content: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  celebrationContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: fontSizes['3xl'],
    fontWeight: fontWeights.bold,
    color: colors.foreground,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSizes.base,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
    width: '100%',
    justifyContent: 'space-between',
  },
  avatarContainer: {
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: spacing.sm,
  },
  companyAvatar: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  avatarLabel: {
    backgroundColor: colors.muted,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  avatarLabelText: {
    fontSize: fontSizes.sm,
    color: colors.foreground,
    fontWeight: fontWeights.medium,
  },
  matchConnector: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    flexDirection: 'row',
  },
  matchLine: {
    height: 2,
    backgroundColor: colors.primary,
    flex: 1,
    marginHorizontal: spacing.xs,
  },
  jobInfo: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  jobTitle: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.semibold,
    color: colors.foreground,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  companyName: {
    fontSize: fontSizes.base,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  actions: {
    width: '100%',
    gap: spacing.md,
  },
  messageButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
    ...shadows.md,
  },
  messageButtonText: {
    color: colors.primaryForeground,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
  },
  keepSwipingButton: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  keepSwipingText: {
    color: colors.mutedForeground,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.medium,
  },
});