import { ETHEREUM_NETWORK, SEPOLIA_NETWORK } from '$env/networks/networks.eth.env';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { SOLANA_DEVNET_NETWORK } from '$env/networks/networks.sol.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SESSION_REQUEST_PERSONAL_SIGN } from '$eth/constants/wallet-connect.constants';
import { ZERO } from '$lib/constants/app.constants';
import {
	OISY_EXTENSION_INTERNAL_ERROR_CODE,
	OISY_EXTENSION_USER_REJECTED_CODE,
	OISY_EXTENSION_WALLET_CONNECT_TOPIC
} from '$lib/constants/extension.constants';
import { Currency } from '$lib/enums/currency';
import type { ExtensionSignRequest } from '$lib/types/extension';
import type { TokenUi } from '$lib/types/token-ui';
import type { TokenUiGroup } from '$lib/types/token-ui-group';
import {
	compareExtensionVersions,
	extensionPanelSnapshotHasLivePrices,
	extensionPanelSnapshotUsdTotal,
	extensionVersionStatus,
	findExtensionPriceKey,
	toExtensionError,
	toExtensionPanelSnapshotCardData,
	toExtensionPanelSnapshotHolding,
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
		// 1 ETH at $2,000 and 3 ICP at $5 when saved.
		const eth: TokenUi = {
			...ETHEREUM_TOKEN,
			balance: 1_000_000_000_000_000_000n,
			usdBalance: 2000,
			usdPrice: 2000
		};
		const icp: TokenUi = { ...ICP_TOKEN, balance: 300_000_000n, usdBalance: 15, usdPrice: 5 };
		const groupId = parseTokenGroupId('mixed');
		const group: TokenUiGroup = {
			id: groupId,
			decimals: 8,
			groupData: { id: groupId, symbol: 'MIX', name: 'Mixed' },
			tokens: [eth, icp],
			balance: 5n,
			usdBalance: 2015
		};

		const keys: Record<string, string> = {
			[`${eth.id.description}`]: 'ethereum',
			[`${icp.id.description}`]: 'internet-computer'
		};
		const priceKeyOf = ({ id }: TokenUi) => keys[`${id.description}`];

		const livePrices = {
			ethereum: { usd: 3000, usd_24h_change: 4.2 },
			'internet-computer': { usd: 10, usd_24h_change: -1 }
		};

		describe('findExtensionPriceKey', () => {
			const ethPrice = { usd: 2000, usd_market_cap: 1, usd_24h_change: 2 };
			const prices = { bitcoin: { usd: 60000 }, ethereum: ethPrice };

			it('finds the entry a price came from', () => {
				expect(findExtensionPriceKey({ price: ethPrice, prices })).toBe('ethereum');
			});

			it('finds it by value once OISY has kept an older copy', () => {
				expect(findExtensionPriceKey({ price: { ...ethPrice }, prices })).toBe('ethereum');
			});

			it('finds nothing for a token without a price', () => {
				expect(findExtensionPriceKey({ price: undefined, prices })).toBeUndefined();
				expect(findExtensionPriceKey({ price: { usd: 1 }, prices })).toBeUndefined();
			});
		});

		it('keeps a held token with its amount and price lookup, and skips an empty one', () => {
			expect(toExtensionPanelSnapshotHolding({ token: eth, priceKey: 'ethereum' })).toEqual({
				priceKey: 'ethereum',
				balance: eth.balance,
				decimals: eth.decimals,
				usdBalance: 2000
			});
			expect(
				toExtensionPanelSnapshotHolding({ token: { ...eth, balance: ZERO }, priceKey: 'ethereum' })
			).toBeUndefined();
		});

		it('keeps what a token row shows, with its network by id and its holding', () => {
			expect(toExtensionPanelSnapshotRow({ tokenOrGroup: { token: eth }, priceKeyOf })).toEqual(
				expect.objectContaining({
					name: eth.name,
					symbol: eth.symbol,
					balance: eth.balance,
					usdBalance: 2000,
					networkId: ETHEREUM_NETWORK.id.description,
					holdings: [expect.objectContaining({ priceKey: 'ethereum' })]
				})
			);
		});

		it("keeps a group's header, its networks by id and each token's holding", () => {
			expect(toExtensionPanelSnapshotRow({ tokenOrGroup: { group }, priceKeyOf })).toEqual(
				expect.objectContaining({
					name: 'Mixed',
					symbol: 'MIX',
					usdBalance: 2015,
					groupNetworkIds: [ETHEREUM_NETWORK.id.description, ICP_NETWORK.id.description],
					holdings: [
						expect.objectContaining({ priceKey: 'ethereum' }),
						expect.objectContaining({ priceKey: 'internet-computer' })
					]
				})
			);
		});

		it('restores the networks for the token card', () => {
			const tokenCard = toExtensionPanelSnapshotCardData({
				row: toExtensionPanelSnapshotRow({ tokenOrGroup: { token: eth }, priceKeyOf }),
				prices: undefined
			});
			const groupCard = toExtensionPanelSnapshotCardData({
				row: toExtensionPanelSnapshotRow({ tokenOrGroup: { group }, priceKeyOf }),
				prices: undefined
			});

			expect(tokenCard.network).toBe(ETHEREUM_NETWORK);
			expect(groupCard.tokenCount).toBe(2);
			expect(groupCard.networks).toEqual([ETHEREUM_NETWORK, ICP_NETWORK]);
		});

		it('keeps the saved price and value without live prices', () => {
			const card = toExtensionPanelSnapshotCardData({
				row: toExtensionPanelSnapshotRow({ tokenOrGroup: { token: eth }, priceKeyOf }),
				prices: {}
			});

			expect(card.usdPrice).toBe(2000);
			expect(card.usdBalance).toBe(2000);
		});

		it('values a row at live prices', () => {
			const tokenCard = toExtensionPanelSnapshotCardData({
				row: toExtensionPanelSnapshotRow({ tokenOrGroup: { token: eth }, priceKeyOf }),
				prices: livePrices
			});
			const groupCard = toExtensionPanelSnapshotCardData({
				row: toExtensionPanelSnapshotRow({ tokenOrGroup: { group }, priceKeyOf }),
				prices: livePrices
			});

			expect(tokenCard).toEqual(
				expect.objectContaining({
					usdPrice: 3000,
					usdPriceChangePercentage24h: 4.2,
					usdBalance: 3000
				})
			);
			expect(groupCard.usdBalance).toBe(3030);
		});

		describe('total', () => {
			const snapshot = {
				savedAt: 0,
				usdTotal: 2065,
				currency: Currency.USD,
				exchangeRateToUsd: 1,
				rows: [],
				holdings: [
					{ priceKey: 'ethereum', balance: eth.balance as bigint, decimals: 18, usdBalance: 2000 },
					{ priceKey: undefined, balance: 7n, decimals: 0, usdBalance: 15 }
				],
				providersUsd: 50
			};

			it('is the saved total without live prices', () => {
				expect(extensionPanelSnapshotUsdTotal({ snapshot, prices: {} })).toBe(2065);
				expect(extensionPanelSnapshotHasLivePrices({ snapshot, prices: {} })).toBeFalsy();
			});

			it('values held tokens at live prices and keeps the rest as saved', () => {
				expect(extensionPanelSnapshotUsdTotal({ snapshot, prices: livePrices })).toBe(3065);
				expect(extensionPanelSnapshotHasLivePrices({ snapshot, prices: livePrices })).toBeTruthy();
			});

			it('falls back to the saved total for a snapshot without holdings', () => {
				expect(
					extensionPanelSnapshotUsdTotal({
						snapshot: { ...snapshot, holdings: undefined },
						prices: livePrices
					})
				).toBe(2065);
			});
		});

		it('survives being stored', () => {
			const row = toExtensionPanelSnapshotRow({ tokenOrGroup: { group }, priceKeyOf });

			expect(structuredClone(row)).toEqual(row);
		});
	});
});
