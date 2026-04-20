import type {
	Agreements,
	DismissedNotification,
	ExperimentalFeaturesSettings,
	NetworksSettings,
	NotificationSettings,
	Settings,
	TransactionFilterSettings,
	TransactionSettings,
	UserProfile
} from '$declarations/backend/backend.did';
import { userProfileStore } from '$lib/stores/user-profile.store';
import { fromNullishNullable, nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const userProfileLoaded: Readable<boolean> = derived([userProfileStore], ([$userProfile]) =>
	nonNullish($userProfile)
);

export const userProfile: Readable<UserProfile | undefined> = derived(
	[userProfileStore],
	([$userProfile]) => $userProfile?.profile
);

export const userProfileVersion: Readable<bigint | undefined> = derived(
	[userProfile],
	([$userProfile]) => fromNullishNullable($userProfile?.version)
);

export const userSettings: Readable<Settings | undefined> = derived(
	[userProfile],
	([$userProfile]) => fromNullishNullable($userProfile?.settings)
);

export const userSettingsNetworks: Readable<NetworksSettings | undefined> = derived(
	[userSettings],
	([$userSettings]) => $userSettings?.networks
);

export const userExperimentalFeaturesSettings: Readable<ExperimentalFeaturesSettings | undefined> =
	derived([userSettings], ([$userSettings]) => $userSettings?.experimental_features);

export const userAgreementsData: Readable<Agreements | undefined> = derived(
	[userProfile],
	([$userProfile]) => fromNullishNullable($userProfile?.agreements)
);

export const userNotificationSettings: Readable<NotificationSettings | undefined> = derived(
	[userSettings],
	([$userSettings]) => fromNullishNullable($userSettings?.notifications)
);

export const userDismissedNotifications: Readable<DismissedNotification[]> = derived(
	[userNotificationSettings],
	([$userNotificationSettings]) => $userNotificationSettings?.dismissed_notifications ?? []
);

export const userTransactionSettings: Readable<TransactionSettings | undefined> = derived(
	[userSettings],
	([$userSettings]) => fromNullishNullable($userSettings?.transactions)
);

const DEFAULT_TRANSACTION_FILTER: TransactionFilterSettings = { hide_micro_transactions: true };

export const userTransactionFilterSettings: Readable<TransactionFilterSettings> = derived(
	[userTransactionSettings],
	([$userTransactionSettings]) =>
		fromNullishNullable($userTransactionSettings?.filter) ?? DEFAULT_TRANSACTION_FILTER
);

export const hideMicroTransactions: Readable<boolean> = derived(
	[userTransactionFilterSettings],
	([$userTransactionFilterSettings]) => $userTransactionFilterSettings.hide_micro_transactions
);
