import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    borderRadius,
    colors,
    fontSizes,
    fontWeights,
    spacing,
} from '../styles/colors';

type ExampleUser = {
    id: string;
    username: string;
    email: string;
    createdAt: string;
};

const exampleUser: ExampleUser = {
    id: 'user_123',
    username: 'alexjohnson',
    email: 'alex@example.com',
    createdAt: '2024-08-10',
};

// TODO: SET UP CORRECT API CALL TO BACKEND --> maybe use FastAPI?
async function apiChangePassword(current: string, next: string): Promise<boolean> {
    try {
        const res = await fetch('api call for changing password?', {
            method: 'POST', //update
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ current_password: current, new_password: next }),
        });
        return res.ok;
    } catch {
        return false;
    }
}

async function apiDeleteAccount(): Promise<boolean> {
    try {
        const res = await fetch('api call for delete?', {
        method: 'DELETE', //delete acc
        credentials: 'include',
        });
        return res.ok;
    } catch {
        return false;
    }
}

async function apiSignOut(): Promise<boolean> {
    try {
        const res = await fetch('api call for sign out?', {
        method: 'POST',
        credentials: 'include',
        });
        return res.ok;
    } catch {
        return false;
    }
}


// settings
export const SettingsScreen: React.FC = () => {
    // change password form
    const [currentPw, setCurrentPw] = useState('');
    const [newPw, setNewPw] = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const [isChanging, setIsChanging] = useState(false);

    // delete modal
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteText, setDeleteText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    // sign out
    const [isSigningOut, setIsSigningOut] = useState(false);

    const onChangePassword = async () => {
        if (!currentPw || !newPw || !confirmPw) {
            Alert.alert('Missing fields', 'Please fill out all password fields.');
            return;
        }
        if (newPw !== confirmPw) {
            Alert.alert('Mismatch', 'New passwords do not match.');
            return;
        }
        setIsChanging(true);
        const ok = await apiChangePassword(currentPw, newPw);
        setIsChanging(false);
        if (ok) {
            setCurrentPw('');
            setNewPw('');
            setConfirmPw('');
            Alert.alert('Success', 'Your password has been updated.');
        } else {
            Alert.alert('Error', 'Could not change password. Please try again.');
        }
    };

    const onConfirmDelete = async () => {
    if (deleteText !== 'DELETE') {
        Alert.alert('Confirmation required', 'Please type DELETE to confirm.');
        return;
    }
    setIsDeleting(true);
    const ok = await apiDeleteAccount();
    setIsDeleting(false);
    if (ok) {
        setDeleteOpen(false);
        setDeleteText('');
        Alert.alert('Account deleted', 'Your account has been removed.', [
        { text: 'OK', onPress: () => {/* TODO: navigate to auth screen IF needed */} },
        ]);
    } else {
        Alert.alert('Error', 'Could not delete account. Please try again.');
    }
    };

    const onSignOut = async () => {
    setIsSigningOut(true);
    const ok = await apiSignOut();
    setIsSigningOut(false);
    if (ok) {
        Alert.alert('Signed out', 'You have been signed out.', [
        { text: 'OK', onPress: () => {/* TODO: navigate to login screen */} },
        ]);
    } else {
        Alert.alert('Error', 'Sign out failed. Please try again.');
    }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* user card */}
        <View style={styles.card}>
        <Text style={styles.heading}>Settings</Text>
        <View style={styles.row}>
            <Text style={styles.label}>Username</Text>
            <Text style={styles.value}>{exampleUser.username}</Text>
        </View>
        <View style={styles.row}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{exampleUser.email}</Text>
        </View>
        <View style={styles.row}>
            <Text style={styles.label}>Member since</Text>
            <Text style={styles.value}>{exampleUser.createdAt}</Text>
        </View>
        </View>

      {/* change password */}
        <View style={styles.card}>
        <Text style={styles.subheading}>Change Password</Text>
        <TextInput
            style={styles.input}
            placeholder="Current password"
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry
            value={currentPw}
            onChangeText={setCurrentPw}
        />
        <TextInput
            style={styles.input}
            placeholder="New password"
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry
            value={newPw}
            onChangeText={setNewPw}
        />
        <TextInput
            style={styles.input}
            placeholder="Confirm new password"
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry
            value={confirmPw}
            onChangeText={setConfirmPw}
        />

        <TouchableOpacity style={styles.primaryBtn} onPress={onChangePassword} disabled={isChanging}>
            {isChanging ? <ActivityIndicator /> : <Text style={styles.primaryBtnText}>Update Password</Text>}
        </TouchableOpacity>
        </View>

        {/* Danger zone */}
        <View style={styles.card}>
        <Text style={styles.subheading}>Danger Zone</Text>

        <TouchableOpacity style={styles.dangerBtn} onPress={() => setDeleteOpen(true)}>
            <Text style={styles.dangerBtnText}>Delete Account</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={onSignOut} disabled={isSigningOut}>
            {isSigningOut ? <ActivityIndicator /> : <Text style={styles.secondaryBtnText}>Sign Out</Text>}
        </TouchableOpacity>
        </View>

        {/* delete confirmation modal */}
        <Modal visible={deleteOpen} transparent animationType="fade" onRequestClose={() => setDeleteOpen(false)}>
        <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete Account?</Text>
            <Text style={styles.modalBody}>
                This action is permanent. Type <Text style={{ fontWeight: 'bold' }}>DELETE</Text> to confirm.
            </Text>
            <TextInput
                style={styles.input}
                placeholder="Type DELETE to confirm"
                placeholderTextColor={colors.mutedForeground}
                value={deleteText}
                onChangeText={setDeleteText}
                autoCapitalize="characters"
            />
            <View style={styles.modalActions}>
                <TouchableOpacity style={styles.ghostBtn} onPress={() => setDeleteOpen(false)} disabled={isDeleting}>
                <Text style={styles.ghostBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dangerBtn} onPress={onConfirmDelete} disabled={isDeleting}>
                {isDeleting ? <ActivityIndicator /> : <Text style={styles.dangerBtnText}>Confirm Delete</Text>}
                </TouchableOpacity>
            </View>
            </View>
        </View>
        </Modal>

        <View style={{ height: spacing.xl }} />
        </ScrollView>
    );
};

