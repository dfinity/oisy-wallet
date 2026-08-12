import { btcTransactionsStore } from '$btc/stores/btc-transactions.store';
import type { DismissedNotification } from '$declarations/backend/backend.did';
import { BTC_MAINNET_TOKEN_ID } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN_ID } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN_ID } from '$env/tokens/tokens.icp.env';
import { SOLANA_TOKEN_ID } from '$env/tokens/tokens.sol.env';
import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
import { icTransactionsStatusStore } from '$icp/stores/ic-transactions-status.store';
import { icTransactionsWarningStore } from '$icp/stores/ic-transactions-warning.store';
import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
import { icrcCustomTokensStore } from '$icp/stores/icrc-custom-tokens.store';
import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import AllTransactions from '$lib/components/transactions/AllTransactions.svelte';
import { IC_TRANSACTIONS_UNAVAILABLE_THRESHOLD } from '$lib/constants/app.constants';
import { NOTIFICATION_VERSIONS } from '$lib/constants/notification.constants';
import { Languages } from '$lib/enums/languages';
import * as notificationServices from '$lib/services/notification.services';
import { userProfileStore } from '$lib/stores/user-profile.store';
import type { TokenId } from '$lib/types/token';
import { formatList, replaceOisyPlaceholders, replacePlaceholders } from '$lib/utils/i18n.utils';
import * as infoUtils from '$lib/utils/info.utils';
import { parseTokenId } from '$lib/validation/token.validation';
import { solTransactionsStore } from '$sol/stores/sol-transactions.store';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import {
	IntersectionObserverActive,
	IntersectionObserverPassive
} from '$tests/mocks/infinite-scroll.mock';
import { mockUserProfile, mockUserSettings } from '$tests/mocks/user-profile.mock';
import { assertNonNullish, toNullable } from '@dfinity/utils';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('AllTransactions', () => {
	const customIcrcToken: IcrcCustomToken = {
		...mockValidIcToken,
		version: 1n,
		enabled: true
	};

	const setUpTokenWithUnavailableIndexCanister = (): TokenId => {
		const tokenWithUnavailableIndexCanister: IcrcCustomToken = {
			...customIcrcToken,
			symbol: 'UTC',
			indexCanisterId: 'mxzaz-hqaaa-aaaar-qaada-cai'
		};

		icrcCustomTokensStore.setAll([{ data: tokenWithUnavailableIndexCanister, certified: true }]);

		const tokenId = get(icrcCustomTokensStore)?.at(0)?.data.id;
		assertNonNullish(tokenId);

		return tokenId;
	};

	// `parseTokenId` mints a fresh symbol per call, so the ids have to be read back from the store
	// rather than recreated - a recreated one never matches the token the component sees.
	// The dismissal is recorded against the Ledger canister ID, not the symbol.
	const UTA_LEDGER_CANISTER_ID = 'mxzaz-hqaaa-aaaar-qaada-cai';

	const setUpTwoTokensWithUnavailableIndexCanister = (): { first: TokenId; second: TokenId } => {
		icrcCustomTokensStore.setAll([
			{
				data: {
					...customIcrcToken,
					id: parseTokenId('UTA'),
					symbol: 'UTA',
					ledgerCanisterId: 'mxzaz-hqaaa-aaaar-qaada-cai',
					indexCanisterId: 'n5wcd-faaaa-aaaar-qaaea-cai'
				},
				certified: true
			},
			{
				data: {
					...customIcrcToken,
					id: parseTokenId('UTB'),
					symbol: 'UTB',
					ledgerCanisterId: 'ss2fx-dyaaa-aaaar-qacoq-cai',
					indexCanisterId: 's3zol-vqaaa-aaaar-qacpa-cai'
				},
				certified: true
			}
		]);

		const stored = get(icrcCustomTokensStore);

		const first = stored?.find(({ data: { symbol } }) => symbol === 'UTA')?.data.id;
		const second = stored?.find(({ data: { symbol } }) => symbol === 'UTB')?.data.id;

		assertNonNullish(first);
		assertNonNullish(second);

		return { first, second };
	};

	const unavailableText = (symbols: string[]) =>
		replacePlaceholders(replaceOisyPlaceholders(en.activity.warning.unavailable_index_canister), {
			$token_list: formatList({ items: symbols, language: Languages.ENGLISH })
		});

	const dismissWarning = async (container: HTMLElement) => {
		const warningBox = container.querySelector('.bg-warning-light');
		assertNonNullish(warningBox);

		const closeButton = warningBox.querySelector('button');
		assertNonNullish(closeButton);

		await fireEvent.click(closeButton);
	};

	const failTransactionsSync = ({ tokenId, times }: { tokenId: TokenId; times: number }) =>
		Array.from({ length: times }).forEach(() => icTransactionsStatusStore.fail(tokenId));

	beforeAll(() => {
		Object.defineProperty(window, 'IntersectionObserver', {
			writable: true,
			configurable: true,
			value: IntersectionObserverActive
		});
	});

	beforeEach(() => {
		icTransactionsStatusStore.reset();
		icrcCustomTokensStore.resetAll();
		icTransactionsWarningStore.reset();
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

		const expectedText = replacePlaceholders(
			replaceOisyPlaceholders(en.activity.warning.no_index_canister),
			{
				$token_list: formatList({ items: ['UWT'], language: Languages.ENGLISH })
			}
		);

		expect(getByText(expectedText)).toBeInTheDocument();
	});

	it('renders the unavailable Index canister warning box after enough consecutive failures', () => {
		const tokenId = setUpTokenWithUnavailableIndexCanister();

		failTransactionsSync({ tokenId, times: IC_TRANSACTIONS_UNAVAILABLE_THRESHOLD });

		const { getByText } = render(AllTransactions);

		const exceptedText = replacePlaceholders(
			replaceOisyPlaceholders(en.activity.warning.unavailable_index_canister),
			{ $token_list: formatList({ items: ['UTC'], language: Languages.ENGLISH }) }
		);

		expect(getByText(exceptedText)).toBeInTheDocument();
	});

	it('does not render the unavailable Index canister warning box before the threshold', () => {
		const tokenId = setUpTokenWithUnavailableIndexCanister();

		failTransactionsSync({ tokenId, times: IC_TRANSACTIONS_UNAVAILABLE_THRESHOLD - 1 });

		const { queryByText } = render(AllTransactions);

		const exceptedText = replacePlaceholders(
			replaceOisyPlaceholders(en.activity.warning.unavailable_index_canister),
			{ $token_list: formatList({ items: ['UTC'], language: Languages.ENGLISH }) }
		);

		expect(queryByText(exceptedText)).not.toBeInTheDocument();
	});

	it('stops rendering the unavailable Index canister warning box after a successful sync', () => {
		const tokenId = setUpTokenWithUnavailableIndexCanister();

		failTransactionsSync({ tokenId, times: IC_TRANSACTIONS_UNAVAILABLE_THRESHOLD });
		icTransactionsStatusStore.succeed(tokenId);

		const { queryByText } = render(AllTransactions);

		const exceptedText = replacePlaceholders(
			replaceOisyPlaceholders(en.activity.warning.unavailable_index_canister),
			{ $token_list: formatList({ items: ['UTC'], language: Languages.ENGLISH }) }
		);

		expect(queryByText(exceptedText)).not.toBeInTheDocument();
	});

	it('remembers the dismissal per token, not for the whole box', async () => {
		const { first, second } = setUpTwoTokensWithUnavailableIndexCanister();

		const spyDismiss = vi.spyOn(notificationServices, 'dismissNotifications').mockResolvedValue();
		const spySave = vi.spyOn(infoUtils, 'saveHideInfoQualifiers').mockImplementation(() => {});

		failTransactionsSync({ tokenId: first, times: IC_TRANSACTIONS_UNAVAILABLE_THRESHOLD });

		const { container, queryByText, unmount } = render(AllTransactions);

		expect(queryByText(unavailableText(['UTA']))).toBeInTheDocument();

		await dismissWarning(container);

		expect(spySave).toHaveBeenCalledWith({
			key: 'oisy_ic_hide_transaction_unavailable_canister',
			qualifiers: [UTA_LEDGER_CANISTER_ID]
		});
		// The per-token dismissal is local to the session, never persisted to the backend.
		expect(spyDismiss).not.toHaveBeenCalled();

		await waitFor(() => expect(queryByText(unavailableText(['UTA']))).not.toBeInTheDocument());

		// A different token failing must raise the box again - naming only that token.
		failTransactionsSync({ tokenId: second, times: IC_TRANSACTIONS_UNAVAILABLE_THRESHOLD });

		await waitFor(() => expect(queryByText(unavailableText(['UTB']))).toBeInTheDocument());

		unmount();
		spyDismiss.mockRestore();
		spySave.mockRestore();
	});

	it('keeps the two tokens apart when they share a symbol', async () => {
		icrcCustomTokensStore.setAll([
			{
				data: {
					...customIcrcToken,
					id: parseTokenId('DUP'),
					symbol: 'DUP',
					ledgerCanisterId: 'mxzaz-hqaaa-aaaar-qaada-cai',
					indexCanisterId: 'n5wcd-faaaa-aaaar-qaaea-cai'
				},
				certified: true
			},
			{
				data: {
					...customIcrcToken,
					id: parseTokenId('DUP'),
					symbol: 'DUP',
					ledgerCanisterId: 'ss2fx-dyaaa-aaaar-qacoq-cai',
					indexCanisterId: 's3zol-vqaaa-aaaar-qacpa-cai'
				},
				certified: true
			}
		]);

		const stored = get(icrcCustomTokensStore);
		const first = stored?.at(0)?.data.id;
		const second = stored?.at(1)?.data.id;
		assertNonNullish(first);
		assertNonNullish(second);

		vi.spyOn(infoUtils, 'saveHideInfoQualifiers').mockImplementation(() => {});

		failTransactionsSync({ tokenId: first, times: IC_TRANSACTIONS_UNAVAILABLE_THRESHOLD });

		const { container, queryByText, unmount } = render(AllTransactions);

		expect(queryByText(unavailableText(['DUP']))).toBeInTheDocument();

		await dismissWarning(container);

		await waitFor(() => expect(queryByText(unavailableText(['DUP']))).not.toBeInTheDocument());

		// The other token happens to share the symbol, but it is a different token: its own outage
		// must still be surfaced.
		failTransactionsSync({ tokenId: second, times: IC_TRANSACTIONS_UNAVAILABLE_THRESHOLD });

		await waitFor(() => expect(queryByText(unavailableText(['DUP']))).toBeInTheDocument());

		unmount();
		vi.restoreAllMocks();
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

			const expectedText = replacePlaceholders(
				replaceOisyPlaceholders(en.activity.warning.no_index_canister),
				{ $token_list: formatList({ items: ['NIC'], language: Languages.ENGLISH }) }
			);

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
