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
import { hiddenMicroTransactionsResetStore } from '$lib/stores/settings.store';
import { userProfileStore } from '$lib/stores/user-profile.store';
import { isSimpleNotificationDismissed } from '$lib/utils/notification.utils';
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

// Whether the "hidden micro transactions" info banner should be visible. Derived from
// global state only (no component-local optimistic dismissal), so it can be consumed both
// by `HiddenMicroTransactionsInfoBox` (which renders it) and by parents that need to know
// about its visibility (e.g. to include it in a "has banners" derivation).
export const hiddenMicroTransactionsBannerVisible: Readable<boolean> = derived(
	[hideMicroTransactions, userDismissedNotifications, hiddenMicroTransactionsResetStore],
	([$hideMicroTransactions, $userDismissedNotifications, $hiddenMicroTransactionsResetStore]) => {
		if (!$hideMicroTransactions) {
			return false;
		}

		const backendDismissed = isSimpleNotificationDismissed({
			kind: 'HiddenMicroTransactions',
			dismissedNotifications: $userDismissedNotifications
		});

		// When the user toggles the "hide micro transactions" feature, we re-show the info
		// box even if the backend still has the notification stored as dismissed. The override
		// is cleared as soon as the user dismisses the info box again.
		return !(backendDismissed && !$hiddenMicroTransactionsResetStore.enabled);
	}
);
