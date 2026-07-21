import SolWalletConnectSignMessageReview from '$sol/components/wallet-connect/SolWalletConnectSignMessageReview.svelte';
import { SESSION_REQUEST_SOL_SIGN_MESSAGE } from '$sol/constants/wallet-connect.constants';
import en from '$tests/mocks/i18n.mock';
import { mockSolAddress } from '$tests/mocks/sol.mock';
import { render } from '@testing-library/svelte';

describe('SolWalletConnectSignMessageReview', () => {
	const props = {
		application: 'https://example.com',
		method: SESSION_REQUEST_SOL_SIGN_MESSAGE,
		message: 'Sign in to Example with your Solana account',
		source: mockSolAddress,
		onApprove: vi.fn(),
		onReject: vi.fn()
	};

	it('should render the application, method, signing address and decoded message', () => {
		const { getByText } = render(SolWalletConnectSignMessageReview, { props });

		expect(getByText(props.application)).toBeInTheDocument();
		expect(getByText(props.method)).toBeInTheDocument();
		expect(getByText(props.source)).toBeInTheDocument();
		expect(getByText(props.message)).toBeInTheDocument();
	});

	it('should render the field labels', () => {
		const { getByText } = render(SolWalletConnectSignMessageReview, { props });

		expect(getByText(en.wallet_connect.text.application)).toBeInTheDocument();
		expect(getByText(en.wallet_connect.text.method)).toBeInTheDocument();
		expect(getByText(en.wallet_connect.text.signing_address)).toBeInTheDocument();
		expect(getByText(en.wallet_connect.text.message)).toBeInTheDocument();
	});
});
