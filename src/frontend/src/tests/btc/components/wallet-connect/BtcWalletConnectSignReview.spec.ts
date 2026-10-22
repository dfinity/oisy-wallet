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
