import type { DismissedNotification } from '$declarations/backend/backend.did';
import HiddenMicroTransactionsInfoBox from '$lib/components/transactions/HiddenMicroTransactionsInfoBox.svelte';
import { NOTIFICATION_VERSIONS } from '$lib/constants/notification.constants';
import * as notificationServices from '$lib/services/notification.services';
import { hiddenMicroTransactionsResetStore } from '$lib/stores/settings.store';
import { userProfileStore } from '$lib/stores/user-profile.store';
import en from '$tests/mocks/i18n.mock';
import { mockUserProfile, mockUserSettings } from '$tests/mocks/user-profile.mock';
import { toNullable } from '@dfinity/utils';
import { fireEvent, render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('HiddenMicroTransactionsInfoBox', () => {
	const dismissedHiddenMicroTransactions: DismissedNotification = {
		Simple: {
			kind: { HiddenMicroTransactions: null },
			version: NOTIFICATION_VERSIONS.HiddenMicroTransactions
		}
	};

	const setUserProfile = ({
		hideMicroTransactions,
		dismissed = []
	}: {
		hideMicroTransactions: boolean;
		dismissed?: DismissedNotification[];
	}) => {
		userProfileStore.set({
			certified: true,
			profile: {
				...mockUserProfile,
				settings: toNullable({
					...mockUserSettings,
					transactions: [{ filter: [{ hide_micro_transactions: hideMicroTransactions }] }],
					notifications: toNullable({ dismissed_notifications: dismissed })
				})
			}
		});
	};

	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(notificationServices, 'dismissNotifications').mockResolvedValue();

		hiddenMicroTransactionsResetStore.reset({ key: 'hidden-micro-transactions-reset' });
		userProfileStore.reset();
	});

	it('is visible when the feature is on and nothing is dismissed', () => {
		setUserProfile({ hideMicroTransactions: true });

		const { queryByRole } = render(HiddenMicroTransactionsInfoBox);

		expect(queryByRole('button', { name: en.core.text.close })).toBeInTheDocument();
	});

	it('is hidden when the feature is off', () => {
		setUserProfile({ hideMicroTransactions: false });

		const { queryByRole } = render(HiddenMicroTransactionsInfoBox);

		expect(queryByRole('button', { name: en.core.text.close })).not.toBeInTheDocument();
	});

	it('is hidden when the backend notification is dismissed and the reset flag is off', () => {
		setUserProfile({
			hideMicroTransactions: true,
			dismissed: [dismissedHiddenMicroTransactions]
		});

		const { queryByRole } = render(HiddenMicroTransactionsInfoBox);

		expect(queryByRole('button', { name: en.core.text.close })).not.toBeInTheDocument();
	});

	it('re-shows the info box when the reset flag is on, even if the backend notification is dismissed (OISY-2876)', () => {
		setUserProfile({
			hideMicroTransactions: true,
			dismissed: [dismissedHiddenMicroTransactions]
		});
		hiddenMicroTransactionsResetStore.set({
			key: 'hidden-micro-transactions-reset',
			value: { enabled: true }
		});

		const { queryByRole } = render(HiddenMicroTransactionsInfoBox);

		expect(queryByRole('button', { name: en.core.text.close })).toBeInTheDocument();
	});

	it('clears the reset flag and persists the backend dismissal when the user closes the box', async () => {
		setUserProfile({
			hideMicroTransactions: true,
			dismissed: [dismissedHiddenMicroTransactions]
		});
		hiddenMicroTransactionsResetStore.set({
			key: 'hidden-micro-transactions-reset',
			value: { enabled: true }
		});

		const { getByRole } = render(HiddenMicroTransactionsInfoBox);

		await fireEvent.click(getByRole('button', { name: en.core.text.close }));

		expect(get(hiddenMicroTransactionsResetStore).enabled).toBeFalsy();

		expect(notificationServices.dismissNotifications).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({
				notifications: [dismissedHiddenMicroTransactions]
			})
		);
	});
});
