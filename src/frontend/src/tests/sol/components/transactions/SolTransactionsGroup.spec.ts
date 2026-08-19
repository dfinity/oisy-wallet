import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import type { AllTransactionUiWithCmp } from '$lib/types/transaction-ui';
import SolTransactionsGroup from '$sol/components/transactions/SolTransactionsGroup.svelte';
import { summarizeSolFacts } from '$sol/services/sol-summary.services';
import type { SolTransactionGroup } from '$sol/types/sol-transaction-group';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import en from '$tests/mocks/i18n.mock';
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
		legs: [{ symbol: 'SOL', decimals: 9, net: -5_454_491n, native: true }],
		isSwap: false
	};

	beforeEach(() => {
		vi.resetAllMocks();

		mockAuthStore();
	});

	// The sentence is the row's title now, so it is asked for as soon as the row renders. The
	// service caches one answer per set of facts, which is what makes that affordable.
	it('should ask for a sentence as soon as the row renders', async () => {
		vi.mocked(summarizeSolFacts).mockResolvedValue('Transfer of 0.1 USD1 to 4GsmSut...AM56JR8.');

		render(SolTransactionsGroup, { props: { group } });

		await waitFor(() => {
			expect(summarizeSolFacts).toHaveBeenCalledOnce();
		});
	});

	it('should title the row with the sentence once it arrives', async () => {
		vi.mocked(summarizeSolFacts).mockResolvedValue('Transfer of 0.1 USD1 to 4GsmSut...AM56JR8.');

		const { getByTestId } = render(SolTransactionsGroup, { props: { group } });

		await waitFor(() => {
			expect(getByTestId('sol-transactions-group-label')).toHaveTextContent(
				'Transfer of 0.1 USD1 to 4GsmSut...AM56JR8.'
			);
		});
	});

	// Until it arrives the row still has to say something, and it says only what it can prove.
	it('should title the row with what it can prove until then', () => {
		vi.mocked(summarizeSolFacts).mockReturnValue(new Promise(() => {}));

		const { getByTestId } = render(SolTransactionsGroup, { props: { group } });

		expect(getByTestId('sol-transactions-group-label')).toHaveTextContent(
			en.transactions.text.grouped_bundle
		);
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
				legs: [{ symbol: 'SOL', decimals: 9, net: -5_454_491n, native: true }]
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
			group: { ...group, legs: [{ symbol: 'SOL', decimals: 9, net: -9_999_999n, native: true }] }
		});

		await waitFor(() => {
			expect(summarizeSolFacts).toHaveBeenCalledTimes(2);
		});
	});
});
