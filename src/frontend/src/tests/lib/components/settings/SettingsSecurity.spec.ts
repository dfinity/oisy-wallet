import * as backendApi from '$lib/api/backend.api';
import SettingsSecurity from '$lib/components/settings/SettingsSecurity.svelte';
import { OISY_HIDE_MICRO_TRANSACTIONS_DOCS_URL } from '$lib/constants/oisy.constants';
import { hiddenMicroTransactionsResetStore } from '$lib/stores/settings.store';
import * as toastsStore from '$lib/stores/toasts.store';
import { userProfileStore } from '$lib/stores/user-profile.store';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import {
	mockUserProfile,
	mockUserProfileVersion,
	mockUserSettings
} from '$tests/mocks/user-profile.mock';
import { assertNonNullish, toNullable } from '@dfinity/utils';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('SettingsSecurity', () => {
	const setHideMicroTransactions = (hideMicroTransactions: boolean) =>
		userProfileStore.set({
			certified: true,
			profile: {
				...mockUserProfile,
				settings: toNullable({
					...mockUserSettings,
					transactions: [{ filter: [{ hide_micro_transactions: hideMicroTransactions }] }]
				})
			}
		});

	beforeEach(() => {
		vi.resetAllMocks();

		mockAuthStore();
		hiddenMicroTransactionsResetStore.reset({ key: 'hidden-micro-transactions-reset' });
		userProfileStore.set({ certified: true, profile: mockUserProfile });
	});

	it('renders the Security card title and the small transactions filter', () => {
		const { getByText } = render(SettingsSecurity);

		expect(getByText(en.settings.text.security)).toBeInTheDocument();
		expect(getByText(en.settings.text.hide_micro_transactions)).toBeInTheDocument();
	});

	it('renders the WalletConnect switch under Expert features, below the filter', () => {
		const { getByText } = render(SettingsSecurity);

		const filter = getByText(en.settings.text.hide_micro_transactions);
		const heading = getByText(en.settings.text.expert_features);
		const unchecked = getByText(en.settings.text.allow_unchecked_signing);

		expect(filter.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		expect(
			heading.compareDocumentPosition(unchecked) & Node.DOCUMENT_POSITION_FOLLOWING
		).toBeTruthy();
	});

	it.each([true, false])(
		'shows the saved small transactions filter setting (%s)',
		(hideMicroTransactions) => {
			setHideMicroTransactions(hideMicroTransactions);

			const { getByRole } = render(SettingsSecurity);

			const toggle = getByRole('checkbox', {
				name: hideMicroTransactions
					? en.settings.text.disable_hide_micro_transactions
					: en.settings.text.enable_hide_micro_transactions
			}) as HTMLInputElement;

			expect(toggle.checked).toBe(hideMicroTransactions);
		}
	);

	it('saves the opposite setting, shows the info box again and confirms with a toast', async () => {
		const updateSpy = vi
			.spyOn(backendApi, 'updateUserTransactionFilterSettings')
			.mockResolvedValue(undefined);
		const toastSpy = vi.spyOn(toastsStore, 'toastsShow');

		const { getByRole } = render(SettingsSecurity);

		await fireEvent.input(
			getByRole('checkbox', { name: en.settings.text.disable_hide_micro_transactions })
		);

		await waitFor(() => {
			expect(updateSpy).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				hideMicroTransactions: false,
				currentUserVersion: mockUserProfileVersion
			});
			expect(toastSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					text: en.settings.text.save_spam_filter_success,
					level: 'success'
				})
			);
		});

		expect(get(hiddenMicroTransactionsResetStore).enabled).toBeTruthy();
	});

	it('does not save the setting without a signed-in identity', async () => {
		mockAuthStore(null);

		const updateSpy = vi.spyOn(backendApi, 'updateUserTransactionFilterSettings');

		const { getByRole } = render(SettingsSecurity);

		await fireEvent.input(
			getByRole('checkbox', { name: en.settings.text.disable_hide_micro_transactions })
		);

		expect(updateSpy).not.toHaveBeenCalled();
	});

	it('links the small transactions filter to its docs', async () => {
		// jsdom applies no stylesheet, so the help text's container computes to `display: inline`
		// and Svelte warns that the `slide` transition revealing it can't animate such an element.
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

		const { getByRole, getByText } = render(SettingsSecurity);

		const help = getByText(en.settings.text.hide_micro_transactions).parentElement?.querySelector(
			'button'
		);

		assertNonNullish(help);

		await fireEvent.click(help);

		expect(getByText(en.settings.text.hide_micro_transactions_description)).toBeInTheDocument();
		expect(getByRole('link', { name: en.settings.text.learn_more })).toHaveAttribute(
			'href',
			OISY_HIDE_MICRO_TRANSACTIONS_DOCS_URL
		);
		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining('transition_slide_display'),
			expect.anything(),
			expect.anything()
		);
	});
});
