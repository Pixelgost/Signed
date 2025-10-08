import { useState } from 'react';
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

// can import screens?
import Constants from "expo-constants";
import { useNavigation } from 'expo-router';
import { getAuth } from 'firebase/auth';

const machineIp = Constants.expoConfig?.extra?.MACHINE_IP;

async function getFirebaseIdToken(): Promise<string | null> {
    try {
        const user = getAuth().currentUser;
        if (!user) {
            return null;
        }
        return await user.getIdToken(true);
    } catch {
        return null;
    }
}

type ExampleUser = {
    id: string;
    username: string;
    email: string;
    createdAt: string;
};

type SettingsProps = {
    onSignOut: () => void;
}

const exampleUser: ExampleUser = {
    id: 'user_123',
    username: 'alexjohnson',
    email: 'alex@example.com',
    createdAt: '2024-08-10',
};

async function apiChangePasswordInit(email: string, currentPw?: string): Promise<boolean> {
    try {
        const res = await fetch(`http://${machineIp}:8000/api/v1/users/auth/pw-change/init/`, {
            method: 'POST', //update
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(
                currentPw ? {email, current_password: currentPw} : {email}
            ),
        });
        return res.ok;
    } catch {
        return false;
    }
}

async function apiChangePasswordConfirm(email: string, oobCode:string, newPassword: string): Promise<boolean> {
    try {
        const res = await fetch(`http://${machineIp}:8000/api/v1/users/auth/pw-change/confirm/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({email, oob_code: oobCode, new_password: newPassword}),
        });
        return res.ok;
    } catch {
        return false;
    }
}

async function apiDeleteAccountInit(): Promise<boolean> {
    try {
        const idToken = await getFirebaseIdToken();
        if (!idToken) {
            Alert.alert('Not signed in', 'Missing Firebase Session. Please sign in.');
            return false;
        }
        const res = await fetch(`http://${machineIp}:8000/api/v1/users/auth/delete/init/`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${idToken}`},
        });
        return res.ok;
    } catch {
        return false;
    }
}

