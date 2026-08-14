import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import SolTransactionSummary from '$sol/components/transactions/SolTransactionSummary.svelte';
import { summarizeSolFacts } from '$sol/services/sol-summary.services';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import en from '$tests/mocks/i18n.mock';
import { createMockSolTransactionUi } from '$tests/mocks/sol-transactions.mock';
import { mockSolAddress2 } from '$tests/mocks/sol.mock';
import { render, waitFor } from '@testing-library/svelte';

vi.mock('$sol/services/sol-summary.services');

describe('SolTransactionSummary', () => {
	const props = {
		token: SOLANA_TOKEN,
		transaction: {
			...createMockSolTransactionUi('tx-1'),
			value: 5_000_000n,
			to: mockSolAddress2
		}
	};

	beforeEach(() => {
		vi.resetAllMocks();

		mockAuthStore();
	});

	it('should render the sentence with the label and the note that it is generated', async () => {
		vi.mocked(summarizeSolFacts).mockResolvedValue('Transfer of 0.005 SOL.');

		const { getByTestId, getByText } = render(SolTransactionSummary, { props });

		await waitFor(() => {
			expect(getByTestId('sol-summary-text')).toHaveTextContent('Transfer of 0.005 SOL.');
		});

		expect(getByText(en.transaction.text.summary)).toBeInTheDocument();
		expect(getByText(en.transaction.text.summary_note)).toBeInTheDocument();
	});

	// The history screen is not a signing screen, so it must not tell the reader that the rows
	// below are what they are about to sign.
	it('should not use the note written for a sign request', async () => {
		vi.mocked(summarizeSolFacts).mockResolvedValue('Transfer of 0.005 SOL.');

		const { queryByText } = render(SolTransactionSummary, { props });

		await waitFor(() => {
			expect(summarizeSolFacts).toHaveBeenCalled();
		});

		expect(queryByText(en.wallet_connect.text.summary_note)).not.toBeInTheDocument();
	});

	it('should render the model output as text and never as markup', async () => {
		vi.mocked(summarizeSolFacts).mockResolvedValue(
			'Transfer of 0.005 SOL <img src=x onerror=alert(1)>.'
		);

		const { getByTestId } = render(SolTransactionSummary, { props });

		await waitFor(() => {
			expect(getByTestId('sol-summary-text')).toBeInTheDocument();
		});

		const rendered = getByTestId('sol-summary-text');

		expect(rendered.querySelector('img')).toBeNull();
		expect(rendered.children).toHaveLength(0);
	});

	it('should ask only for the facts the modal shows', async () => {
		vi.mocked(summarizeSolFacts).mockResolvedValue(undefined);

		render(SolTransactionSummary, { props });

		await vi.waitFor(() => {
			expect(summarizeSolFacts).toHaveBeenCalledWith(
				expect.objectContaining({
					facts: [
						'Direction: sent from this wallet',
						'Amount: 0.005 SOL',
						'Recipient: 4GsmSut...AM56JR8',
						'Status: finalized'
					]
				})
			);
		});
	});

	it('should render nothing when no sentence is produced', async () => {
		vi.mocked(summarizeSolFacts).mockResolvedValue(undefined);

		const { queryByTestId } = render(SolTransactionSummary, { props });

		await vi.waitFor(() => {
			expect(summarizeSolFacts).toHaveBeenCalled();
		});

		expect(queryByTestId('sol-summary')).not.toBeInTheDocument();
	});
});
