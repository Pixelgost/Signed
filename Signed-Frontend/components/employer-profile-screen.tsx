import React, { useState } from 'react';
import {
    Image,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    borderRadius,
    colors,
    fontSizes,
    fontWeights,
    spacing
} from '../styles/colors';
import {
    BellIcon,
    BriefcaseIcon,
    ChevronRightIcon,
    MapPinIcon,
    MessageCircleIcon,
    SettingsIcon,
    UserIcon,
} from './icons';


// tweak the profile Data
const employerData = {
    companyName: 'Brian Corp.',
    headline: 'Selling Brian limbs in 2025',
    industry: 'Software',
    location: 'San Francisco, CA',
    logo: "https://images.unsplash.com/photo-1739298061757-7a3339cee982?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx8cHJvZmVzc2lvbmFsJTIwYnVzaW5lc3MlMjB0ZWFtfGVufDF8fHx8MTc1NzQ3MTQ1MXww&ixlib=rb-4.1.0&q=80&w=1080",
    about: 'Brian limbs are yummy yum yum',
    values: ['Customer Satisfaction', 'Craftsmanship', 'Great Foods'],
    size: '1-10',
    founded: '2003',
    website: 'yum.com',
    openRoles: [
        {
        title: 'Butcher',
        location: 'My Basement',
        duration: 'Summer 2026',
        description: 'Noooo please dont chop me up!!!'
        },
    {
        title: 'Web Development Intern',
        location: 'Remote (US)',
        duration: 'Spring 2026',
        description: 'Make tyhe web.'
    }
    ]
};

export const EmployerProfileScreen = () => {
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [locationVisible, setLocationVisible] = useState(true);
    const [autoScreening, setAutoScreening] = useState(false);

    // screen
    const Selection = ({
        title,
        children,
    }: {
        title: string;
        children: React.ReactNode;
    }) => (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {children}
        </View>
    );

    const SettingsItem = ({
    icon,
    title,
    subtitle,
    onPress,
    rightComponent,
    }: {
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightComponent?: React.ReactNode;
    }) => (
    <TouchableOpacity
        style={styles.settingsItem}
        activeOpacity={onPress ? 0.7 : 1}
        onPress={onPress}
    >
        <View style={styles.settingsItemLeft}>
        <View style={styles.settingsIcon}>{icon}</View>
        <View>
            <Text style={styles.settingsTitle}>{title}</Text>
            {subtitle ? (
            <Text style={styles.settingsSubtitle}>{subtitle}</Text>
            ) : null}
        </View>
        </View>
        {rightComponent || (
        <ChevronRightIcon size={20} color={colors.mutedForeground} />
        )}
    </TouchableOpacity>
    );

    const ValueBadge = ({ label }: { label: string }) => (
        <View style={styles.valueBadge}>
        <Text style={styles.valueText}>{label}</Text>
        </View>
    );

    const RoleCard = ({
        role,
    }: {
        role: typeof employerData.openRoles[0];
    }) => (
    <View style={styles.roleCard}>
        <View style={styles.roleHeader}>
        <Text style={styles.roleTitle}>{role.title}</Text>
        <View style={styles.rolePill}>
            <BriefcaseIcon size={14} color={colors.primaryForeground} />
            <Text style={styles.rolePillText}>{role.type}</Text>
        </View>
    </View>
    <Text style={styles.roleLocation}>{role.location}</Text>
    <Text style={styles.roleBlurb}>{role.blurb}</Text>
    <View style={styles.roleActions}>
        <TouchableOpacity style={styles.primaryBtn}>
        <Text style={styles.primaryBtnText}>View Role</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn}>
        <Text style={styles.secondaryBtnText}>Share</Text>
        </TouchableOpacity>
    </View>
    </View>
    );

    return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Company header */}
        <View style={styles.header}>
        <Image source={{ uri: employerData.logo }} style={styles.logo} />
        <Text style={styles.companyName}>{employerData.companyName}</Text>
        <Text style={styles.headline}>{employerData.headline}</Text>

        <View style={styles.metaRow}>
        <BriefcaseIcon size={16} color={colors.mutedForeground} />
        <Text style={styles.metaText}>{employerData.industry}</Text>
        </View>

        <View style={styles.metaRow}>
        <MapPinIcon size={16} color={colors.mutedForeground} />
        <Text style={styles.metaText}>{employerData.location}</Text>
        </View>

        <TouchableOpacity style={styles.editButton}>
        <Text style={styles.editButtonText}>Edit Company Profile</Text>
        </TouchableOpacity>
    </View>

      {/* About */}
    <Section title="About">
        <Text style={styles.bodyText}>{employerData.about}</Text>
    </Section>

      {/* Company details */}
    <Section title="Company Details">
        <View style={styles.detailsGrid}>
        <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Company Size</Text>
            <Text style={styles.detailValue}>{employerData.size}</Text>
        </View>
        <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Founded</Text>
            <Text style={styles.detailValue}>{employerData.founded}</Text>
        </View>
        <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Website</Text>
            <Text style={styles.detailValue}>{employerData.website}</Text>
        </View>
        <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>HQ</Text>
            <Text style={styles.detailValue}>{employerData.location}</Text>
        </View>
        </View>
    </Section>

    {/* Values */}
    <Section title="Company Values">
        <View style={styles.valuesWrap}>
        {employerData.values.map((v) => (
            <ValueBadge key={v} label={v} />
        ))}
        </View>
    </Section>

    {/* Open roles */}
    <Section title="Open Roles">
        {employerData.openRoles.map((r, i) => (
            <RoleCard key={`${r.title}-${i}`} role={r} />
        ))}
    </Section>

      {/* Preferences */}
    <Section title="Hiring Preferences">
        <SettingsItem
        icon={<BellIcon size={20} color={colors.foreground} />}
        title="New applicant notifications"
        subtitle="Get notified when candidates apply"
        rightComponent={
            <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: colors.muted, true: colors.primary }}
                thumbColor={colors.background}
            />
        }
    />

        <SettingsItem
            icon={<MapPinIcon size={20} color={colors.foreground} />}
            title="Show company location"
            subtitle="Visible on your public profile"
            rightComponent={
            <Switch
                value={showLocation}
                onValueChange={setShowLocation}
                trackColor={{ false: colors.muted, true: colors.primary }}
                thumbColor={colors.background}
            />
        }
        />

        <SettingsItem
            icon={<BriefcaseIcon size={20} color={colors.foreground} />}
            title="Auto-screening"
            subtitle="Auto-reject applicants who do not meet must-have criteria"
            rightComponent={
            <Switch
                value={autoScreening}
                onValueChange={setAutoScreening}
                trackColor={{ false: colors.muted, true: colors.primary }}
                thumbColor={colors.background}
            />
            }
        />
        </Section>

    {/* Account / team management */}
    <Section title="Account & Team">
        <SettingsItem
            icon={<UserIcon size={20} color={colors.foreground} />}
            title="Team members"
            subtitle="Invite recruiters and hiring managers"
            onPress={() => console.log('Team members')}
        />
        <SettingsItem
            icon={<MessageCircleIcon size={20} color={colors.foreground} />}
            title="Candidate messaging"
            subtitle="Templates, auto-replies, and brand tone"
            onPress={() => console.log('Candidate messaging')}
        />
        <SettingsItem
            icon={<SettingsIcon size={20} color={colors.foreground} />}
            title="Company settings"
            subtitle="Brand assets, billing, and integrations"
            onPress={() => console.log('Company settings')}
        />
    </Section>

      <View style={{ height: spacing.xl }} />
    </ScrollView>
    );
};

