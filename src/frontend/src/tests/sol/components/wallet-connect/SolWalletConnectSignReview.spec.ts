import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import SolWalletConnectSignReview from '$sol/components/wallet-connect/SolWalletConnectSignReview.svelte';
import en from '$tests/mocks/i18n.mock';
import { mockSolAddress, mockSolAddress2 } from '$tests/mocks/sol.mock';
import { render } from '@testing-library/svelte';

describe('SolWalletConnectSignReview', () => {
	const props = {
		amount: 1_000_000n,
		application: 'https://example.com',
		destination: mockSolAddress2,
		source: mockSolAddress,
		token: SOLANA_TOKEN,
		onApprove: vi.fn(),
		onReject: vi.fn()
	};

	it('should render the unreviewed instructions warning', () => {
		const { getByText } = render(SolWalletConnectSignReview, {
			props: {
				...props,
				unreviewed: true
			}
		});

		expect(getByText(en.wallet_connect.text.unreviewed_instructions)).toBeInTheDocument();
	});

	it('should not render the unreviewed instructions warning by default', () => {
		const { queryByText } = render(SolWalletConnectSignReview, {
			props
		});

		expect(queryByText(en.wallet_connect.text.unreviewed_instructions)).not.toBeInTheDocument();
	});
});
