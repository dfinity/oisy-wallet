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
		ambiguous: false
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

	it('only offers to reject a request Verify flags as a scam, and says why', () => {
		const { getByRole, getByTestId, queryByRole } = render(BtcWalletConnectSignPsbtReview, {
			props: { ...props, flaggedAsScam: true }
		});

		expect(getByTestId('wallet-connect-scam-warning')).toBeInTheDocument();
		expect(queryByRole('button', { name: en.core.text.approve })).not.toBeInTheDocument();
		expect(getByRole('button', { name: en.core.text.reject })).toBeInTheDocument();
	});
});
