import { ETHEREUM_NETWORK, SEPOLIA_NETWORK } from '$env/networks/networks.eth.env';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { SOLANA_DEVNET_NETWORK } from '$env/networks/networks.sol.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SESSION_REQUEST_PERSONAL_SIGN } from '$eth/constants/wallet-connect.constants';
import {
	OISY_EXTENSION_INTERNAL_ERROR_CODE,
	OISY_EXTENSION_USER_REJECTED_CODE,
	OISY_EXTENSION_WALLET_CONNECT_TOPIC
} from '$lib/constants/extension.constants';
import type { ExtensionSignRequest } from '$lib/types/extension';
import type { TokenUi } from '$lib/types/token-ui';
import type { TokenUiGroup } from '$lib/types/token-ui-group';
import {
	compareExtensionVersions,
	extensionVersionStatus,
	toExtensionError,
	toExtensionPanelSnapshotCardData,
	toExtensionPanelSnapshotRow,
	toWalletConnectSessionRequest
} from '$lib/utils/extension.utils';
import { parseTokenGroupId } from '$lib/validation/token-group.validation';
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

	describe('compareExtensionVersions', () => {
		it.each([
			{ a: '1.2.0', b: '1.10.0', expected: -1 },
			{ a: '2.0', b: '1.9.9.9', expected: 1 },
			{ a: '1.4', b: '1.4.0.0', expected: 0 }
		])('compares $a with $b numerically, part by part', ({ a, b, expected }) => {
			expect(Math.sign(compareExtensionVersions({ a, b }) ?? Number.NaN)).toBe(expected);
		});

		it.each(['', '1..2', '1.2.3.4.5', 'v1.2', '1.2-beta'])(
			'returns undefined for the malformed version "%s"',
			(version) => {
				expect(compareExtensionVersions({ a: version, b: '1.0' })).toBeUndefined();
			}
		);
	});

	describe('extensionVersionStatus', () => {
		const minimum = '1.2.0';

		it('accepts the minimum version and anything newer', () => {
			expect(extensionVersionStatus({ version: '1.2.0', minimum })).toBe('supported');
			expect(extensionVersionStatus({ version: '1.3', minimum })).toBe('supported');
		});

		it('treats an older version as outdated', () => {
			expect(extensionVersionStatus({ version: '1.1.9', minimum })).toBe('outdated');
		});

		it('treats an extension that reports no version as outdated', () => {
			expect(extensionVersionStatus({ version: undefined, minimum })).toBe('outdated');
		});

		it('blocks a pulled release even when it is new enough', () => {
			expect(extensionVersionStatus({ version: '1.4.0', minimum, blocked: ['1.4.0'] })).toBe(
				'blocked'
			);
		});

		it('blocks a version it cannot read', () => {
			expect(extensionVersionStatus({ version: 'latest', minimum })).toBe('blocked');
		});
	});

	describe('panel snapshot', () => {
		const eth: TokenUi = { ...ETHEREUM_TOKEN, balance: 2n, usdBalance: 4, usdPrice: 2 };
		const icp: TokenUi = { ...ICP_TOKEN, balance: 3n, usdBalance: 6 };
		const groupId = parseTokenGroupId('mixed');
		const group: TokenUiGroup = {
			id: groupId,
			decimals: 8,
			groupData: { id: groupId, symbol: 'MIX', name: 'Mixed' },
			tokens: [eth, icp],
			balance: 5n,
			usdBalance: 10
		};

		it('keeps what a token row shows, with its network by id', () => {
			expect(toExtensionPanelSnapshotRow({ token: eth })).toEqual(
				expect.objectContaining({
					name: eth.name,
					symbol: eth.symbol,
					decimals: eth.decimals,
					balance: 2n,
					usdBalance: 4,
					usdPrice: 2,
					networkId: ETHEREUM_NETWORK.id.description
				})
			);
		});

		it("keeps a group's header and its networks by id", () => {
			expect(toExtensionPanelSnapshotRow({ group })).toEqual(
				expect.objectContaining({
					name: 'Mixed',
					symbol: 'MIX',
					balance: 5n,
					usdBalance: 10,
					groupNetworkIds: [ETHEREUM_NETWORK.id.description, ICP_NETWORK.id.description]
				})
			);
		});

		it('restores the networks for the token card', () => {
			const tokenCard = toExtensionPanelSnapshotCardData(
				toExtensionPanelSnapshotRow({ token: eth })
			);
			const groupCard = toExtensionPanelSnapshotCardData(toExtensionPanelSnapshotRow({ group }));

			expect(tokenCard.network).toBe(ETHEREUM_NETWORK);
			expect(groupCard.tokenCount).toBe(2);
			expect(groupCard.networks).toEqual([ETHEREUM_NETWORK, ICP_NETWORK]);
		});

		it('survives being stored', () => {
			const row = toExtensionPanelSnapshotRow({ token: eth });

			expect(structuredClone(row)).toEqual(row);
		});
	});
});
