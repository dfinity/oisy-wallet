import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import EthWalletConnectSendTokenModal from '$eth/components/wallet-connect/EthWalletConnectSendTokenModal.svelte';
import { EthFeePriority } from '$lib/enums/eth-fee-priority';
import { SEND_CONTEXT_KEY, initSendContext } from '$lib/stores/send.store';
import type { OptionWalletConnectListener } from '$lib/types/wallet-connect';
import { observedPriority } from '$tests/eth/components/wallet-connect/eth-fee-context-stub.store';
import type { WalletKitTypes } from '@reown/walletkit';
import { render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

vi.mock(
	'$eth/components/fee/EthFeeContext.svelte',
	async () => await import('$tests/eth/components/wallet-connect/EthFeeContextStub.svelte')
);

describe('EthWalletConnectSendTokenModal', () => {
	const setup = () => {
		const sendContext = initSendContext({ token: ETHEREUM_TOKEN });

		render(EthWalletConnectSendTokenModal, {
			props: {
				request: {
					verifyContext: { verified: { origin: 'https://dapp.example' } }
				} as WalletKitTypes.SessionRequest,
				firstTransaction: {
					from: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
					to: '0x96329840d29ab4ac4A324cA0B01F64EAE7aA7a6a'
				},
				sourceNetwork: ETHEREUM_NETWORK,
				listener: undefined as OptionWalletConnectListener
			},
			context: new Map<symbol, unknown>([[SEND_CONTEXT_KEY, sendContext]])
		});

		return sendContext;
	};

	beforeEach(() => {
		observedPriority.set(undefined);
	});

	it('should price a request at the normal tier until the user says otherwise', async () => {
		setup();

		await waitFor(() => {
			expect(get(observedPriority)).toBe(EthFeePriority.NORMAL);
		});
	});

	it('should hand the fee context the tier the user picked', async () => {
		// Without this the choice would still be recorded and still be highlighted in the row, and
		// nothing would re-price: the fee quoted and the fee signed would both stay on normal.
		const { sendEthFeePriority } = setup();

		await waitFor(() => {
			expect(get(observedPriority)).toBe(EthFeePriority.NORMAL);
		});

		sendEthFeePriority.set(EthFeePriority.FAST);

		await waitFor(() => {
			expect(get(observedPriority)).toBe(EthFeePriority.FAST);
		});
	});
});
