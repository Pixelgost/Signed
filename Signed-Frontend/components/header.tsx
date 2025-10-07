import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import { BellIcon, SettingsIcon } from './icons';
import { colors, spacing, fontSizes, fontWeights } from '../styles/colors';
import { useAuth } from './auth-context';

interface HeaderProps {
  userName: string;
  notificationCount?: number;
  onProfileClick: () => void;
  onSettingsClick: () => void;
  onNotificationsClick: () => void;
  onLogout?: () => void;
}

export const Header = ({
  userName,
  notificationCount = 0,
  onProfileClick,
  onSettingsClick,
  onNotificationsClick,
  onLogout,
}: HeaderProps) => {
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      if (onLogout) onLogout();
      console.log('User logged out');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const confirmLogout = () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: handleLogout },
      ],
      { cancelable: true }
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        <TouchableOpacity onPress={onProfileClick} style={styles.profileSection}>
          <Image
            source={{
              uri: "https://images.unsplash.com/photo-1739298061757-7a3339cee982?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx8cHJvZmVzc2lvbmFsJTIwYnVzaW5lc3MlMjB0ZWFtfGVufDF8fHx8MTc1NzQ3MTQ1MXww&ixlib=rb-4.1.0&q=80&w=1080"
            }}
            style={styles.avatar}
          />
          <View>
            <Text style={styles.greeting}>Good morning</Text>
            <Text style={styles.userName}>{userName}</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.rightSection}>
        <TouchableOpacity onPress={onNotificationsClick} style={styles.iconButton}>
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

        {/* Logout button */}
        <TouchableOpacity onPress={confirmLogout} style={[styles.iconButton, {marginLeft: 8}]}>
          <Text style={{ color: 'black', fontWeight: 'bold' }}>Logout</Text>
        </TouchableOpacity>

      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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