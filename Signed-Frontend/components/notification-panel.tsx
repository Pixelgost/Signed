import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Modal,
  Pressable 
} from 'react-native';
import { NotificationItem, Notification } from './notification-item';
import { colors, spacing, fontSizes, fontWeights, borderRadius, shadows } from '../styles/colors';

interface NotificationPanelProps {
  visible: boolean;
  notifications: Notification[];
  onClose: () => void;
  onNotificationPress?: (notification: Notification) => void;
  onDismissNotification?: (notificationId: string) => void;
  onMarkAllAsRead?: () => void;
}

export const NotificationPanel = ({
  visible,
  notifications,
  onClose,
  onNotificationPress,
  onDismissNotification,
  onMarkAllAsRead,
}: NotificationPanelProps) => {
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotificationPress = (notification: Notification) => {
    if (onNotificationPress) {
      onNotificationPress(notification);
    }
  };

  const handleDismiss = (notificationId: string) => {
    if (onDismissNotification) {
      onDismissNotification(notificationId);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.panel} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Notifications</Text>
              {unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.headerActions}>
              {unreadCount > 0 && onMarkAllAsRead && (
                <TouchableOpacity
                  onPress={onMarkAllAsRead}
                  style={styles.markAllButton}
                >
                  <Text style={styles.markAllText}>Mark all read</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeText}>×</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {notifications.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No notifications</Text>
                <Text style={styles.emptySubtext}>
                  You're all caught up!
                </Text>
              </View>
            ) : (
              notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onPress={() => handleNotificationPress(notification)}
                  onDismiss={() => handleDismiss(notification.id)}
                />
              ))
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 60,
  },
  panel: {
    width: '85%',
    maxWidth: 400,
    height: '80%',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    ...shadows.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colors.foreground,
    marginRight: spacing.sm,
  },
  unreadBadge: {
    backgroundColor: colors.destructive,
    borderRadius: borderRadius.full,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: colors.destructiveForeground,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  markAllButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  markAllText: {
    fontSize: fontSizes.sm,
    color: colors.primary,
    fontWeight: fontWeights.medium,
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.full,
    backgroundColor: colors.muted,
  },
  closeText: {
    fontSize: 24,
    color: colors.foreground,
    lineHeight: 24,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    fontSize: fontSizes.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
});

