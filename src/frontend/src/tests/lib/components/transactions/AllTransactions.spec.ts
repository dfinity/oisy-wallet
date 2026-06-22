import { btcTransactionsStore } from '$btc/stores/btc-transactions.store';
import type { DismissedNotification } from '$declarations/backend/backend.did';
import { BTC_MAINNET_TOKEN_ID } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN_ID } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN_ID } from '$env/tokens/tokens.icp.env';
import { SOLANA_TOKEN_ID } from '$env/tokens/tokens.sol.env';
import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
import { icrcCustomTokensStore } from '$icp/stores/icrc-custom-tokens.store';
import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import AllTransactions from '$lib/components/transactions/AllTransactions.svelte';
import { NOTIFICATION_VERSIONS } from '$lib/constants/notification.constants';
import {
	PLAUSIBLE_EVENT_CONTEXTS,
	PLAUSIBLE_EVENT_VALUES,
	PLAUSIBLE_EVENTS
} from '$lib/enums/plausible';
import * as analyticsServices from '$lib/services/analytics.services';
import * as notificationServices from '$lib/services/notification.services';
import { userProfileStore } from '$lib/stores/user-profile.store';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { solTransactionsStore } from '$sol/stores/sol-transactions.store';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import {
	IntersectionObserverActive,
	IntersectionObserverPassive
} from '$tests/mocks/infinite-scroll.mock';
import { mockUserProfile, mockUserSettings } from '$tests/mocks/user-profile.mock';
import { assertNonNullish, toNullable } from '@dfinity/utils';
import { fireEvent, render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('AllTransactions', () => {
	const customIcrcToken: IcrcCustomToken = {
		...mockValidIcToken,
		version: 1n,
		enabled: true
	};

	beforeAll(() => {
		Object.defineProperty(window, 'IntersectionObserver', {
			writable: true,
			configurable: true,
			value: IntersectionObserverActive
		});
	});

	afterAll(() => (global.IntersectionObserver = IntersectionObserverPassive));

	it('renders the title', () => {
		const { container } = render(AllTransactions);

		const title: HTMLHeadingElement | null = container.querySelector('h1');

		expect(title).not.toBeNull();

		assertNonNullish(title, 'Title not found');

		expect(title).toBeInTheDocument();
		expect(title.textContent).toBe(en.activity.text.title);
	});

	it('should track a page_open for the Activity section on mount', () => {
		const trackEventSpy = vi.spyOn(analyticsServices, 'trackEvent').mockImplementation(() => {});

		render(AllTransactions);

		expect(trackEventSpy).toHaveBeenCalledWith({
			name: PLAUSIBLE_EVENTS.PAGE_OPEN,
			metadata: {
				event_context: PLAUSIBLE_EVENT_CONTEXTS.ACTIVITY,
				event_value: PLAUSIBLE_EVENT_VALUES.ACTIVITY_PAGE
			}
		});
	});

	it('renders the no Index canister warning box', () => {
		const tokenWithoutIndexCanister: IcrcCustomToken = {
			...customIcrcToken,
			symbol: 'UWT'
		};

		icrcCustomTokensStore.setAll([{ data: tokenWithoutIndexCanister, certified: true }]);

		const store = get(icrcCustomTokensStore);
		const tokenId = store?.at(0)?.data.id;
		assertNonNullish(tokenId);
		icTransactionsStore.nullify(tokenId);

		const { getByText } = render(AllTransactions);

		const exceptedText = replacePlaceholders(en.activity.warning.no_index_canister, {
			$token_list: '$UWT'
		});

		expect(getByText(exceptedText)).toBeInTheDocument();
	});

	it('renders the unavailable Index canister warning box', () => {
		const tokenWithUnavailableIndexCanister: IcrcCustomToken = {
			...customIcrcToken,
			symbol: 'UTC',
			indexCanisterId: 'mxzaz-hqaaa-aaaar-qaada-cai'
		};

		icrcCustomTokensStore.setAll([{ data: tokenWithUnavailableIndexCanister, certified: true }]);

		const store = get(icrcCustomTokensStore);
		const tokenId = store?.at(0)?.data.id;
		assertNonNullish(tokenId);
		icTransactionsStore.nullify(tokenId);

		const { getByText } = render(AllTransactions);

		const exceptedText = replacePlaceholders(en.activity.warning.unavailable_index_canister, {
			$token_list: '$UTC'
		});

		expect(getByText(exceptedText)).toBeInTheDocument();
	});

	it('closes the unavailable Index canister warning via sessionStorage, not backend persistence', async () => {
		const tokenWithUnavailableIndexCanister: IcrcCustomToken = {
			...customIcrcToken,
			symbol: 'UTC',
			indexCanisterId: 'mxzaz-hqaaa-aaaar-qaada-cai'
		};

		icrcCustomTokensStore.setAll([{ data: tokenWithUnavailableIndexCanister, certified: true }]);

		const store = get(icrcCustomTokensStore);
		const tokenId = store?.at(0)?.data.id;
		assertNonNullish(tokenId);
		icTransactionsStore.nullify(tokenId);

		const spySessionStorage = vi.spyOn(Storage.prototype, 'setItem');
		const spyDismiss = vi.spyOn(notificationServices, 'dismissNotifications').mockResolvedValue();

		const { container } = render(AllTransactions);

		const warningBox = container.querySelector('.bg-warning-light');
		assertNonNullish(warningBox);

		const closeButton = warningBox.querySelector('button');
		assertNonNullish(closeButton);

		await fireEvent.click(closeButton);

		expect(spySessionStorage).toHaveBeenCalledWith(
			'oisy_ic_hide_transaction_unavailable_canister',
			'true'
		);
		expect(spyDismiss).not.toHaveBeenCalled();

		spySessionStorage.mockRestore();
		spyDismiss.mockRestore();
	});

	it('renders the info box list', () => {
		const { getByText } = render(AllTransactions);

		expect(getByText(en.activity.info.btc_transactions)).toBeInTheDocument();
	});

	it('renders the transactions list', () => {
		btcTransactionsStore.reset(BTC_MAINNET_TOKEN_ID);
		ethTransactionsStore.nullify(ETHEREUM_TOKEN_ID);
		icTransactionsStore.reset(ICP_TOKEN_ID);
		solTransactionsStore.reset(SOLANA_TOKEN_ID);

		const { getByText } = render(AllTransactions);

		expect(getByText(en.transactions.text.transaction_history)).toBeInTheDocument();
	});

	describe('banner dismissal', () => {
		const dismissedBtc: DismissedNotification = {
			Simple: {
				kind: { BtcActivityInfo: null },
				version: NOTIFICATION_VERSIONS.BtcActivityInfo
			}
		};

		const tokenWithoutIndexCanister: IcrcCustomToken = {
			...customIcrcToken,
			symbol: 'NIC'
		};

		const setUserProfileWithDismissals = (dismissed: DismissedNotification[]) => {
			userProfileStore.set({
				certified: true,
				profile: {
					...mockUserProfile,
					settings: toNullable({
						...mockUserSettings,
						notifications: toNullable({
							dismissed_notifications: dismissed
						})
					})
				}
			});
		};

		beforeEach(() => {
			vi.clearAllMocks();
			vi.spyOn(notificationServices, 'dismissNotifications').mockResolvedValue();
			userProfileStore.set({ certified: true, profile: mockUserProfile });
		});

		it('should not render the BTC banner when it is dismissed in user profile', () => {
			setUserProfileWithDismissals([dismissedBtc]);

			const { queryByText } = render(AllTransactions);

			expect(queryByText(en.activity.info.btc_transactions)).not.toBeInTheDocument();
		});

		it('should render the BTC banner when it is dismissed with an old version', () => {
			setUserProfileWithDismissals([
				{
					Simple: {
						kind: { BtcActivityInfo: null },
						version: 0
					}
				}
			]);

			const { getByText } = render(AllTransactions);

			expect(getByText(en.activity.info.btc_transactions)).toBeInTheDocument();
		});

		it('should call dismissNotifications when BTC banner is closed', async () => {
			const { container } = render(AllTransactions);

			const btcBannerText = container.querySelector('.bg-primary');
			assertNonNullish(btcBannerText);

			const closeButton = btcBannerText.querySelector('button');
			assertNonNullish(closeButton);

			await fireEvent.click(closeButton);

			expect(notificationServices.dismissNotifications).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					notifications: [
						{
							Simple: {
								kind: { BtcActivityInfo: null },
								version: NOTIFICATION_VERSIONS.BtcActivityInfo
							}
						}
					]
				})
			);
		});

		it('should not render the no-index-canister warning when dismissed in user profile', () => {
			icrcCustomTokensStore.setAll([{ data: tokenWithoutIndexCanister, certified: true }]);

			const store = get(icrcCustomTokensStore);
			const tokenId = store?.at(0)?.data.id;
			assertNonNullish(tokenId);
			icTransactionsStore.nullify(tokenId);

			setUserProfileWithDismissals([
				{
					Qualified: {
						kind: { NoIndexCanister: null },
						qualifier: 'NIC',
						version: NOTIFICATION_VERSIONS.NoIndexCanister
					}
				}
			]);

			const { queryByText } = render(AllTransactions);

			const expectedText = replacePlaceholders(en.activity.warning.no_index_canister, {
				$token_list: '$NIC'
			});

			expect(queryByText(expectedText)).not.toBeInTheDocument();
		});

		it('should call dismissNotifications when no-index-canister warning is closed', async () => {
			icrcCustomTokensStore.setAll([{ data: tokenWithoutIndexCanister, certified: true }]);

			const store = get(icrcCustomTokensStore);
			const tokenId = store?.at(0)?.data.id;
			assertNonNullish(tokenId);
			icTransactionsStore.nullify(tokenId);

			const { container } = render(AllTransactions);

			const warningBox = container.querySelector('.bg-warning-light');
			assertNonNullish(warningBox);

			const closeButton = warningBox.querySelector('button');
			assertNonNullish(closeButton);

			await fireEvent.click(closeButton);

			expect(notificationServices.dismissNotifications).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					notifications: [
						{
							Qualified: {
								kind: { NoIndexCanister: null },
								qualifier: 'NIC',
								version: NOTIFICATION_VERSIONS.NoIndexCanister
							}
						}
					]
				})
			);
		});
	});

	describe('Privacy Mode', () => {
		it('renders title with eye-off icon when privacy mode is enabled', async () => {
			const settingsModule = await import('$lib/stores/settings.store');
			settingsModule.privacyModeStore.subscribe = (fn) => {
				fn({ enabled: true });
				return () => {};
			};

			const { container } = render(AllTransactions);

			const eyeOffIcon = container.querySelector('span.text-tertiary');

			expect(eyeOffIcon).toBeInTheDocument();

			const titleContainer = eyeOffIcon?.parentElement;

			expect(titleContainer?.tagName.toLowerCase()).toBe('div');

			const title = titleContainer?.querySelector('h1');

			expect(title).toBeInTheDocument();
			expect(title?.textContent).toBe(en.activity.text.title);
		});

		it('renders simple title when privacy mode is disabled', async () => {
			const settingsModule = await import('$lib/stores/settings.store');
			settingsModule.privacyModeStore.subscribe = (fn) => {
				fn({ enabled: false });
				return () => {};
			};

			const { container } = render(AllTransactions);

			const eyeOffIcon = container.querySelector('span.text-tertiary');

			expect(eyeOffIcon).not.toBeInTheDocument();

			const title = container.querySelector('h1');

			expect(title).toBeInTheDocument();
			expect(title?.textContent).toBe(en.activity.text.title);
		});
	});
});
