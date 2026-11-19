import { BASE_NETWORK } from '$env/networks/networks-evm/networks.evm.base.env';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { USDT_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdt.env';
import { EURC_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens-erc20/tokens.eurc.env';
import { USDC_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens-erc20/tokens.usdc.env';
import { BASE_ETH_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens.eth.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { CKETH_ABI } from '$eth/constants/cketh.constants';
import { ERC_SET_APPROVAL_FOR_ALL_HASH } from '$eth/constants/erc.constants';
import {
	ERC20_APPROVE_HASH,
	ERC20_DECREASE_ALLOWANCE_HASH,
	ERC20_INCREASE_ALLOWANCE_HASH,
	ERC20_TRANSFER_HASH
} from '$eth/constants/erc20.constants';
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
import { EthNonceReadError, EthSubmissionUnconfirmedError } from '$eth/types/send';
import type {
	EthWalletConnectRefusal,
	WalletConnectEthSignTypedDataV4
} from '$eth/types/wallet-connect';
import { signMessage as signMessageApi, signPrehash } from '$lib/api/signer.api';
import { ZERO } from '$lib/constants/app.constants';
import { UNEXPECTED_ERROR } from '$lib/constants/wallet-connect.constants';
import { trackWalletConnectUncheckedSigning } from '$lib/services/wallet-connect-analytics.services';
import { authStore } from '$lib/stores/auth.store';
import { i18n } from '$lib/stores/i18n.store';
import * as toastsStore from '$lib/stores/toasts.store';
import type { WalletConnectListener } from '$lib/types/wallet-connect';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import {
	encodeCkDepositErc20,
	encodeCkDepositEth,
	mockCkDepositHelperContractAddress,
	mockCkDepositSubaccount
} from '$tests/mocks/ck-deposit.mock';
import { mockCkMinterInfo } from '$tests/mocks/ck-minter.mock';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity, mockPrincipal } from '$tests/mocks/identity.mock';
import {
	encodeUniswapEurcToUsdc,
	mockUniswapRouter,
	mockUniswapWallet
} from '$tests/mocks/uniswap.mock';
import { toNullable } from '@dfinity/utils';
import { encodePrincipalToEthAddress } from '@icp-sdk/canisters/cketh';
import { Principal } from '@icp-sdk/core/principal';
import type { WalletKitTypes } from '@reown/walletkit';
import { AbiCoder, Interface } from 'ethers/abi';
import { SigningKey } from 'ethers/crypto';
import { Transaction } from 'ethers/transaction';
import { get } from 'svelte/store';

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

// The signer canister returns r ‖ s followed by the bare y-parity, 0 or 1.
const SIGNATURE_R_S = `${'11'.repeat(32)}${'22'.repeat(32)}`;
const signerSignature = (parity: 0 | 1): string => `0x${SIGNATURE_R_S}0${parity}`;
// The same signature with `v` as 27 (0x1b) or 28 (0x1c), the form a dApp verifies on-chain.
const dappSignature = (v: 27 | 28): string => `0x${SIGNATURE_R_S}${v.toString(16)}`;

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
			progress: vi.fn(),
			unreviewableTypedDataAcknowledged: false
		});

		beforeEach(() => {
			vi.clearAllMocks();
			authStore.setForTesting(mockIdentity);
			vi.mocked(signPrehash).mockResolvedValue(signerSignature(0));
			vi.mocked(signMessageApi).mockResolvedValue(signerSignature(1));
		});

		describe('typed data OISY cannot describe', () => {
			// A struct no summary schema matches, on the session's chain, that would sign.
			const orderRequest = () =>
				buildRequest({
					method: SESSION_REQUEST_ETH_SIGN_V4,
					params: [
						HOLDER,
						JSON.stringify({
							domain: { name: 'Marketplace', chainId: '1', verifyingContract: DAI },
							types: {
								EIP712Domain: [
									{ name: 'name', type: 'string' },
									{ name: 'chainId', type: 'uint256' },
									{ name: 'verifyingContract', type: 'address' }
								],
								Order: [
									{ name: 'offerer', type: 'address' },
									{ name: 'price', type: 'uint256' }
								]
							},
							primaryType: 'Order',
							message: { offerer: HOLDER, price: '1' }
						})
					]
				});

			it('refuses it when the review did not confirm it', async () => {
				const spyToastsError = vi.spyOn(toastsStore, 'toastsError');

				const { success } = await signMessage(buildParams(orderRequest()));

				expect(success).toBeFalsy();
				expect(signPrehash).not.toHaveBeenCalled();
				expect(spyToastsError).toHaveBeenCalledWith({
					msg: { text: get(i18n).wallet_connect.error.unexplained_request_unconfirmed }
				});
				expect(mockListener.rejectRequest).toHaveBeenCalledExactlyOnceWith({
					topic: 'mock-topic',
					id: 1,
					error: UNEXPECTED_ERROR
				});
			});

			it('signs it once the review confirmed it', async () => {
				const result = await signMessage({
					...buildParams(orderRequest()),
					unreviewableTypedDataAcknowledged: true
				});

				expect(result).toStrictEqual({ success: true });
				expect(signPrehash).toHaveBeenCalledOnce();
			});
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
				message: dappSignature(27)
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
				message: dappSignature(28)
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
					message: dappSignature(28)
				});
			}
		);

		it.each([
			{ method: SESSION_REQUEST_ETH_SIGN_V4, parity: 0, v: 27 },
			{ method: SESSION_REQUEST_ETH_SIGN_V4, parity: 1, v: 28 },
			{ method: SESSION_REQUEST_PERSONAL_SIGN, parity: 0, v: 27 },
			{ method: SESSION_REQUEST_PERSONAL_SIGN, parity: 1, v: 28 }
		] as const)(
			'returns the $method signature with signer parity $parity to the dApp with v $v',
			async ({ method, parity, v }) => {
				// A contract verifying the signature on-chain (e.g. an ERC-2612 `permit`) accepts
				// `v` only as 27 or 28, so the bare parity the signer appends is re-encoded.
				vi.mocked(signPrehash).mockResolvedValue(signerSignature(parity));
				vi.mocked(signMessageApi).mockResolvedValue(signerSignature(parity));

				const request = buildRequest({
					method,
					params:
						method === SESSION_REQUEST_ETH_SIGN_V4
							? [HOLDER, daiPermitJson(true)]
							: ['0x48656c6c6f', HOLDER]
				});

				const result = await signMessage(buildParams(request));

				expect(result).toStrictEqual({ success: true });
				expect(mockListener.approveRequest).toHaveBeenCalledExactlyOnceWith({
					id: request.id,
					topic: request.topic,
					message: dappSignature(v)
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
			amount = ZERO,
			acknowledgedRefusals = [],
			isScam = false
		}: {
			gas?: string;
			to?: string;
			data?: string;
			amount?: bigint;
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
			amount,
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
			targetNetwork: ETHEREUM_NETWORK,
			unknownCallAcknowledged: false,
			tokens: []
		});

		beforeEach(() => {
			vi.clearAllMocks();
			vi.mocked(executeSend).mockResolvedValue({ hash: '0xHASH', nonce: 1 });
		});

		// The review describes this swap, so it asks for no confirmation, and signing reads the call
		// with the same tokens and so does not take it for one OISY cannot read.
		it('signs a Uniswap swap the review describes without the confirmation', async () => {
			const data = encodeUniswapEurcToUsdc();
			const params = buildParams();

			const { success } = await send({
				...params,
				request: {
					...params.request,
					params: {
						request: {
							method: 'eth_sendTransaction',
							params: [{ from: mockUniswapWallet, to: mockUniswapRouter, data }]
						}
					}
				} as unknown as WalletKitTypes.SessionRequest,
				address: mockUniswapWallet,
				token: BASE_ETH_TOKEN,
				sourceNetwork: BASE_NETWORK,
				targetNetwork: BASE_NETWORK,
				tokens: [EURC_TOKEN, USDC_TOKEN]
			});

			expect(success).toBeTruthy();
			expect(vi.mocked(executeSend).mock.calls[0][0]).toMatchObject({
				to: mockUniswapRouter,
				data
			});
		});

		describe('a call OISY cannot read', () => {
			const data = '0xdeadbeef';

			it('refuses it when the review did not confirm it', async () => {
				const spyToastsError = vi.spyOn(toastsStore, 'toastsError');

				const { success } = await send(buildParams({ data }));

				expect(success).toBeFalsy();
				expect(executeSend).not.toHaveBeenCalled();
				expect(spyToastsError).toHaveBeenCalledWith({
					msg: { text: get(i18n).wallet_connect.error.unexplained_request_unconfirmed }
				});
				expect(mockListener.rejectRequest).toHaveBeenCalledExactlyOnceWith({
					topic: 'mock-topic',
					id: 1,
					error: UNEXPECTED_ERROR
				});
			});

			it('signs it once the review confirmed it', async () => {
				const { success } = await send({ ...buildParams({ data }), unknownCallAcknowledged: true });

				expect(success).toBeTruthy();
				expect(vi.mocked(executeSend).mock.calls[0][0]).toMatchObject({ data });
			});
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

			// Only the review sees a token OISY does not list whose contract did not report its decimals
			// (D7): signing finds nothing to refuse, and counts what the user acknowledged there.
			it('signs a token call the review could not identify once that was acknowledged, and counts it', async () => {
				const { success } = await send(
					buildParams({
						data: encodeCall({ selector: ERC20_APPROVE_HASH, value: 1n }),
						acknowledgedRefusals: ['unverifiable_erc20']
					})
				);

				expect(success).toBeTruthy();
				expect(trackWalletConnectUncheckedSigning).toHaveBeenCalledExactlyOnceWith({
					modifier: 'sign',
					network: 'ETH',
					reasons: ['unverifiable_erc20']
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

		describe('a broadcast the node refuses', () => {
			const transaction = Transaction.from({
				type: 2,
				chainId: 42161n,
				nonce: 10,
				maxPriorityFeePerGas: ZERO,
				maxFeePerGas: 20_000_000n,
				gasLimit: 21_000n,
				to: SPENDER,
				value: ZERO,
				data: '0xa9059cbb'
			});

			transaction.signature = new SigningKey(
				'0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
			).sign(transaction.unsignedHash);

			const signedTransaction = transaction.serialized;

			// As ethers hands it over: the node's answer under `error`, and the request, the signed
			// transaction inside, under `payload` and in the message.
			const err = Object.assign(
				new Error(`could not coalesce error (… "params": [ "${signedTransaction}" ] …)`),
				{
					code: 'UNKNOWN_ERROR',
					error: {
						code: -32000,
						message: 'intrinsic gas too low: gas 21000, minimum needed 29604'
					},
					payload: {
						id: 9,
						jsonrpc: '2.0',
						method: 'eth_sendRawTransaction',
						params: [signedTransaction]
					}
				}
			);

			beforeEach(() => {
				vi.mocked(executeSend).mockRejectedValue(err);
			});

			// The call carries a selector without its arguments, which signing refuses unless the user
			// acknowledged it on the review, so it is acknowledged here to reach the broadcast.
			const params = () =>
				buildParams({ data: '0xa9059cbb', acknowledgedRefusals: ['unverifiable_erc20'] });

			it('shows the node message, the hash and the unsigned transaction, never the signed one', async () => {
				const spyToastsError = vi.spyOn(toastsStore, 'toastsError');
				const spyToastsErrorNoTrace = vi.spyOn(toastsStore, 'toastsErrorNoTrace');

				const result = await send(params());

				expect(result).toStrictEqual({ success: false, err });

				expect(spyToastsErrorNoTrace).toHaveBeenCalledExactlyOnceWith({
					msg: {
						text: [
							`${get(i18n).wallet_connect.error.unexpected_processing_request} / intrinsic gas too low: gas 21000, minimum needed 29604`,
							`Transaction hash: ${transaction.hash}`,
							`Unsigned transaction: ${transaction.unsignedSerialized}`
						].join('<br>'),
						renderAsHtml: true
					},
					err
				});

				expect(spyToastsError).not.toHaveBeenCalled();
			});

			it('rejects the request of the dApp', async () => {
				await send(params());

				expect(mockListener.rejectRequest).toHaveBeenCalledExactlyOnceWith({
					topic: 'mock-topic',
					id: 1,
					error: UNEXPECTED_ERROR
				});
				expect(mockListener.approveRequest).not.toHaveBeenCalled();
			});
		});

		describe('a token call that sends native value along with it', () => {
			// Arguments that decode, so that only the native value decides: signing also refuses a token
			// call whose arguments do not decode, or on a token the wallet does not list.
			const args = AbiCoder.defaultAbiCoder()
				.encode(['address', 'uint256'], [SPENDER, 1n])
				.slice(2);

			beforeEach(() => {
				erc20DefaultTokensStore.reset();
				erc20CustomTokensStore.resetAll();
				erc20DefaultTokensStore.add(USDC_TOKEN);
			});

			const tokenCalls = [
				ERC20_TRANSFER_HASH,
				ERC20_APPROVE_HASH,
				ERC20_INCREASE_ALLOWANCE_HASH,
				ERC20_DECREASE_ALLOWANCE_HASH
			];

			it.each(tokenCalls)('refuses selector %s and never signs', async (selector) => {
				const spyToastsError = vi.spyOn(toastsStore, 'toastsError');

				const params = buildParams({
					data: `${selector}${args}`,
					amount: 5_000_000_000_000_000_000n
				});

				const { success } = await send(params);

				expect(success).toBeFalsy();
				expect(executeSend).not.toHaveBeenCalled();
				expect(params.modalNext).not.toHaveBeenCalled();
				expect(spyToastsError).toHaveBeenCalledExactlyOnceWith({
					msg: {
						text: replacePlaceholders(get(i18n).wallet_connect.error.token_call_with_value, {
							$amount: `5 ${ETHEREUM_TOKEN.symbol}`
						})
					}
				});
			});

			it.each(tokenCalls)('signs selector %s carrying no native value', async (selector) => {
				const { success } = await send(
					buildParams({ to: USDC_TOKEN.address, data: `${selector}${args}` })
				);

				expect(success).toBeTruthy();
				expect(executeSend).toHaveBeenCalledOnce();
			});
		});

		describe('ckETH helper contract', () => {
			// The ckETH helper contract on Ethereum mainnet, as the minter returns it.
			const CKETH_HELPER = '0x7574eB42cA208A4f6960ECCAfDF186D627dCC175';

			const minterInfo = {
				data: { ...mockCkMinterInfo, eth_helper_contract_address: toNullable(CKETH_HELPER) },
				certified: true
			};

			const encodeDeposit = (principal: Principal): string =>
				new Interface(CKETH_ABI).encodeFunctionData('deposit', [
					encodePrincipalToEthAddress(principal)
				]);

			const buildDepositParams = ({ to, data }: { to: string; data: string }) => {
				const params = buildParams();

				return {
					...params,
					request: {
						...params.request,
						params: {
							request: {
								method: 'eth_sendTransaction',
								params: [{ from: HOLDER, to, data }]
							}
						}
					} as unknown as WalletKitTypes.SessionRequest,
					amount: 1_000_000_000_000_000n,
					minterInfo,
					targetNetwork: ICP_NETWORK
				};
			};

			it('should sign a deposit to the principal of the user as the app sent it', async () => {
				const data = encodeDeposit(mockPrincipal);

				const { success } = await send(buildDepositParams({ to: CKETH_HELPER, data }));

				expect(success).toBeTruthy();
				expect(vi.mocked(executeSend).mock.calls[0][0]).toMatchObject({
					to: CKETH_HELPER,
					data,
					targetNetwork: ICP_NETWORK
				});
			});

			it.each([
				CKETH_HELPER,
				CKETH_HELPER.toLowerCase(),
				`0x${CKETH_HELPER.slice(2).toUpperCase()}`
			])(
				'should refuse a deposit to another principal sent to %s, and never sign it',
				async (to) => {
					const spyToastsError = vi.spyOn(toastsStore, 'toastsError');

					const { success } = await send(
						buildDepositParams({
							to,
							data: encodeDeposit(Principal.fromText('ryjl3-tyaaa-aaaaa-aaaba-cai'))
						})
					);

					expect(success).toBeFalsy();
					expect(executeSend).not.toHaveBeenCalled();
					expect(mockListener.approveRequest).not.toHaveBeenCalled();
					expect(spyToastsError).toHaveBeenCalledExactlyOnceWith({
						msg: { text: get(i18n).wallet_connect.error.cketh_deposit_refused }
					});
				}
			);

			it('should refuse calldata to the helper that is not a deposit, and never sign it', async () => {
				const { success } = await send(
					buildDepositParams({ to: CKETH_HELPER, data: `${encodeDeposit(mockPrincipal)}00` })
				);

				expect(success).toBeFalsy();
				expect(executeSend).not.toHaveBeenCalled();
			});

			describe('while the helper contract is not confirmed', () => {
				const unconfirmed = [
					{ state: 'not loaded', info: undefined },
					{ state: 'not loadable', info: null },
					{ state: 'not certified', info: { ...minterInfo, certified: false } }
				];

				const owners = [
					{ owner: 'the user', principal: mockPrincipal },
					{
						owner: 'another principal',
						principal: Principal.fromText('ryjl3-tyaaa-aaaaa-aaaba-cai')
					}
				];

				// Without a confirmed helper the modal does not route the request to the Internet Computer,
				// so it reaches here as a contract call on Ethereum. The check is what stops it.
				it.each(unconfirmed.flatMap((state) => owners.map((owner) => ({ ...state, ...owner }))))(
					'should hold a deposit to $owner while the minter information is $state, and never sign it',
					async ({ info, principal }) => {
						const spyToastsError = vi.spyOn(toastsStore, 'toastsError');

						const { success } = await send({
							...buildDepositParams({ to: CKETH_HELPER, data: encodeDeposit(principal) }),
							minterInfo: info,
							targetNetwork: ETHEREUM_NETWORK
						});

						expect(success).toBeFalsy();
						expect(executeSend).not.toHaveBeenCalled();
						expect(mockListener.approveRequest).not.toHaveBeenCalled();
						expect(spyToastsError).toHaveBeenCalledExactlyOnceWith({
							msg: { text: get(i18n).wallet_connect.error.cketh_helper_unconfirmed }
						});
					}
				);
			});

			// Only Ethereum and Sepolia have a ckETH helper contract. Elsewhere the address the minter
			// states is not one, so the request is the contract call it is there and not a conversion.
			it('should not check a deposit on an EVM network without ckETH', async () => {
				const data = encodeDeposit(Principal.fromText('ryjl3-tyaaa-aaaaa-aaaba-cai'));

				// Read as a call OISY cannot read there, which the review asks the user to confirm.
				const { success } = await send({
					...buildDepositParams({ to: CKETH_HELPER, data }),
					token: BASE_ETH_TOKEN,
					sourceNetwork: BASE_NETWORK,
					targetNetwork: BASE_NETWORK,
					unknownCallAcknowledged: true
				});

				expect(success).toBeTruthy();
				expect(vi.mocked(executeSend).mock.calls[0][0]).toMatchObject({
					to: CKETH_HELPER,
					data,
					sourceNetwork: BASE_NETWORK
				});
			});
		});

		describe('the ckETH minter helper that deposits to a subaccount', () => {
			const HELPER = mockCkDepositHelperContractAddress;

			const minterInfo = {
				data: {
					...mockCkMinterInfo,
					deposit_with_subaccount_helper_contract_address: toNullable(HELPER),
					supported_ckerc20_tokens: toNullable([
						{
							erc20_contract_address: USDT_TOKEN.address,
							ledger_canister_id: Principal.fromText('cngnf-vqaaa-aaaar-qag4q-cai'),
							ckerc20_token_symbol: 'ckUSDT'
						}
					])
				},
				certified: true
			};

			const buildDepositParams = (data: string) => {
				const params = buildParams();

				return {
					...params,
					request: {
						...params.request,
						params: {
							...params.request.params,
							chainId: 'eip155:1',
							request: {
								method: 'eth_sendTransaction',
								params: [{ from: HOLDER, to: HELPER, data }]
							}
						}
					},
					minterInfo,
					targetNetwork: ICP_NETWORK,
					tokens: [USDT_TOKEN]
				};
			};

			// A deposit to an account that is not the user's is reviewed with a warning, not refused.
			it('should sign a deposit to any account as the app sent it, without a confirmation', async () => {
				const data = encodeCkDepositErc20({
					address: USDT_TOKEN.address,
					amount: 50_000_000n,
					owner: Principal.fromText('hnnn4-iyaaa-aaaar-qb4bq-cai'),
					subaccount: mockCkDepositSubaccount
				});

				const { success } = await send(buildDepositParams(data));

				expect(success).toBeTruthy();
				expect(vi.mocked(executeSend).mock.calls[0][0]).toMatchObject({
					to: HELPER,
					data,
					targetNetwork: ICP_NETWORK
				});
			});

			it('should refuse a deposit of a token the minter does not convert, and never sign it', async () => {
				const spyToastsError = vi.spyOn(toastsStore, 'toastsError');

				const { success } = await send(
					buildDepositParams(
						encodeCkDepositErc20({ address: SPENDER, amount: 50_000_000n, owner: mockPrincipal })
					)
				);

				expect(success).toBeFalsy();
				expect(executeSend).not.toHaveBeenCalled();
				expect(mockListener.approveRequest).not.toHaveBeenCalled();
				expect(spyToastsError).toHaveBeenCalledExactlyOnceWith({
					msg: { text: get(i18n).wallet_connect.error.ck_deposit_refused }
				});
			});

			it('should hold a deposit while the helper contract is not confirmed, and never sign it', async () => {
				const spyToastsError = vi.spyOn(toastsStore, 'toastsError');

				const { success } = await send({
					...buildDepositParams(encodeCkDepositEth({ owner: mockPrincipal })),
					minterInfo: undefined,
					targetNetwork: ETHEREUM_NETWORK
				});

				expect(success).toBeFalsy();
				expect(executeSend).not.toHaveBeenCalled();
				expect(spyToastsError).toHaveBeenCalledExactlyOnceWith({
					msg: { text: get(i18n).wallet_connect.error.cketh_helper_unconfirmed }
				});
			});
		});

		describe('when the send fails', () => {
			beforeEach(() => {
				vi.spyOn(toastsStore, 'toastsError').mockImplementation(() => Symbol('toast'));
				vi.spyOn(toastsStore, 'toastsErrorNoTrace').mockImplementation(() => Symbol('toast'));
			});

			it('rejects the request and says whether the transaction may have reached the network', async () => {
				const err = new EthSubmissionUnconfirmedError(new Error('Internal error'));
				vi.mocked(executeSend).mockRejectedValueOnce(err);

				await expect(send(buildParams())).resolves.toEqual({ success: false, err });

				expect(mockListener.rejectRequest).toHaveBeenCalledExactlyOnceWith({
					topic: 'mock-topic',
					id: 1,
					error: UNEXPECTED_ERROR
				});
				expect(toastsStore.toastsErrorNoTrace).toHaveBeenCalledExactlyOnceWith({
					msg: { text: en.send.error.ethereum_transaction_unconfirmed },
					err
				});
				expect(toastsStore.toastsError).not.toHaveBeenCalled();
			});

			it('says the transaction was not sent when its nonce could not be read', async () => {
				const err = new EthNonceReadError(new Error('Internal error'));
				vi.mocked(executeSend).mockRejectedValueOnce(err);

				await send(buildParams());

				expect(toastsStore.toastsErrorNoTrace).toHaveBeenCalledExactlyOnceWith({
					msg: { text: en.send.error.ethereum_transaction_not_sent },
					err
				});
			});

			it('explains a balance that cannot pay for the transaction as the send flow does', async () => {
				const err = Object.assign(new Error('insufficient funds'), { code: 'INSUFFICIENT_FUNDS' });
				vi.mocked(executeSend).mockRejectedValueOnce(err);

				await send(buildParams());

				expect(toastsStore.toastsErrorNoTrace).toHaveBeenCalledExactlyOnceWith({
					msg: { text: en.send.error.ethereum_insufficient_funds },
					err
				});
			});

			it('keeps the generic WalletConnect message for an error it cannot explain', async () => {
				const err = new Error('Mock error');
				vi.mocked(executeSend).mockRejectedValueOnce(err);

				await expect(send(buildParams())).resolves.toEqual({ success: false, err });

				expect(toastsStore.toastsError).toHaveBeenCalledExactlyOnceWith({
					msg: { text: en.wallet_connect.error.unexpected_processing_request },
					err
				});
				expect(toastsStore.toastsErrorNoTrace).not.toHaveBeenCalled();
			});
		});
	});
});
