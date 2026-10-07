import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import EthWalletConnectSendTokenModal from '$eth/components/wallet-connect/EthWalletConnectSendTokenModal.svelte';
import { CKETH_ABI } from '$eth/constants/cketh.constants';
import type { WalletConnectEthSendTransactionParams } from '$eth/types/wallet-connect';
import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
import { EthFeePriority } from '$lib/enums/eth-fee-priority';
import { SEND_CONTEXT_KEY, initSendContext } from '$lib/stores/send.store';
import type { OptionWalletConnectListener } from '$lib/types/wallet-connect';
import { observedPriority } from '$tests/eth/components/wallet-connect/eth-fee-context-stub.store';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockCkMinterInfo } from '$tests/mocks/ck-minter.mock';
import en from '$tests/mocks/i18n.mock';
import { mockPrincipal } from '$tests/mocks/identity.mock';
import { toNullable } from '@dfinity/utils';
import { encodePrincipalToEthAddress } from '@icp-sdk/canisters/cketh';
import { Principal } from '@icp-sdk/core/principal';
import type { WalletKitTypes } from '@reown/walletkit';
import { render, waitFor } from '@testing-library/svelte';
import { Interface } from 'ethers/abi';
import { get } from 'svelte/store';

vi.mock(
	'$eth/components/fee/EthFeeContext.svelte',
	async () => await import('$tests/eth/components/wallet-connect/EthFeeContextStub.svelte')
);

describe('EthWalletConnectSendTokenModal', () => {
	const setup = (
		firstTransaction: WalletConnectEthSendTransactionParams = {
			from: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
			to: '0x96329840d29ab4ac4A324cA0B01F64EAE7aA7a6a'
		}
	) => {
		const sendContext = initSendContext({ token: ETHEREUM_TOKEN });

		const { getByText } = render(EthWalletConnectSendTokenModal, {
			props: {
				request: {
					verifyContext: { verified: { origin: 'https://dapp.example' } }
				} as WalletKitTypes.SessionRequest,
				firstTransaction,
				sourceNetwork: ETHEREUM_NETWORK,
				listener: undefined as OptionWalletConnectListener
			},
			context: new Map<symbol, unknown>([[SEND_CONTEXT_KEY, sendContext]])
		});

		return { ...sendContext, getByText };
	};

	beforeEach(() => {
		observedPriority.set(undefined);
	});

	it('should price a request at the standard tier until the user says otherwise', async () => {
		setup();

		await waitFor(() => {
			expect(get(observedPriority)).toBe(EthFeePriority.STANDARD);
		});
	});

	it('should hand the fee context the tier the user picked', async () => {
		// Without this the choice would still be recorded and still be highlighted in the row, and
		// nothing would re-price: the fee quoted and the fee signed would both stay on normal.
		const { sendEthFeePriority } = setup();

		await waitFor(() => {
			expect(get(observedPriority)).toBe(EthFeePriority.STANDARD);
		});

		sendEthFeePriority.set(EthFeePriority.FAST);

		await waitFor(() => {
			expect(get(observedPriority)).toBe(EthFeePriority.FAST);
		});
	});

	describe('ckETH helper contract', () => {
		// The ckETH helper contract on Ethereum mainnet, as the minter returns it.
		const CKETH_HELPER = '0x7574eB42cA208A4f6960ECCAfDF186D627dCC175';

		const encodeDeposit = (principal: Principal): string =>
			new Interface(CKETH_ABI).encodeFunctionData('deposit', [
				encodePrincipalToEthAddress(principal)
			]);

		beforeEach(() => {
			mockAuthStore();

			ckEthMinterInfoStore.set({
				id: ETHEREUM_TOKEN.id,
				data: {
					data: { ...mockCkMinterInfo, eth_helper_contract_address: toNullable(CKETH_HELPER) },
					certified: true
				}
			});
		});

		afterEach(() => {
			ckEthMinterInfoStore.reset(ETHEREUM_TOKEN.id);
		});

		it.each([CKETH_HELPER, CKETH_HELPER.toLowerCase(), `0x${CKETH_HELPER.slice(2).toUpperCase()}`])(
			'should title a deposit to another principal sent to %s as a contract call',
			(to) => {
				const { getByText } = setup({
					from: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
					to,
					data: encodeDeposit(Principal.fromText('ryjl3-tyaaa-aaaaa-aaaba-cai'))
				});

				expect(getByText(en.wallet_connect.text.unknown_call_title)).toBeInTheDocument();
			}
		);

		it.each([CKETH_HELPER, CKETH_HELPER.toLowerCase(), `0x${CKETH_HELPER.slice(2).toUpperCase()}`])(
			'should title a deposit to the principal of the user sent to %s as a send',
			(to) => {
				const { getByText } = setup({
					from: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
					to,
					data: encodeDeposit(mockPrincipal)
				});

				expect(getByText(en.send.text.send)).toBeInTheDocument();
			}
		);
	});
});
