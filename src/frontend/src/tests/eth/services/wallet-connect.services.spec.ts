import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ERC_SET_APPROVAL_FOR_ALL_HASH } from '$eth/constants/erc.constants';
import { ERC20_APPROVE_HASH, ERC20_TRANSFER_HASH } from '$eth/constants/erc20.constants';
import {
	SESSION_REQUEST_ETH_SIGN,
	SESSION_REQUEST_ETH_SIGN_LEGACY,
	SESSION_REQUEST_ETH_SIGN_V4,
	SESSION_REQUEST_PERSONAL_SIGN
} from '$eth/constants/wallet-connect.constants';
import { send as executeSend } from '$eth/services/send.services';
import { send, signMessage } from '$eth/services/wallet-connect.services';
import { erc20CustomTokensStore } from '$eth/stores/erc20-custom-tokens.store';
import { erc20DefaultTokensStore } from '$eth/stores/erc20-default-tokens.store';
import type {
	EthWalletConnectRefusal,
	WalletConnectEthSignTypedDataV4
} from '$eth/types/wallet-connect';
import { signMessage as signMessageApi, signPrehash } from '$lib/api/signer.api';
import { ZERO } from '$lib/constants/app.constants';
import { UNEXPECTED_ERROR } from '$lib/constants/wallet-connect.constants';
import { trackWalletConnectUncheckedSigning } from '$lib/services/wallet-connect-analytics.services';
import { authStore } from '$lib/stores/auth.store';
import * as toastsStore from '$lib/stores/toasts.store';
import type { WalletConnectListener } from '$lib/types/wallet-connect';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import type { WalletKitTypes } from '@reown/walletkit';
import { AbiCoder } from 'ethers/abi';

vi.mock('$lib/api/signer.api', () => ({
	signPrehash: vi.fn(),
	signMessage: vi.fn()
}));

vi.mock('$eth/services/send.services', () => ({
	send: vi.fn()
}));

vi.mock('$lib/services/wallet-connect-analytics.services', () => ({
	trackWalletConnectUncheckedSigning: vi.fn()
}));

const HOLDER = '0x96329840d29ab4ac4A324cA0B01F64EAE7aA7a6a';
const SPENDER = '0xcA11bde05977b3631167028862bE2a173976CA11';
const DAI = '0x6b175474e89094c44da98b954eedeac495271d0f';

const daiPermitJson = (allowed: unknown): string => {
	const typedData: WalletConnectEthSignTypedDataV4 = {
		domain: { name: 'Dai Stablecoin', version: '1', chainId: '1', verifyingContract: DAI },
		types: {
			EIP712Domain: [
				{ name: 'name', type: 'string' },
				{ name: 'version', type: 'string' },
				{ name: 'chainId', type: 'uint256' },
				{ name: 'verifyingContract', type: 'address' }
			],
			Permit: [
				{ name: 'holder', type: 'address' },
				{ name: 'spender', type: 'address' },
				{ name: 'nonce', type: 'uint256' },
				{ name: 'expiry', type: 'uint256' },
				{ name: 'allowed', type: 'bool' }
			]
		},
		primaryType: 'Permit',
		message: { holder: HOLDER, spender: SPENDER, nonce: '0', expiry: '1893456000', allowed }
	};
	return JSON.stringify(typedData);
};

