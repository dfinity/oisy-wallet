import BtcWalletConnectSignPsbtReview from '$btc/components/wallet-connect/BtcWalletConnectSignPsbtReview.svelte';
import type { WalletConnectBtcDecodedPsbt } from '$btc/types/wallet-connect';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('BtcWalletConnectSignPsbtReview', () => {
	const decoded: WalletConnectBtcDecodedPsbt = {
		inputs: [{ address: mockBtcAddress, value: 10_000n, signedByWallet: true }],
		outputs: [{ address: mockBtcAddress, value: 9_000n }],
		totalSignedInputs: 10_000n,
		fee: 1_000n,
		broadcast: false,
		ambiguous: false,
		unverified: false
	};

	const props = {
		application: 'https://dapp.example',
		source: mockBtcAddress,
		decoded,
		decodeError: false,
		onApprove: vi.fn(),
		onReject: vi.fn()
	};

	it('offers to approve a request Verify does not flag', () => {
		const { getByRole, queryByTestId } = render(BtcWalletConnectSignPsbtReview, { props });

		expect(queryByTestId('wallet-connect-scam-warning')).not.toBeInTheDocument();
		expect(getByRole('button', { name: en.core.text.approve })).toBeInTheDocument();
	});

	it('shows a spinner and does not offer to approve while the wallet UTXOs load', () => {
		const { getByTestId, queryByRole, queryByText } = render(BtcWalletConnectSignPsbtReview, {
			props: { ...props, decoded: undefined, loading: true }
		});

		expect(getByTestId('btc-wallet-connect-sign-psbt-loading')).toBeInTheDocument();
		expect(queryByText(en.wallet_connect.error.btc_psbt_decode)).not.toBeInTheDocument();
		expect(queryByRole('button', { name: en.core.text.approve })).not.toBeInTheDocument();
	});

	it('only offers to reject a request with an input of the wallet it could not check, and says why', () => {
		const { getByRole, getByText, queryByRole, queryByText } = render(
			BtcWalletConnectSignPsbtReview,
			{ props: { ...props, decoded: { ...decoded, unverified: true } } }
		);

		expect(getByText(en.wallet_connect.error.btc_psbt_input_unverified)).toBeInTheDocument();
		expect(queryByText(en.wallet_connect.text.psbt_inputs)).not.toBeInTheDocument();
		expect(queryByRole('button', { name: en.core.text.approve })).not.toBeInTheDocument();
		expect(getByRole('button', { name: en.core.text.reject })).toBeInTheDocument();
	});

	it('only offers to reject a request Verify flags as a scam, and says why', () => {
		const { getByRole, getByTestId, queryByRole } = render(BtcWalletConnectSignPsbtReview, {
			props: { ...props, flaggedAsScam: true }
		});

		expect(getByTestId('wallet-connect-scam-warning')).toBeInTheDocument();
		expect(queryByRole('button', { name: en.core.text.approve })).not.toBeInTheDocument();
		expect(getByRole('button', { name: en.core.text.reject })).toBeInTheDocument();
	});
});
