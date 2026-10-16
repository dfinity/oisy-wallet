import { SEPOLIA_NETWORK } from '$env/networks/networks.eth.env';
import { SOLANA_DEVNET_NETWORK } from '$env/networks/networks.sol.env';
import { SESSION_REQUEST_PERSONAL_SIGN } from '$eth/constants/wallet-connect.constants';
import {
	OISY_EXTENSION_INTERNAL_ERROR_CODE,
	OISY_EXTENSION_USER_REJECTED_CODE,
	OISY_EXTENSION_WALLET_CONNECT_TOPIC
} from '$lib/constants/extension.constants';
import type { ExtensionSignRequest } from '$lib/types/extension';
import { toExtensionError, toWalletConnectSessionRequest } from '$lib/utils/extension.utils';
import {
	SESSION_REQUEST_SOL_SIGN_AND_SEND_TRANSACTION,
	SESSION_REQUEST_SOL_SIGN_MESSAGE,
	SESSION_REQUEST_SOL_SIGN_TRANSACTION
} from '$sol/constants/wallet-connect.constants';
import { getSdkError } from '@walletconnect/utils';

describe('extension.utils', () => {
	const origin = 'https://dapp.example';
	const solAddress = 'GJm4f3Hs1u6aJqd6dUXyvsdgGF8YLrjVvQ8L4jdTynsN';

	describe('toWalletConnectSessionRequest', () => {
		const ethRequest: ExtensionSignRequest = {
			id: 'request-1',
			kind: 'sign',
			chain: 'eth',
			origin,
			method: SESSION_REQUEST_PERSONAL_SIGN,
			params: ['0x68656c6c6f', '0x1234'],
			address: '0x1234'
		};

		const solRequest = ({
			method,
			params
		}: {
			method: string;
			params: Record<string, string>;
		}): ExtensionSignRequest => ({
			id: 'request-2',
			kind: 'sign',
			chain: 'sol',
			origin,
			method,
			params,
			address: solAddress
		});

		it('maps an Ethereum request onto Sepolia and keeps its method and params', () => {
			expect(toWalletConnectSessionRequest({ request: ethRequest, id: 7 })).toEqual({
				id: 7,
				topic: OISY_EXTENSION_WALLET_CONNECT_TOPIC,
				params: {
					chainId: `eip155:${SEPOLIA_NETWORK.chainId}`,
					request: { method: SESSION_REQUEST_PERSONAL_SIGN, params: ethRequest.params }
				},
				verifyContext: { verified: { origin, validation: 'UNKNOWN', verifyUrl: '' } }
			});
		});

		it('never presents the origin as verified', () => {
			const result = toWalletConnectSessionRequest({ request: ethRequest, id: 7 });

			expect(result?.verifyContext.verified.validation).toBe('UNKNOWN');
			expect(result?.verifyContext.verified.isScam).toBeUndefined();
		});

		it('maps a Solana message onto devnet with the connected address as pubkey', () => {
			const result = toWalletConnectSessionRequest({
				request: solRequest({ method: 'sol_signMessage', params: { message: '3yZe7d' } }),
				id: 8
			});

			expect(result?.params).toEqual({
				chainId: `solana:${SOLANA_DEVNET_NETWORK.chainId}`,
				request: {
					method: SESSION_REQUEST_SOL_SIGN_MESSAGE,
					params: { message: '3yZe7d', pubkey: solAddress }
				}
			});
		});

		it.each([
			{ method: 'sol_signTransaction', expected: SESSION_REQUEST_SOL_SIGN_TRANSACTION },
			{
				method: 'sol_signAndSendTransaction',
				expected: SESSION_REQUEST_SOL_SIGN_AND_SEND_TRANSACTION
			}
		])('maps $method to $expected with the transaction only', ({ method, expected }) => {
			const result = toWalletConnectSessionRequest({
				request: solRequest({ method, params: { transaction: 'AQID', message: 'ignored' } }),
				id: 9
			});

			expect(result?.params.request).toEqual({
				method: expected,
				params: { transaction: 'AQID' }
			});
		});

		it('returns undefined for a Solana method the review screens cannot handle', () => {
			expect(
				toWalletConnectSessionRequest({
					request: solRequest({ method: 'sol_signAllTransactions', params: {} }),
					id: 10
				})
			).toBeUndefined();
		});
	});

	describe('toExtensionError', () => {
		it('turns a user rejection into EIP-1193 code 4001', () => {
			const rejected = getSdkError('USER_REJECTED');

			expect(toExtensionError(rejected)).toEqual({
				code: OISY_EXTENSION_USER_REJECTED_CODE,
				message: rejected.message
			});
		});

		it('turns any other error into an internal error and keeps its message', () => {
			expect(toExtensionError({ code: 20001, message: 'Unexpected error.' })).toEqual({
				code: OISY_EXTENSION_INTERNAL_ERROR_CODE,
				message: 'Unexpected error.'
			});
		});
	});
});
