import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { colors, spacing, fontSizes, fontWeights, borderRadius } from '../styles/colors';
import Constants from 'expo-constants';
import { Linking } from 'react-native';

interface ShareJobModalProps {
  visible: boolean;
  jobId: string;
  onClose: () => void;
}

export const ShareJobModal: React.FC<ShareJobModalProps> = ({
  visible,
  jobId,
  onClose,
}) => {
  const [shareLink, setShareLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const machineIp = Constants.expoConfig?.extra?.MACHINE_IP;
  const BASE_URL = `http://${machineIp}:8000`;

  useEffect(() => {
    if (visible && jobId) {
      generateShareLink();
    }
  }, [visible, jobId]);

  const generateShareLink = async () => {
    setLoading(true);
    setCopied(false);
    try {
      const response = await fetch(
        `${BASE_URL}/api/v1/users/share-job-posting/?job_id=${jobId}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const data = await response.json();

      if (response.ok && data.share_link) {
        // Build a full HTTP link for sharing
        setShareLink(data.share_link);
      } else if (response.ok && data.share_token) {
        // fallback in case data.share_link is null
        const fullLink = `http://${machineIp}:8000/job-share/${data.share_token}`;
        setShareLink(fullLink);
      } else {
        Alert.alert('Error', data.message || 'Failed to generate share link');
      }
    } catch (error) {
      console.error('Error generating share link:', error);
      Alert.alert('Error', 'Could not generate share link');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      await Clipboard.setStringAsync(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      Alert.alert('Error', 'Failed to copy link');
    }
  };

  const encodedMessage = encodeURIComponent('Check out this job I found on Signed: ' + shareLink);

  const handleShareSms = () => {
    if (!shareLink) return;
    Linking.openURL(`sms:&body=${encodedMessage}`);
  };

  const handleShareWhatsApp = () => {
    if (!shareLink) return;
    Linking.canOpenURL('whatsapp://send?text=hello').then(canOpen => {
    if (canOpen) Linking.openURL(`whatsapp://send?text=${encodedMessage}`);
    else Alert.alert("WhatsApp is not installed");
  });
  };

  const handleShareLinkedIn = () => {
    if (!shareLink) return;
    const url = encodeURIComponent(shareLink);
    Linking.openURL(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Share Job Posting</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Generating share link...</Text>
            </View>
          ) : shareLink ? (
            <View style={styles.content}>
              <Text style={styles.description}>
                Share this link with others to let them view this job posting:
              </Text>

              <View style={styles.linkContainer}>
                <TextInput
                  style={styles.linkInput}
                  value={shareLink}
                  editable={false}
                  selectionColor={colors.primary}
                />
              </View>

              <TouchableOpacity
                style={[styles.copyButton, copied && styles.copyButtonActive]}
                onPress={handleCopyToClipboard}
              >
                <Text style={styles.copyButtonText}>
                  {copied ? '✓ Copied!' : 'Copy Link'}
                </Text>
              </TouchableOpacity>

              {/* Share buttons row */}
              <View style={styles.shareButtonsRow}>
                <TouchableOpacity style={styles.shareButton} onPress={handleShareSms}>
                  <Text style={styles.shareButtonText}>iMessage</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.shareButton} onPress={handleShareWhatsApp}>
                  <Text style={styles.shareButtonText}>WhatsApp</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.shareButton} onPress={handleShareLinkedIn}>
                  <Text style={styles.shareButtonText}>LinkedIn</Text>
                </TouchableOpacity>
              </View>

            </View>
          ) : (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Failed to generate share link</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={generateShareLink}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  container: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    color: colors.foreground,
  },
  closeButton: {
    fontSize: fontSizes['2xl'],
    color: colors.mutedForeground,
    padding: spacing.sm,
  },
  content: {
    marginVertical: spacing.md,
  },
  description: {
    fontSize: fontSizes.base,
    color: colors.foreground,
    marginBottom: spacing.md,
    lineHeight: 22,
  },
  linkContainer: {
    marginBottom: spacing.md,
  },
  linkInput: {
    backgroundColor: colors.inputBackground,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSizes.sm,
    color: colors.foreground,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 50,
  },
  copyButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  copyButtonActive: {
    backgroundColor: '#1B8F36',
  },
  copyButtonText: {
    color: colors.primaryForeground,
    fontWeight: fontWeights.semibold,
    fontSize: fontSizes.base,
  },
  infoText: {
    fontSize: fontSizes.sm,
    color: colors.mutedForeground,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  loadingText: {
    fontSize: fontSizes.base,
    color: colors.foreground,
    marginTop: spacing.md,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  errorText: {
    fontSize: fontSizes.base,
    color: '#EF4444',
    marginBottom: spacing.md,
  },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  retryButtonText: {
    color: colors.primaryForeground,
    fontWeight: fontWeights.semibold,
  },
  closeBtn: {
    backgroundColor: colors.muted,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  closeBtnText: {
    color: colors.foreground,
    fontWeight: fontWeights.semibold,
    fontSize: fontSizes.base,
  },
  shareButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  shareButton: {
    flex: 1,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  shareButtonText: {
    color: colors.foreground,
    fontWeight: fontWeights.semibold,
    fontSize: fontSizes.sm,
  },
});
