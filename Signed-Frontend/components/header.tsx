import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { BellIcon, SettingsIcon } from './icons';
import { getColors, spacing, fontSizes, fontWeights } from '../styles/colors';
import { useTheme } from '../contexts/ThemeContext';
import { NotificationPanel } from './notification-panel';
import { Notification } from './notification-item';

interface HeaderProps {
  userName: string;
  notificationCount?: number;
  notifications?: Notification[];
  onProfileClick: () => void;
  onSettingsClick: () => void;
  onNotificationsClick?: () => void;
  onNotificationPress?: (notification: Notification) => void;
  onDismissNotification?: (notificationId: string) => void;
  onMarkAllAsRead?: () => void;
  onRefreshNotifications?: () => void;
}

export const Header = ({
  userName,
  notificationCount = 0,
  notifications = [],
  onProfileClick,
  onSettingsClick,
  onNotificationsClick,
  onNotificationPress,
  onDismissNotification,
  onMarkAllAsRead,
  onRefreshNotifications,
}: HeaderProps) => {
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const [showNotifications, setShowNotifications] = React.useState(false);

  const handleNotificationsClick = () => {
    const wasOpen = showNotifications;
    setShowNotifications(!showNotifications);
    
    if (!wasOpen && onRefreshNotifications) {
      onRefreshNotifications();
    }
    
    if (onNotificationsClick) {
      onNotificationsClick();
    }
  };

  const handleClose = () => {
    setShowNotifications(false);
  };

  const styles = createStyles(colors);

  return (
    <>
      <View style={styles.container}>
        <View style={styles.leftSection}>
          <TouchableOpacity onPress={onProfileClick} style={styles.profileSection}>
            {/* <Image
              source={
                profileImageUri
                  ? { uri: profileImageUri }
                  : { uri: "https://images.unsplash.com/photo-1739298061757-7a3339cee982?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx8cHJvZmVzc2lvbmFsJTIwYnVzaW5lc3MlMjB0ZWFtfGVufDF8fHx8MTc1NzQ3MTQ1MXww&ixlib=rb-4.1.0&q=80&w=1080" }
              }
              style={styles.avatar}
            /> */}
            <View>
              <Text style={styles.greeting}>{greeting}</Text>
              <Text style={styles.userName}>{userName}</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.rightSection}>
          <TouchableOpacity onPress={handleNotificationsClick} style={styles.iconButton}>
            <BellIcon size={24} color={colors.foreground} />
            {notificationCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationText}>
                  {notificationCount > 9 ? '9+' : notificationCount.toString()}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={onSettingsClick} style={styles.iconButton}>
            <SettingsIcon size={24} color={colors.foreground} />
          </TouchableOpacity>
        </View>
      </View>

      <NotificationPanel
        visible={showNotifications}
        notifications={notifications}
        onClose={handleClose}
        onNotificationPress={onNotificationPress}
        onDismissNotification={onDismissNotification}
        onMarkAllAsRead={onMarkAllAsRead}
      />
    </>
  );
};
const hours = new Date().getHours();
const greeting =
  hours < 12 ? "Good morning" :
  hours < 18 ? "Good afternoon" :
  "Good evening";

const createStyles = (colors: ReturnType<typeof getColors>) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  leftSection: {
    flex: 1,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: spacing.sm,
    backgroundColor: colors.border,
  },
  greeting: {
    fontSize: fontSizes.sm,
    color: colors.mutedForeground,
    fontWeight: fontWeights.normal,
  },
  userName: {
    fontSize: fontSizes.lg,
    color: colors.foreground,
    fontWeight: fontWeights.medium,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconButton: {
    padding: spacing.xs,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: colors.destructive,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationText: {
    color: colors.destructiveForeground,
    fontSize: 12,
    fontWeight: fontWeights.medium,
  },
});