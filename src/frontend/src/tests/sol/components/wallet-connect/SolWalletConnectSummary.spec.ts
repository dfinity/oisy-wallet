import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import SolWalletConnectSummary from '$sol/components/wallet-connect/SolWalletConnectSummary.svelte';
import { summarizeSolWalletConnectRequest } from '$sol/services/wallet-connect-summary.services';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import en from '$tests/mocks/i18n.mock';
import { mockSolAddress, mockSolAddress2 } from '$tests/mocks/sol.mock';
import { render, waitFor } from '@testing-library/svelte';

vi.mock('$sol/services/wallet-connect-summary.services');

describe('SolWalletConnectSummary', () => {
	const props = {
		amount: 1_000_000n,
		token: SOLANA_TOKEN,
		feeToken: SOLANA_TOKEN,
		source: mockSolAddress,
		destination: mockSolAddress2,
		isApproval: false,
		unreviewed: false,
		networkFee: 5_000n
	};

	beforeEach(() => {
		vi.resetAllMocks();

		mockAuthStore();
	});

	it('should render the sentence with the label and the note that it is generated', async () => {
		vi.mocked(summarizeSolWalletConnectRequest).mockResolvedValue('Transfer of 0.001 SOL.');

		const { getByTestId, getByText } = render(SolWalletConnectSummary, { props });

		await waitFor(() => {
			expect(getByTestId('wallet-connect-summary-text')).toHaveTextContent(
				'Transfer of 0.001 SOL.'
			);
		});

		expect(getByText(en.wallet_connect.text.summary)).toBeInTheDocument();
		expect(getByText(en.wallet_connect.text.summary_note)).toBeInTheDocument();
	});

	// The audit finding this feature must not repeat: model output next to a live approval
	// control, rendered through a permissive sanitizer instead of as text.
	it('should render the model output as text and never as markup', async () => {
		vi.mocked(summarizeSolWalletConnectRequest).mockResolvedValue(
			'Transfer of 0.001 SOL <img src=x onerror=alert(1)>.'
		);

		const { getByTestId } = render(SolWalletConnectSummary, { props });

		await waitFor(() => {
			expect(getByTestId('wallet-connect-summary-text')).toBeInTheDocument();
		});

		const rendered = getByTestId('wallet-connect-summary-text');

		expect(rendered.querySelector('img')).toBeNull();
		expect(rendered.children).toHaveLength(0);
		expect(rendered).toHaveTextContent('Transfer of 0.001 SOL <img src=x onerror=alert(1)>.');
	});

	it('should render nothing while the sentence has not arrived', () => {
		vi.mocked(summarizeSolWalletConnectRequest).mockReturnValue(new Promise(() => {}));

		const { queryByTestId, queryByText } = render(SolWalletConnectSummary, { props });

		expect(queryByTestId('wallet-connect-summary')).not.toBeInTheDocument();
		expect(queryByText(en.wallet_connect.text.summary)).not.toBeInTheDocument();
	});

	it('should render nothing when no sentence is produced', async () => {
		vi.mocked(summarizeSolWalletConnectRequest).mockResolvedValue(undefined);

		const { queryByTestId } = render(SolWalletConnectSummary, { props });

		await vi.waitFor(() => {
			expect(summarizeSolWalletConnectRequest).toHaveBeenCalled();
		});

		expect(queryByTestId('wallet-connect-summary')).not.toBeInTheDocument();
	});

	it('should ask only for the facts the review derived', async () => {
		vi.mocked(summarizeSolWalletConnectRequest).mockResolvedValue(undefined);

		render(SolWalletConnectSummary, { props });

		await vi.waitFor(() => {
			expect(summarizeSolWalletConnectRequest).toHaveBeenCalled();
		});

		const [[{ facts }]] = vi.mocked(summarizeSolWalletConnectRequest).mock.calls;

		expect(facts).toStrictEqual([
			'Signer: 7q6RDbn...EBmEMf1',
			'Amount: 0.001 SOL',
			'Recipient: 4GsmSut...AM56JR8',
			'Network fee: 0.000005 SOL'
		]);
	});
});