describe('eth wallet-connect.services', () => {
	describe('signMessage', () => {
		const mockListener = {
			rejectRequest: vi.fn(),
			approveRequest: vi.fn()
		} as unknown as WalletConnectListener;

		const buildRequest = ({
			method,
			params
		}: {
			method: string;
			params: string[];
		}): WalletKitTypes.SessionRequest =>
			({
				id: 1,
				topic: 'mock-topic',
				// A WalletConnect envelope states its chain in CAIP-2, which is what the signing path
				// holds the EIP-712 domain to. Every fixture below is a chain 1 domain.
				params: { chainId: 'eip155:1', request: { method, params } }
			}) as unknown as WalletKitTypes.SessionRequest;

		const buildParams = (request: WalletKitTypes.SessionRequest) => ({
			request,
			listener: mockListener,
			modalNext: vi.fn(),
			progress: vi.fn()
		});

		beforeEach(() => {
			vi.clearAllMocks();
			authStore.setForTesting(mockIdentity);
			vi.mocked(signPrehash).mockResolvedValue('0xPREHASH_SIGNATURE');
			vi.mocked(signMessageApi).mockResolvedValue('0xRAW_SIGNATURE');
		});

		it('signs a valid typed-data permit via signPrehash and approves', async () => {
			const request = buildRequest({
				method: SESSION_REQUEST_ETH_SIGN_V4,
				params: [HOLDER, daiPermitJson(true)]
			});

			const result = await signMessage(buildParams(request));

			expect(result).toStrictEqual({ success: true });
			expect(signPrehash).toHaveBeenCalledOnce();
			expect(signMessageApi).not.toHaveBeenCalled();
			expect(mockListener.approveRequest).toHaveBeenCalledExactlyOnceWith({
				id: request.id,
				topic: request.topic,
				message: '0xPREHASH_SIGNATURE'
			});
			expect(mockListener.rejectRequest).not.toHaveBeenCalled();
		});

		it('rejects a type-invalid typed-data permit and never signs', async () => {
			// `allowed` is the string "false": ethers would coerce it to the boolean
			// true, so the request must be rejected, not signed or downgraded.
			const request = buildRequest({
				method: SESSION_REQUEST_ETH_SIGN_V4,
				params: [HOLDER, daiPermitJson('false')]
			});

			const result = await signMessage(buildParams(request));

			expect(result.success).toBeFalsy();
			expect(signPrehash).not.toHaveBeenCalled();
			expect(signMessageApi).not.toHaveBeenCalled();
			expect(mockListener.approveRequest).not.toHaveBeenCalled();
			expect(mockListener.rejectRequest).toHaveBeenCalledExactlyOnceWith({
				topic: request.topic,
				id: request.id,
				error: UNEXPECTED_ERROR
			});
		});

		it('rejects a v4 request that fails to hash for a non-validation reason', async () => {
			// Malformed JSON makes the typed-data hash throw a non-validation error; a
			// v4 request must still be rejected, never downgraded to raw signing.
			const request = buildRequest({
				method: SESSION_REQUEST_ETH_SIGN_V4,
				params: [HOLDER, '{ not valid json ']
			});

			const result = await signMessage(buildParams(request));

			expect(result.success).toBeFalsy();
			expect(signPrehash).not.toHaveBeenCalled();
			expect(signMessageApi).not.toHaveBeenCalled();
			expect(mockListener.approveRequest).not.toHaveBeenCalled();
			expect(mockListener.rejectRequest).toHaveBeenCalledExactlyOnceWith({
				topic: request.topic,
				id: request.id,
				error: UNEXPECTED_ERROR
			});
		});

		it('signs a valid typed-data permit via signPrehash for the legacy typed-data method', async () => {
			const request = buildRequest({
				method: SESSION_REQUEST_ETH_SIGN_LEGACY,
				params: [HOLDER, daiPermitJson(true)]
			});

			const result = await signMessage(buildParams(request));

			expect(result).toStrictEqual({ success: true });
			expect(signPrehash).toHaveBeenCalledOnce();
			expect(signMessageApi).not.toHaveBeenCalled();
		});

		it('signs a plain (non-typed-data) message as a raw message', async () => {
			const message = '0x48656c6c6f'; // "Hello"
			const request = buildRequest({
				method: SESSION_REQUEST_PERSONAL_SIGN,
				params: [message, HOLDER]
			});

			const result = await signMessage(buildParams(request));

			expect(result).toStrictEqual({ success: true });
			expect(signPrehash).not.toHaveBeenCalled();
			expect(signMessageApi).toHaveBeenCalledOnce();
			expect(vi.mocked(signMessageApi).mock.calls[0][0]).toMatchObject({ message });
			expect(mockListener.approveRequest).toHaveBeenCalledExactlyOnceWith({
				id: request.id,
				topic: request.topic,
				message: '0xRAW_SIGNATURE'
			});
		});

		it.each([SESSION_REQUEST_PERSONAL_SIGN, SESSION_REQUEST_ETH_SIGN])(
			'signs a valid typed-data permit sent through %s as a raw message, never as EIP-712',
			async (method) => {
				// A dApp can dress an executable EIP-712 authorization as a plain message
				// request. It is approved as a plain message, so it must be signed as one.
				const message = daiPermitJson(true);
				// `eth_sign` takes [address, data] while `personal_sign` takes [data, address].
				const request = buildRequest({
					method,
					params: method === SESSION_REQUEST_ETH_SIGN ? [HOLDER, message] : [message, HOLDER]
				});

				const result = await signMessage(buildParams(request));

				expect(result).toStrictEqual({ success: true });
				expect(signPrehash).not.toHaveBeenCalled();
				expect(signMessageApi).toHaveBeenCalledOnce();
				expect(vi.mocked(signMessageApi).mock.calls[0][0]).toMatchObject({ message });
				expect(mockListener.approveRequest).toHaveBeenCalledExactlyOnceWith({
					id: request.id,
					topic: request.topic,
					message: '0xRAW_SIGNATURE'
				});
			}
		);
	});

	describe('send', () => {
		const mockListener = {
			rejectRequest: vi.fn(),
			approveRequest: vi.fn()
		} as unknown as WalletConnectListener;

		const estimatedGas = 250_000n;

		const buildParams = ({
			gas,
			to = SPENDER,
			data,
			acknowledgedRefusals = [],
			isScam = false
		}: {
			gas?: string;
			to?: string;
			data?: string;
			acknowledgedRefusals?: EthWalletConnectRefusal[];
			isScam?: boolean;
		} = {}) => ({
			request: {
				id: 1,
				topic: 'mock-topic',
				params: {
					request: {
						method: 'eth_sendTransaction',
						params: [{ from: HOLDER, to, gas, data }]
					}
				},
				verifyContext: {
					verified: {
						verifyUrl: 'https://verify.walletconnect.org',
						validation: 'VALID',
						origin: 'https://dapp.example',
						isScam
					}
				}
			} as unknown as WalletKitTypes.SessionRequest,
			acknowledgedRefusals,
			listener: mockListener,
			address: HOLDER,
			amount: ZERO,
			fee: {
				maxFeePerGas: 1_000_000_000n,
				maxPriorityFeePerGas: 100_000_000n,
				gas: estimatedGas
			},
			modalNext: vi.fn(),
			progress: vi.fn(),
			token: ETHEREUM_TOKEN,
			identity: mockIdentity,
			minterInfo: undefined,
			sourceNetwork: ETHEREUM_NETWORK,
			targetNetwork: ETHEREUM_NETWORK
		});

		beforeEach(() => {
			vi.clearAllMocks();
			vi.mocked(executeSend).mockResolvedValue({ hash: '0xHASH' });
		});

		describe('a request the review refuses', () => {
			const encodeCall = ({ selector, value }: { selector: string; value: bigint }) =>
				`${selector}${AbiCoder.defaultAbiCoder().encode(['address', 'uint256'], [SPENDER, value]).slice(2)}`;

			const undecodableTransfer = `${ERC20_TRANSFER_HASH}deadbeef`;

			let spyToastsError: ReturnType<typeof vi.spyOn>;

			beforeEach(() => {
				spyToastsError = vi.spyOn(toastsStore, 'toastsError');

				erc20DefaultTokensStore.reset();
				erc20CustomTokensStore.resetAll();
				erc20DefaultTokensStore.add(USDC_TOKEN);
			});

			it('refuses an ERC-20 call on a token the wallet does not list, acknowledged or not', async () => {
				const { success } = await send(
					buildParams({
						data: encodeCall({ selector: ERC20_APPROVE_HASH, value: 1n }),
						acknowledgedRefusals: ['unverifiable_erc20']
					})
				);

				expect(success).toBeFalsy();
				expect(executeSend).not.toHaveBeenCalled();
				expect(spyToastsError).toHaveBeenCalledWith({
					msg: { text: en.wallet_connect.error.unlisted_token }
				});
			});

			it('signs an ERC-20 call on a listed token whose arguments decode', async () => {
				const { success } = await send(
					buildParams({
						to: USDC_TOKEN.address,
						data: encodeCall({ selector: ERC20_TRANSFER_HASH, value: 1n })
					})
				);

				expect(success).toBeTruthy();
				expect(trackWalletConnectUncheckedSigning).not.toHaveBeenCalled();
			});

			it('refuses calldata it cannot decode that was not acknowledged', async () => {
				const { success } = await send(
					buildParams({ to: USDC_TOKEN.address, data: undecodableTransfer })
				);

				expect(success).toBeFalsy();
				expect(executeSend).not.toHaveBeenCalled();
				expect(spyToastsError).toHaveBeenCalledWith({
					msg: { text: en.wallet_connect.error.unverifiable_request }
				});
			});

			it('signs calldata it cannot decode once that was acknowledged, and counts it', async () => {
				const { success } = await send(
					buildParams({
						to: USDC_TOKEN.address,
						data: undecodableTransfer,
						acknowledgedRefusals: ['unverifiable_erc20']
					})
				);

				expect(success).toBeTruthy();
				expect(executeSend).toHaveBeenCalledOnce();
				expect(trackWalletConnectUncheckedSigning).toHaveBeenCalledExactlyOnceWith({
					modifier: 'sign',
					network: 'ETH',
					reasons: ['unverifiable_erc20']
				});
			});

			it('refuses an operator grant it cannot decode unless that was acknowledged', async () => {
				const data = `${ERC_SET_APPROVAL_FOR_ALL_HASH}deadbeef`;

				const refused = await send(buildParams({ data }));

				expect(refused.success).toBeFalsy();

				const signed = await send(
					buildParams({ data, acknowledgedRefusals: ['unverifiable_approval_for_all'] })
				);

				expect(signed.success).toBeTruthy();
			});

			it('refuses a site the domain check flagged, acknowledged or not', async () => {
				const { success } = await send(
					buildParams({
						to: USDC_TOKEN.address,
						data: undecodableTransfer,
						acknowledgedRefusals: ['unverifiable_erc20'],
						isScam: true
					})
				);

				expect(success).toBeFalsy();
				expect(executeSend).not.toHaveBeenCalled();
			});
		});

		it('signs the gas limit the dApp requested', async () => {
			const { success } = await send(buildParams({ gas: '0x1e8480' }));

			expect(success).toBeTruthy();
			expect(vi.mocked(executeSend).mock.calls[0][0]).toMatchObject({ gas: 2_000_000n });
		});

		it('signs the gas OISY resolved when the request carries none', async () => {
			const { success } = await send(buildParams());

			expect(success).toBeTruthy();
			expect(vi.mocked(executeSend).mock.calls[0][0]).toMatchObject({ gas: estimatedGas });
		});

		it('signs the gas OISY resolved when the requested limit is not a usable quantity', async () => {
			const { success } = await send(buildParams({ gas: '0x' }));

			expect(success).toBeTruthy();
			expect(vi.mocked(executeSend).mock.calls[0][0]).toMatchObject({ gas: estimatedGas });
		});
	});
});
