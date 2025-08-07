import { btcTransactionsStore } from '$btc/stores/btc-transactions.store';
import { BTC_MAINNET_TOKEN_ID } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN_ID } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN_ID } from '$env/tokens/tokens.icp.env';
import { SOLANA_TOKEN_ID } from '$env/tokens/tokens.sol.env';
import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
import { icrcCustomTokensStore } from '$icp/stores/icrc-custom-tokens.store';
import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import AllTransactions from '$lib/components/transactions/AllTransactions.svelte';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { solTransactionsStore } from '$sol/stores/sol-transactions.store';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { assertNonNullish } from '@dfinity/utils';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';

vi.mock('$lib/services/auth.services', () => ({
	nullishSignOut: vi.fn()
}));

describe('AllTransactions', () => {
	const customIcrcToken: IcrcCustomToken = {
		...mockValidIcToken,
		version: 1n,
		enabled: true
	};

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

		icrcCustomTokensStore.set({ data: tokenWithoutIndexCanister, certified: true });

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

		icrcCustomTokensStore.set({ data: tokenWithUnavailableIndexCanister, certified: true });

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

	describe('Privacy Mode', () => {
		it('renders title with eye-off icon when privacy mode is enabled', async () => {
			const settingsModule = await import('$lib/stores/settings.store');
			settingsModule.privacyModeStore.subscribe = (fn) => {
				fn({ enabled: true });
				return () => {};
			};

			const { container } = render(AllTransactions);

			const titleContainer = container.querySelector('span.flex.items-center.gap-2');

			expect(titleContainer).toBeInTheDocument();

			const title = titleContainer?.querySelector('h1');

			expect(title).toBeInTheDocument();
			expect(title?.textContent).toBe(en.activity.text.title);

			const eyeOffIcon = titleContainer?.querySelector('span.text-tertiary');

			expect(eyeOffIcon).toBeInTheDocument();
		});

		it('renders simple title when privacy mode is disabled', async () => {
			const settingsModule = await import('$lib/stores/settings.store');
			settingsModule.privacyModeStore.subscribe = (fn) => {
				fn({ enabled: false });
				return () => {};
			};

			const { container } = render(AllTransactions);

			const titleContainer = container.querySelector('span.flex.items-center.gap-2');

			expect(titleContainer).not.toBeInTheDocument();

			const title = container.querySelector('h1');

			expect(title).toBeInTheDocument();
			expect(title?.textContent).toBe(en.activity.text.title);
		});
	});
});
