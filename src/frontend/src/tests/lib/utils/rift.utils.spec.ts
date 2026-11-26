import { ARBITRUM_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.arbitrum.env';
import { BSC_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.bsc.env';
import { POLYGON_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.polygon.env';
import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import { SEPOLIA_NETWORK } from '$env/networks/networks.eth.env';
import { ARBITRUM_ETH_TOKEN } from '$env/tokens/tokens-evm/tokens-arbitrum/tokens.eth.env';
import { BASE_ETH_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens.eth.env';
import { BNB_MAINNET_TOKEN } from '$env/tokens/tokens-evm/tokens-bsc/tokens.bnb.env';
import { POL_MAINNET_TOKEN } from '$env/tokens/tokens-evm/tokens-polygon/tokens.pol.env';
import { ROBINHOOD_ETH_TOKEN } from '$env/tokens/tokens-evm/tokens-robinhood/tokens.eth.env';
import { BTC_MAINNET_TOKEN, BTC_TESTNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN, SEPOLIA_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import type { Erc20Token } from '$eth/types/erc20';
import { isSameRiftAssetId, toRiftAssetId } from '$lib/utils/rift.utils';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';

const USDC_ETHEREUM = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

const erc20 = (overrides: Partial<Erc20Token>): Erc20Token => ({
	...mockValidErc20Token,
	address: USDC_ETHEREUM,
	...overrides
});

describe('rift.utils', () => {
	describe('toRiftAssetId', () => {
		it('names native BTC on mainnet', () => {
			expect(toRiftAssetId(BTC_MAINNET_TOKEN)).toBe('bitcoin.btc');
		});

		// Pinned from live `format: "raw"` quotes, 2026-11-26.
		it.each([
			{ label: 'Ethereum', token: ETHEREUM_TOKEN, expected: 'evm:1.eth' },
			{ label: 'Arbitrum', token: ARBITRUM_ETH_TOKEN, expected: 'evm:42161.eth' },
			{ label: 'Base', token: BASE_ETH_TOKEN, expected: 'evm:8453.eth' },
			{ label: 'Polygon', token: POL_MAINNET_TOKEN, expected: 'evm:137.pol' },
			{ label: 'Robinhood Chain', token: ROBINHOOD_ETH_TOKEN, expected: 'evm:4663.eth' }
		])('names the native coin of $label', ({ token, expected }) => {
			expect(toRiftAssetId(token)).toBe(expected);
		});

		it('names an ERC-20 by its lowercased contract address', () => {
			expect(toRiftAssetId(erc20({}))).toBe('evm:1.0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48');
		});

		it.each([
			{ label: 'Arbitrum', network: ARBITRUM_MAINNET_NETWORK, chain: 'evm:42161' },
			{ label: 'Polygon', network: POLYGON_MAINNET_NETWORK, chain: 'evm:137' },
			{ label: 'Robinhood Chain', network: ROBINHOOD_MAINNET_NETWORK, chain: 'evm:4663' }
		])('names an ERC-20 on $label with its chain id', ({ network, chain }) => {
			expect(toRiftAssetId(erc20({ network }))).toBe(
				`${chain}.0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48`
			);
		});

		it.each([
			{ label: 'BTC on testnet', token: BTC_TESTNET_TOKEN },
			{ label: 'ETH on Sepolia', token: SEPOLIA_TOKEN },
			{ label: 'an ERC-20 on Sepolia', token: erc20({ network: SEPOLIA_NETWORK }) },
			{ label: 'BNB, on a network Rift does not list', token: BNB_MAINNET_TOKEN },
			{ label: 'an ERC-20 on BSC', token: erc20({ network: BSC_MAINNET_NETWORK }) },
			{ label: 'SOL', token: SOLANA_TOKEN },
			{ label: 'ICP', token: ICP_TOKEN }
		])('names no asset for $label', ({ token }) => {
			expect(toRiftAssetId(token)).toBeUndefined();
		});
	});

	describe('isSameRiftAssetId', () => {
		it('compares without case', () => {
			expect(
				isSameRiftAssetId({
					a: 'evm:1.0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
					b: `evm:1.${USDC_ETHEREUM}`
				})
			).toBeTruthy();
		});

		it('tells different assets apart', () => {
			expect(isSameRiftAssetId({ a: 'evm:1.eth', b: 'evm:8453.eth' })).toBeFalsy();
		});
	});
});