// Style

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background, //white
  },
  content: {
    padding: spacing.md,
  },
  card: {
    backgroundColor: colors.card ?? '#ffffff',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border ?? '#eee',
  },
  heading: {
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.bold as any,
    color: colors.foreground,
    marginBottom: spacing.sm,
  },
  subheading: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold as any,
    color: colors.foreground,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  label: {
    color: colors.mutedForeground,
    fontSize: fontSizes.sm,
  },
  value: {
    color: colors.foreground,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.medium as any,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border ?? '#e5e7eb',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    marginBottom: spacing.sm,
    color: colors.foreground,
    backgroundColor: colors.background,
    fontSize: fontSizes.base,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: borderRadius.full,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: colors.primaryForeground,
    fontWeight: fontWeights.medium as any,
    fontSize: fontSizes.base,
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: colors.border ?? '#e5e7eb',
    paddingVertical: 12,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  secondaryBtnText: {
    color: colors.foreground,
    fontWeight: fontWeights.medium as any,
  },
  dangerBtn: {
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    borderRadius: borderRadius.full,
    alignItems: 'center',
  },
  dangerBtnText: {
    color: '#fff',
    fontWeight: fontWeights.semibold as any,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: spacing.md,
  },
  modalCard: {
    backgroundColor: colors.card ?? '#fff',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border ?? '#eee',
  },
  modalTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold as any,
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  modalBody: {
    color: colors.mutedForeground,
    marginBottom: spacing.sm,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  ghostBtn: {
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
  },
    ghostBtnText: {
        color: colors.mutedForeground,
        fontWeight: fontWeights.medium as any,
    },
});
