import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, fontSizes, fontWeights, borderRadius } from '../styles/colors';

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  type?: 'info' | 'success' | 'warning' | 'error';
  onPress?: () => void;
}

interface NotificationItemProps {
  notification: Notification;
  onPress?: () => void;
  onDismiss?: () => void;
}

export const NotificationItem = ({ 
  notification, 
  onPress,
  onDismiss 
}: NotificationItemProps) => {
  const timeAgo = getTimeAgo(notification.timestamp);

  return (
    <TouchableOpacity
      style={[
        styles.container,
        !notification.read && styles.unreadContainer
      ]}
      onPress={onPress || notification.onPress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{notification.title}</Text>
          {!notification.read && <View style={styles.unreadDot} />}
        </View>
        <Text style={styles.message} numberOfLines={2}>
          {notification.message}
        </Text>
        <Text style={styles.timestamp}>{timeAgo}</Text>
      </View>
      {onDismiss && (
        <TouchableOpacity
          style={styles.dismissButton}
          onPress={onDismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.dismissText}>×</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}m ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}d ago`;
  }
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: 80,
  },
  unreadContainer: {
    backgroundColor: colors.accent,
  },
  content: {
    flex: 1,
    marginRight: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold as any,
    color: colors.foreground,
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginLeft: spacing.xs,
  },
  message: {
    fontSize: fontSizes.sm,
    color: colors.mutedForeground,
    marginBottom: spacing.xs,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: fontSizes.xs,
    color: colors.mutedForeground,
  },
  dismissButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.full,
    backgroundColor: colors.muted,
  },
  dismissText: {
    fontSize: 20,
    color: colors.mutedForeground,
    lineHeight: 20,
  },
});

