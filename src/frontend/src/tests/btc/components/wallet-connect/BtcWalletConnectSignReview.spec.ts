import BtcWalletConnectSignReview from '$btc/components/wallet-connect/BtcWalletConnectSignReview.svelte';
import { SESSION_REQUEST_BTC_SIGN_MESSAGE } from '$btc/constants/wallet-connect.constants';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('BtcWalletConnectSignReview', () => {
	const props = {
		application: 'https://dapp.example',
		method: SESSION_REQUEST_BTC_SIGN_MESSAGE,
		message: 'Sign in to Example with your Bitcoin account',
		source: mockBtcAddress,
		onApprove: vi.fn(),
		onReject: vi.fn()
	};

	it('shows the message in the order it is signed, with its line breaks', () => {
		const { getByText } = render(BtcWalletConnectSignReview, {
			props: { ...props, message: 'Sign in to Example\nPay \u202E0001\u202C BTC' }
		});

		const message = getByText('Sign in to Example Pay 0001 BTC');

		expect(message.textContent).toBe('Sign in to Example\nPay 0001 BTC');
		expect(message).toHaveClass('whitespace-pre-wrap');
	});

	it('offers to approve a request Verify does not flag', () => {
		const { getByRole, queryByTestId } = render(BtcWalletConnectSignReview, { props });

		expect(queryByTestId('wallet-connect-scam-warning')).not.toBeInTheDocument();
		expect(getByRole('button', { name: en.core.text.approve })).toBeInTheDocument();
	});

	it('only offers to reject a request Verify flags as a scam, and says why', () => {
		const { getByRole, getByTestId, queryByRole } = render(BtcWalletConnectSignReview, {
			props: { ...props, flaggedAsScam: true }
		});

		expect(getByTestId('wallet-connect-scam-warning')).toBeInTheDocument();
		expect(queryByRole('button', { name: en.core.text.approve })).not.toBeInTheDocument();
		expect(getByRole('button', { name: en.core.text.reject })).toBeInTheDocument();
	});
});
