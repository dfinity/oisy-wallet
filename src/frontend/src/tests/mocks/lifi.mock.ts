import { BASE_NETWORK } from '$env/networks/networks-evm/networks.evm.base.env';
import type { Erc20Token } from '$eth/types/erc20';
import { ZERO_ETH_ADDRESS } from '$lib/constants/app.constants';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { ChainId, type LiFiStep } from '@lifi/sdk';

export const mockLifiDiamond = '0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE';

export const mockLifiUserAddress = '0x000000000000000000000000000000000000dEaD';

export const mockLifiBaseUsdcAddress = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

export const mockLifiBaseUsdcToken: Erc20Token = {
	...mockValidErc20Token,
	id: parseTokenId('LifiBaseUsdc'),
	network: BASE_NETWORK,
	symbol: 'USDC',
	name: 'USD Coin',
	decimals: 6,
	address: mockLifiBaseUsdcAddress
};

// 0.01 ETH, in wei.
export const mockLifiFromAmount = 10_000_000_000_000_000n;

/**
 * A quote for 0.01 native ETH to USDC on Base from `mockLifiUserAddress`, shaped after a live
 * `li.quest/v1/quote` response: the Diamond as both call target and spender, the chain id as a
 * number, the native amount as the hex `value`.
 */
export const mockLifiQuote: LiFiStep = {
	id: 'b1c3c3a0-6f6a-4b0e-9a49-0c6c2f7a9d11',
	type: 'lifi',
	tool: 'nordstern',
	toolDetails: { key: 'nordstern', name: 'Nordstern', logoURI: '' },
	action: {
		fromChainId: ChainId.BAS,
		toChainId: ChainId.BAS,
		fromAmount: `${mockLifiFromAmount}`,
		fromToken: {
			chainId: ChainId.BAS,
			address: ZERO_ETH_ADDRESS,
			symbol: 'ETH',
			name: 'ETH',
			decimals: 18,
			priceUSD: '2500'
		},
		toToken: {
			chainId: ChainId.BAS,
			address: mockLifiBaseUsdcAddress,
			symbol: 'USDC',
			name: 'USD Coin',
			decimals: 6,
			priceUSD: '1'
		},
		fromAddress: mockLifiUserAddress,
		toAddress: mockLifiUserAddress,
		slippage: 0.015
	},
	estimate: {
		tool: 'nordstern',
		fromAmount: `${mockLifiFromAmount}`,
		toAmount: '25003034',
		toAmountMin: '24878019',
		approvalAddress: mockLifiDiamond,
		executionDuration: 0,
		feeCosts: [],
		gasCosts: []
	},
	includedSteps: [],
	transactionRequest: {
		to: mockLifiDiamond,
		from: mockLifiUserAddress,
		value: '0x2386f26fc10000',
		chainId: ChainId.BAS,
		data: '0x736eac0b0000000000000000000000000000000000000000000000000000000000000020',
		gasLimit: '0xff241',
		gasPrice: '0x57bcf0'
	}
};