async function apiDeleteAccountConfirm(): Promise<boolean> {
    try {
        const idToken = await getFirebaseIdToken();
        if (!idToken) {
            Alert.alert('Not signed in', 'Missing firebase session, Please sign in.');
            return false;
        }
        const res = await fetch(`http://${machineIp}:8000/api/v1/users/auth/delete/confirm/`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${idToken}` },
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
export const SettingsScreen = ({onSignOut}: SettingsProps) => {
    const [emailForPw, setEmailForPw] = useState('');
    const [currentPw, setCurrentPw] = useState('');
    const [isPwInitSending, setPwInitSending] = useState(false);

    // change password
    const [pwConfirmOpen, setPwConfirmOpen] = useState(false);
    const [oobCode, setOobCode] = useState('');
    const [newPw, setNewPw] = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const [isPwConfirming, setPwConfirming] = useState(false);

    // delete account
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [isDeleteInit, setDeleteInit] = useState(false);
    const [isDeleteConfirming, setDeleteConfirming] = useState(false);

    // sign out
    const [isSigningOut, setIsSigningOut] = useState(false);

    //navigation
    const navigate = useNavigation();

    const onStartPwChange = async () => {
        if (!emailForPw) {
            Alert.alert('Missing email', 'Please enter the email for the account.');
            return;
        }
        setPwInitSending(true);
        const ok = await apiChangePasswordInit(emailForPw.trim(), currentPw || undefined);
        setPwInitSending(false);
        if (ok) {
            Alert.alert(
                'Check your email',
                'We sent a password reset link. Copy the code from the link and paste it below.'
            );
            setPwConfirmOpen(true);
        } else {
            Alert.alert('Error', 'Could not send reset email. Please verify your email and try again.');
        }
    };

    const onConfirmPwChange = async () => {
        if (!emailForPw || !oobCode || !newPw) {
            Alert.alert('Missing fields', 'Please enter email, code and new password.');
            return;
        }
        if (newPw !== confirmPw) {
            Alert.alert('Mismatch', 'New passwords do not match.');
            return;
        }
        setPwConfirming(true);
        const ok = await apiChangePasswordConfirm(emailForPw.trim(), oobCode.trim(), newPw);
        setPwConfirming(false);
        if (ok) {
            setPwConfirmOpen(false);
            setOobCode('');
            setNewPw('');
            setConfirmPw('');
            setCurrentPw('');
            Alert.alert('Success', 'Your password has been updated.');
        } else {
            Alert.alert('Error', 'Invalid code or server error. Please try again.');
        }
    };

    const onDeleteInit = async () => {
        setDeleteInit(true);
        const ok = await apiDeleteAccountInit();
        setDeleteInit(false);
        if (ok) {
            Alert.alert(
                'Verify your email',
                'We sent a verification email. After clicking the link, press "I verified, delete my account" below.'
            );
            setDeleteOpen(true);
        } else {
            Alert.alert('Error', 'Could not start deletion. Please try again.');
        }
    };

    const onDeleteConfirm = async () => {
        setDeleteConfirming(true);
        const ok = await apiDeleteAccountConfirm();
        setDeleteConfirming(false);
        if (ok) {
            setDeleteOpen(false);
            Alert.alert('Account deleted', 'Your account has been removed.', [
            { text: 'OK', onPress: () => onSignOut() },
            ]);
        } else {
            Alert.alert(
            'Not verified',
            'We did not detect an email verification yet. Please click the link in the email, then try again.'
            );
        }
    };
    
    const onSignOutPress = async () => {
        setIsSigningOut(true);
        const ok = await apiSignOut();
        setIsSigningOut(false);
        if (ok) {
            Alert.alert('Signed out', 'You have been signed out.', [
            { text: 'OK', onPress: () => onSignOut() }, //should move user to login screen
            ]);
        } else {
            Alert.alert('Error', 'Sign out failed. Please try again.');
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Change password (step 1) */}
        <View style={styles.card}>
        <Text style={styles.heading}>Change Password</Text>

        <TextInput
            style={styles.input}
            placeholder="Account email"
            placeholderTextColor={colors.mutedForeground}
            value={emailForPw}
            onChangeText={setEmailForPw}
            autoCapitalize="none"
            keyboardType="email-address"
        />
        <TextInput
            style={styles.input}
            placeholder="Current password (optional)"
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry
            value={currentPw}
            onChangeText={setCurrentPw}
        />

        <TouchableOpacity
            style={styles.primaryBtn}
            onPress={onStartPwChange}
            disabled={isPwInitSending}
        >
            {isPwInitSending ? <ActivityIndicator /> : <Text style={styles.primaryBtnText}>
            Send reset email
            </Text>}
        </TouchableOpacity>

        <Text style={{ marginTop: 8, color: colors.mutedForeground }}>
            After you receive the email, paste the code and new password in the dialog that opens.
        </Text>
        </View>

        {/* Danger zone */}
        <View style={styles.card}>
        <Text style={styles.heading}>Danger Zone</Text>

        <TouchableOpacity style={styles.dangerBtn} onPress={onDeleteInit} disabled={isDeleteInit}>
            {isDeleteInit ? <ActivityIndicator /> : <Text style={styles.dangerBtnText}>Delete Account</Text>}
        </TouchableOpacity>

        <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={onSignOutPress}
            disabled={isSigningOut}
        >
            {isSigningOut ? <ActivityIndicator /> : <Text style={styles.secondaryBtnText}>Sign Out</Text>}
        </TouchableOpacity>
        </View>

        {/* password change */}
        <Modal visible={pwConfirmOpen} transparent animationType="fade" onRequestClose={() => setPwConfirmOpen(false)}>
        <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Finish Changing Password</Text>
            <Text style={styles.modalBody}>
                Paste the code (oobCode) from the email link and enter your new password.
            </Text>

            <TextInput
                style={styles.input}
                placeholder="Code from email (oobCode)"
                placeholderTextColor={colors.mutedForeground}
                value={oobCode}
                onChangeText={setOobCode}
                autoCapitalize="none"
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

            <View style={styles.modalActions}>
                <TouchableOpacity style={styles.ghostBtn} onPress={() => setPwConfirmOpen(false)} disabled={isPwConfirming}>
                <Text style={styles.ghostBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryBtn} onPress={onConfirmPwChange} disabled={isPwConfirming}>
                {isPwConfirming ? <ActivityIndicator /> : <Text style={styles.primaryBtnText}>Update Password</Text>}
                </TouchableOpacity>
            </View>
            </View>
        </View>
        </Modal>

        {/* Delete confirm modal */}
        <Modal visible={deleteOpen} transparent animationType="fade" onRequestClose={() => setDeleteOpen(false)}>
        <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Finalize Deletion</Text>
            <Text style={styles.modalBody}>
                After clicking the verification link sent to your email, press the button below to delete your account.
            </Text>

            <View style={styles.modalActions}>
                <TouchableOpacity style={styles.ghostBtn} onPress={() => setDeleteOpen(false)} disabled={isDeleteConfirming}>
                <Text style={styles.ghostBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dangerBtn} onPress={onDeleteConfirm} disabled={isDeleteConfirming}>
                {isDeleteConfirming ? <ActivityIndicator /> : <Text style={styles.dangerBtnText}>
                    I verified, delete my account
                </Text>}
                </TouchableOpacity>
            </View>
            </View>
        </View>
        </Modal>

        <View style={{ height: spacing.xl }} />
        </ScrollView>
    );
}

// ---- styles -----------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
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
  secondaryBtnText: { color: colors.foreground, fontWeight: fontWeights.medium as any },
  dangerBtn: {
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    borderRadius: borderRadius.full,
    alignItems: 'center',
  },
  dangerBtnText: { color: '#fff', fontWeight: fontWeights.semibold as any },
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
  modalBody: { color: colors.mutedForeground, marginBottom: spacing.sm },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
  ghostBtn: { paddingVertical: 12, paddingHorizontal: spacing.md, borderRadius: borderRadius.full },
  ghostBtnText: { color: colors.mutedForeground, fontWeight: fontWeights.medium as any },
});