// ---------------------------------
// Styles – aligned with employee UI
// ---------------------------------
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },

    header: {
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingTop: spacing.md,
        paddingBottom: spacing.xl,
    },
    logo: {
        width: 112,
        height: 112,
        borderRadius: 24,
        marginBottom: spacing.md,
    },
    companyName: {
        fontSize: fontSizes['2xl'],
        fontWeight: fontWeights.bold,
        color: colors.foreground,
    },
    headline: {
        marginTop: spacing.xs,
        fontSize: fontSizes.base,
        color: colors.mutedForeground,
        textAlign: 'center',
        paddingHorizontal: spacing.md,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginTop: spacing.xs,
    },
    metaText: {
        color: colors.mutedForeground,
        fontSize: fontSizes.base,
    },
    editButton: {
        marginTop: spacing.md,
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
    },
    editButtonText: {
        color: colors.primaryForeground,
        fontSize: fontSizes.base,
        fontWeight: fontWeights.medium,
    },
    section: {
        marginBottom: spacing.xl,
        paddingHorizontal: spacing.md,
    },
    sectionTitle: {
        fontSize: fontSizes.lg,
        fontWeight: fontWeights.semibold,
        color: colors.foreground,
        marginBottom: spacing.md,
    },
    bodyText: {
        color: colors.foreground,
        fontSize: fontSizes.base,
        lineHeight: 24,
    },
    detailsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.md,
    },
    detailItem: {
        width: '47%',
        paddingVertical: spacing.sm,
    },
    detailLabel: {
        color: colors.mutedForeground,
        fontSize: fontSizes.sm,
        marginBottom: 2,
    },
    detailValue: {
        color: colors.foreground,
        fontSize: fontSizes.base,
        fontWeight: fontWeights.medium,
    },
    valuesWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.xs,
    },
    valueBadge: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
    },
    valueText: {
        color: colors.primaryForeground,
        fontSize: fontSizes.sm,
        fontWeight: fontWeights.medium,
    },

    roleCard: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.md,
        backgroundColor: colors.card,
    },
    roleHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.xs,
        gap: spacing.sm,
    },
    roleTitle: {
        color: colors.foreground,
        fontSize: fontSizes.base,
        fontWeight: fontWeights.semibold,
        flex: 1,
    },
    rolePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: borderRadius.full,
    },
    rolePillText: {
        color: colors.primaryForeground,
        fontSize: fontSizes.sm,
        fontWeight: fontWeights.medium,
    },
    roleLocation: {
        color: colors.mutedForeground,
        marginBottom: spacing.xs,
    },
    roleBlurb: {
        color: colors.foreground,
        lineHeight: 20,
    },
    roleActions: {
        marginTop: spacing.md,
        flexDirection: 'row',
        gap: spacing.sm,
    },
    primaryBtn: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
    },
    primaryBtnText: {
        color: colors.primaryForeground,
        fontWeight: fontWeights.medium,
    },
    secondaryBtn: {
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
    },
    secondaryBtnText: {
        color: colors.foreground,
        fontWeight: fontWeights.medium,
    },
    settingsItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    settingsItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    settingsIcon: {
        marginRight: spacing.md,
    },
    settingsTitle: {
        color: colors.foreground,
        fontSize: fontSizes.base,
        fontWeight: fontWeights.medium,
    },
    settingsSubtitle: {
        color: colors.mutedForeground,
        fontSize: fontSizes.sm,
        marginTop: 2,
    },
});