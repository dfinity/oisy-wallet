import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import type { AllTransactionUiWithCmp } from '$lib/types/transaction-ui';
import SolTransactionsGroup from '$sol/components/transactions/SolTransactionsGroup.svelte';
import { summarizeSolFacts } from '$sol/services/sol-summary.services';
import type { SolTransactionGroup } from '$sol/types/sol-transaction-group';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { createMockSolTransactionUi } from '$tests/mocks/sol-transactions.mock';
import { fireEvent, render, waitFor } from '@testing-library/svelte';

vi.mock('$sol/services/sol-summary.services');

describe('SolTransactionsGroup', () => {
	const row = () =>
		({
			component: 'solana',
			token: SOLANA_TOKEN,
			transaction: { ...createMockSolTransactionUi('tx-1'), value: 5_000_000n }
		}) as AllTransactionUiWithCmp;

	const group: SolTransactionGroup = {
		signature: 'sig',
		transactions: [row(), row()] as never,
		legs: [{ symbol: 'SOL', decimals: 9, net: -5_454_491n }],
		isSwap: false
	};

	beforeEach(() => {
		vi.resetAllMocks();

		mockAuthStore();
	});

	// The sentence costs an update call, so a group nobody opened must not pay for one.
	it('should not ask for a sentence before the group is opened', () => {
		vi.mocked(summarizeSolFacts).mockResolvedValue('Paid 0.005454491 SOL.');

		render(SolTransactionsGroup, { props: { group } });

		expect(summarizeSolFacts).not.toHaveBeenCalled();
	});

	it('should show the sentence once the group is opened', async () => {
		vi.mocked(summarizeSolFacts).mockResolvedValue('Paid 0.005454491 SOL.');

		const { getByTestId, getByText } = render(SolTransactionsGroup, { props: { group } });

		await fireEvent.click(getByTestId('collapsible-header'));

		await waitFor(() => {
			expect(summarizeSolFacts).toHaveBeenCalledOnce();
		});

		await waitFor(() => {
			expect(getByText('Paid 0.005454491 SOL.')).toBeInTheDocument();
		});
	});

	// Collapsing hides it; re-opening must not buy it a second time.
	it('should ask only once across repeated toggles', async () => {
		vi.mocked(summarizeSolFacts).mockResolvedValue('Paid 0.005454491 SOL.');

		const { getByTestId } = render(SolTransactionsGroup, { props: { group } });

		const header = getByTestId('collapsible-header');

		await fireEvent.click(header);
		await fireEvent.click(header);
		await fireEvent.click(header);

		await waitFor(() => {
			expect(summarizeSolFacts).toHaveBeenCalledOnce();
		});
	});

	// The bug this guards: the activity list rebuilds its rows on every store tick, so an identical
	// fact list arrives as a fresh array. Tracking its identity fired a new canister call each time
	// and cancelled the answer the previous one was waiting for, so no sentence ever arrived while
	// the canister was asked over a hundred times a minute for one open group.
	it('should not ask again when the same group is rebuilt with identical contents', async () => {
		vi.mocked(summarizeSolFacts).mockResolvedValue('Paid 0.005454491 SOL.');

		const { getByTestId, rerender } = render(SolTransactionsGroup, { props: { group } });

		await fireEvent.click(getByTestId('collapsible-header'));

		await waitFor(() => {
			expect(summarizeSolFacts).toHaveBeenCalledOnce();
		});

		// A new object, a new array of legs, the very same facts.
		await rerender({
			group: {
				...group,
				transactions: [row(), row()] as never,
				legs: [{ symbol: 'SOL', decimals: 9, net: -5_454_491n }]
			}
		});

		await waitFor(() => {
			expect(summarizeSolFacts).toHaveBeenCalledOnce();
		});
	});

	it('should ask again when the facts themselves change', async () => {
		vi.mocked(summarizeSolFacts).mockResolvedValue('Paid 0.005454491 SOL.');

		const { getByTestId, rerender } = render(SolTransactionsGroup, { props: { group } });

		await fireEvent.click(getByTestId('collapsible-header'));

		await waitFor(() => {
			expect(summarizeSolFacts).toHaveBeenCalledOnce();
		});

		await rerender({
			group: { ...group, legs: [{ symbol: 'SOL', decimals: 9, net: -9_999_999n }] }
		});

		await waitFor(() => {
			expect(summarizeSolFacts).toHaveBeenCalledTimes(2);
		});
	});
});
