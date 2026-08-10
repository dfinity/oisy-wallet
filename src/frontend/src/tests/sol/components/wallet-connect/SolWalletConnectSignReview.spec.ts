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
		feeToken: SOLANA_TOKEN,
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

	it('should render the base network fee', () => {
		const { getByText } = render(SolWalletConnectSignReview, {
			props
		});

		expect(getByText(en.fee.text.network_fee)).toBeInTheDocument();
		expect(getByText('0.000005 SOL')).toBeInTheDocument();
	});

	it('should render the prioritization fee', () => {
		const { getByText } = render(SolWalletConnectSignReview, {
			props: {
				...props,
				prioritizationFee: 238_217n
			}
		});

		expect(getByText(en.fee.text.prioritization_fee)).toBeInTheDocument();
		expect(getByText('0.000238217 SOL')).toBeInTheDocument();
	});

	it('should not render the prioritization fee when the transaction requests none', () => {
		const { queryByText } = render(SolWalletConnectSignReview, {
			props
		});

		expect(queryByText(en.fee.text.prioritization_fee)).not.toBeInTheDocument();
	});

	it('should warn about an unusually high prioritization fee', () => {
		const { getByText } = render(SolWalletConnectSignReview, {
			props: {
				...props,
				prioritizationFee: 1_400_000_000_000n
			}
		});

		expect(getByText(en.wallet_connect.text.high_prioritization_fee)).toBeInTheDocument();
		expect(getByText('1400 SOL')).toBeInTheDocument();
	});

	it('should not warn about a prioritization fee within the usual range', () => {
		const { queryByText } = render(SolWalletConnectSignReview, {
			props: {
				...props,
				prioritizationFee: 238_217n
			}
		});

		expect(queryByText(en.wallet_connect.text.high_prioritization_fee)).not.toBeInTheDocument();
	});
});
