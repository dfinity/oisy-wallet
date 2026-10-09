import { BASE_NETWORK } from '$env/networks/networks-evm/networks.evm.base.env';
import { ETHEREUM_NETWORK, SEPOLIA_NETWORK } from '$env/networks/networks.eth.env';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { BASE_ETH_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens.eth.env';
import { IC_CKETH_MINTER_CANISTER_ID } from '$env/tokens/tokens-icrc/tokens.icrc.ck.eth.env';
import { ETHEREUM_TOKEN, SEPOLIA_TOKEN } from '$env/tokens/tokens.eth.env';
import EthWalletConnectSendTokenModal from '$eth/components/wallet-connect/EthWalletConnectSendTokenModal.svelte';
import { CKETH_ABI } from '$eth/constants/cketh.constants';
import { send as sendServices } from '$eth/services/wallet-connect.services';
import type { EthereumNetwork } from '$eth/types/network';
import type { WalletConnectEthSendTransactionParams } from '$eth/types/wallet-connect';
import { loadCkEthMinterInfo } from '$icp-eth/services/cketh.services';
import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
import { EthFeePriority } from '$lib/enums/eth-fee-priority';
import { SEND_CONTEXT_KEY, initSendContext } from '$lib/stores/send.store';
import type { Token } from '$lib/types/token';
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
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { Interface } from 'ethers/abi';
import { tick } from 'svelte';
import { get } from 'svelte/store';

vi.mock(
	'$eth/components/fee/EthFeeContext.svelte',
	async () => await import('$tests/eth/components/wallet-connect/EthFeeContextStub.svelte')
);

vi.mock(import('$icp-eth/services/cketh.services'), async (importOriginal) => ({
	...(await importOriginal()),
	loadCkEthMinterInfo: vi.fn()
}));

vi.mock('$eth/services/wallet-connect.services', () => ({
	send: vi.fn()
}));

describe('EthWalletConnectSendTokenModal', () => {
	const setup = ({
		firstTransaction = {
			from: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
			to: '0x96329840d29ab4ac4A324cA0B01F64EAE7aA7a6a'
		},
		token = ETHEREUM_TOKEN,
		sourceNetwork = ETHEREUM_NETWORK
	}: {
		firstTransaction?: WalletConnectEthSendTransactionParams;
		token?: Token;
		sourceNetwork?: EthereumNetwork;
	} = {}) => {
		const sendContext = initSendContext({ token });

		const rendered = render(EthWalletConnectSendTokenModal, {
			props: {
				request: {
					verifyContext: { verified: { origin: 'https://dapp.example' } }
				} as WalletKitTypes.SessionRequest,
				firstTransaction,
				sourceNetwork,
				listener: undefined as OptionWalletConnectListener
			},
			context: new Map<symbol, unknown>([[SEND_CONTEXT_KEY, sendContext]])
		});

		return { ...sendContext, ...rendered };
	};

	beforeEach(() => {
		vi.clearAllMocks();

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
					firstTransaction: {
						from: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
						to,
						data: encodeDeposit(Principal.fromText('ryjl3-tyaaa-aaaaa-aaaba-cai'))
					}
				});

				expect(getByText(en.wallet_connect.text.unknown_call_title)).toBeInTheDocument();
			}
		);

		it.each([CKETH_HELPER, CKETH_HELPER.toLowerCase(), `0x${CKETH_HELPER.slice(2).toUpperCase()}`])(
			'should title a deposit to the principal of the user sent to %s as a send',
			(to) => {
				const { getByText } = setup({
					firstTransaction: {
						from: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
						to,
						data: encodeDeposit(mockPrincipal)
					}
				});

				expect(getByText(en.send.text.send)).toBeInTheDocument();
			}
		);

		it('should title a deposit as a contract call while the helper contract is not confirmed', () => {
			ckEthMinterInfoStore.reset(ETHEREUM_TOKEN.id);

			const { getByText } = setup({
				firstTransaction: {
					from: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
					to: CKETH_HELPER,
					data: encodeDeposit(mockPrincipal)
				}
			});

			expect(getByText(en.wallet_connect.text.unknown_call_title)).toBeInTheDocument();
		});

		it('should load the minter information for a request on Ethereum', async () => {
			ckEthMinterInfoStore.reset(ETHEREUM_TOKEN.id);

			setup();

			await waitFor(() => {
				expect(loadCkEthMinterInfo).toHaveBeenCalledWith({
					tokenId: ETHEREUM_TOKEN.id,
					canisters: { minterCanisterId: IC_CKETH_MINTER_CANISTER_ID }
				});
			});
		});

		it('should leave loading the minter information on an EVM network without ckETH as it was', async () => {
			setup({ token: BASE_ETH_TOKEN, sourceNetwork: BASE_NETWORK });

			await tick();

			expect(loadCkEthMinterInfo).not.toHaveBeenCalled();
		});

		// The review and the signing step read the helper contract from the same minter information:
		// the one for the network the request is on, not the one for the network selected in OISY.
		it('should sign with the minter information of the network the request is on', async () => {
			// Any address other than Ethereum's helper will do.
			const SEPOLIA_HELPER = '0x1111111111111111111111111111111111111111';

			const sepoliaMinterInfo = {
				data: { ...mockCkMinterInfo, eth_helper_contract_address: toNullable(SEPOLIA_HELPER) },
				certified: true
			};

			ckEthMinterInfoStore.set({ id: SEPOLIA_TOKEN.id, data: sepoliaMinterInfo });

			vi.mocked(sendServices).mockResolvedValue({ success: true });

			const { getByRole } = setup({
				firstTransaction: {
					from: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
					to: SEPOLIA_HELPER,
					data: encodeDeposit(mockPrincipal)
				},
				token: SEPOLIA_TOKEN,
				sourceNetwork: SEPOLIA_NETWORK
			});

			await fireEvent.click(getByRole('button', { name: en.core.text.approve }));

			await waitFor(() => {
				expect(sendServices).toHaveBeenCalledOnce();
			});

			expect(vi.mocked(sendServices).mock.calls[0][0]).toMatchObject({
				minterInfo: sepoliaMinterInfo,
				sourceNetwork: SEPOLIA_NETWORK,
				targetNetwork: ICP_NETWORK
			});

			ckEthMinterInfoStore.reset(SEPOLIA_TOKEN.id);
		});

		// The store can hold Ethereum's minter information under another chain's token, and the address
		// it names is not the ckETH helper on that chain.
		it('should not title a deposit on an EVM network without ckETH as a conversion', () => {
			ckEthMinterInfoStore.set({
				id: BASE_ETH_TOKEN.id,
				data: {
					data: { ...mockCkMinterInfo, eth_helper_contract_address: toNullable(CKETH_HELPER) },
					certified: true
				}
			});

			const { getByText } = setup({
				firstTransaction: {
					from: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
					to: CKETH_HELPER,
					data: encodeDeposit(mockPrincipal)
				},
				token: BASE_ETH_TOKEN,
				sourceNetwork: BASE_NETWORK
			});

			expect(getByText(en.wallet_connect.text.unknown_call_title)).toBeInTheDocument();

			ckEthMinterInfoStore.reset(BASE_ETH_TOKEN.id);
		});
	});
});
