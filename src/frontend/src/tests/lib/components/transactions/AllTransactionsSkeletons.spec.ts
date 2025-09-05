import { btcTransactionsStore } from '$btc/stores/btc-transactions.store';
import * as btcEnv from '$env/networks/networks.btc.env';
import * as ethEnv from '$env/networks/networks.eth.env';
import { JUP_TOKEN } from '$env/tokens/tokens-spl/tokens.jup.env';
import { BTC_MAINNET_TOKEN_ID } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN_ID } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN_ID } from '$env/tokens/tokens.icp.env';
import { SOLANA_TOKEN_ID } from '$env/tokens/tokens.sol.env';
import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
import AllTransactionsSkeletons from '$lib/components/transactions/AllTransactionsSkeletons.svelte';
import { enabledSplTokens } from '$sol/derived/spl.derived';
import { solTransactionsStore } from '$sol/stores/sol-transactions.store';
import { createMockSnippet } from '$tests/mocks/snippet.mock';
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';

describe('AllTransactionsSkeletons', () => {
	const testIdPrefix = 'skeleton-card';

	const mockSnippet = createMockSnippet('Mock Snippet');

	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetAllMocks();

		vi.spyOn(btcEnv, 'BTC_MAINNET_ENABLED', 'get').mockImplementation(() => true);
		vi.spyOn(ethEnv, 'ETH_MAINNET_ENABLED', 'get').mockImplementation(() => true);
	});

	it('should render the skeleton when stores are empty', () => {
		const { getByTestId } = render(AllTransactionsSkeletons, {
			props: {
				testIdPrefix,
				children: mockSnippet
			}
		});

		Array.from({ length: 5 }).forEach((_, i) => {
			const skeleton = getByTestId(`${testIdPrefix}-${i}`);

			expect(skeleton).toBeInTheDocument();
		});
	});

	describe('when at least one transactions store is not empty', () => {
		beforeEach(() => {
			btcTransactionsStore.reset(BTC_MAINNET_TOKEN_ID);
			ethTransactionsStore.nullify(ETHEREUM_TOKEN_ID);
			icTransactionsStore.reset(ICP_TOKEN_ID);

			btcTransactionsStore.append({ tokenId: BTC_MAINNET_TOKEN_ID, transactions: [] });
			ethTransactionsStore.add({ tokenId: ETHEREUM_TOKEN_ID, transactions: [] });
			icTransactionsStore.append({ tokenId: ICP_TOKEN_ID, transactions: [] });
		});

		it('should render the skeleton when at least one store is empty', () => {
			const { getByTestId } = render(AllTransactionsSkeletons, {
				props: {
					testIdPrefix,
					children: mockSnippet
				}
			});

			Array.from({ length: 5 }).forEach((_, i) => {
				const skeleton = getByTestId(`${testIdPrefix}-${i}`);

				expect(skeleton).toBeInTheDocument();
			});
		});

		it('should not render the skeleton when all stores have data', async () => {
			const { container } = render(AllTransactionsSkeletons, {
				props: {
					testIdPrefix,
					children: mockSnippet
				}
			});

			Array.from({ length: 5 }).forEach((_, i) => {
				const skeleton: HTMLParagraphElement | null = container.querySelector(
					`div[data-tid="${testIdPrefix}-${i}"]`
				);

				expect(skeleton).toBeDefined();
			});

			solTransactionsStore.append({ tokenId: SOLANA_TOKEN_ID, transactions: [] });

			await tick();

			Array.from({ length: 5 }).forEach((_, i) => {
				const skeleton: HTMLParagraphElement | null = container.querySelector(
					`div[data-tid="${testIdPrefix}-${i}"]`
				);

				expect(skeleton).toBeNull();
			});
		});

		it('should render the skeleton when at least one store has not all the tokens initialized', async () => {
			vi.spyOn(enabledSplTokens, 'subscribe').mockImplementation((fn) => {
				fn([{ ...JUP_TOKEN, enabled: true }]);
				return () => {};
			});

			const { container } = render(AllTransactionsSkeletons, {
				props: {
					testIdPrefix,
					children: mockSnippet
				}
			});

			solTransactionsStore.append({ tokenId: SOLANA_TOKEN_ID, transactions: [] });

			await tick();

			Array.from({ length: 5 }).forEach((_, i) => {
				const skeleton: HTMLParagraphElement | null = container.querySelector(
					`div[data-tid="${testIdPrefix}-${i}"]`
				);

				expect(skeleton).toBeDefined();
			});
		});
	});
});
