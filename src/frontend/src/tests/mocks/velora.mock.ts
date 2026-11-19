import type { DeltaSwapResponse } from '$lib/types/swap';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { SwapSide } from '@paraswap/core/src/constants';
import { ParaSwapVersion } from '@paraswap/core/src/types';
import type { DeltaPrice, DeltaRoute, OptimalRate } from '@velora-dex/sdk';

const ETHEREUM_CHAIN_ID = 1;
const BSC_CHAIN_ID = 56;
const BASE_CHAIN_ID = 8453;

const mockDestinationToken = '0xDestinationToken';

const mockVeloraSameChainRoute: DeltaRoute = {
	origin: {
		input: {
			token: { chainId: ETHEREUM_CHAIN_ID, address: mockEthAddress },
			amount: '1000000000000000000',
			amountUSD: '1000.0'
		},
		output: {
			token: { chainId: ETHEREUM_CHAIN_ID, address: mockDestinationToken },
			amount: '900000000',
			amountUSD: '895.5'
		}
	},
	destination: {
		input: {
			token: { chainId: ETHEREUM_CHAIN_ID, address: mockDestinationToken },
			amount: '900000000',
			amountUSD: '895.5'
		},
		output: {
			token: { chainId: ETHEREUM_CHAIN_ID, address: mockDestinationToken },
			amount: '900000000',
			amountUSD: '895.5'
		}
	},
	bridge: null,
	fees: {
		gas: {
			token: { chainId: ETHEREUM_CHAIN_ID, address: mockEthAddress },
			amount: '50000',
			amountUSD: '15.5'
		},
		bridge: []
	}
};

/**
 * Cross-chain route whose two tokens have different decimals — USDC-BSC (18) to USDC-BASE (6).
 * The origin step stays in source precision while the destination step is denominated in the
 * destination token, which is what the quote mappers must read.
 */
const mockVeloraCrossChainRoute: DeltaRoute = {
	origin: {
		input: {
			token: { chainId: BSC_CHAIN_ID, address: mockEthAddress },
			amount: '100000000000000000000',
			amountUSD: '99.97'
		},
		output: {
			token: { chainId: BSC_CHAIN_ID, address: mockEthAddress },
			amount: '99988851655496648995',
			amountUSD: '99.958855'
		}
	},
	destination: {
		input: {
			token: { chainId: BASE_CHAIN_ID, address: mockDestinationToken },
			amount: '99976241',
			amountUSD: '99.955845'
		},
		output: {
			token: { chainId: BASE_CHAIN_ID, address: mockDestinationToken },
			amount: '99976241',
			amountUSD: '99.955845'
		}
	},
	bridge: {
		protocol: 'Across',
		estimatedTimeMs: 2000,
		tags: ['recommended'],
		contractParams: {
			protocolSelector: '0x2e09f389',
			outputToken: mockDestinationToken,
			scalingFactor: -12,
			protocolData: '0xprotocol_data'
		}
	},
	fees: {
		gas: {
			token: { chainId: BSC_CHAIN_ID, address: mockEthAddress },
			amount: '355400',
			amountUSD: '0.011145'
		},
		bridge: [
			{
				token: { chainId: BASE_CHAIN_ID, address: mockEthAddress },
				amount: '12602570924468607',
				amountUSD: '0.0126'
			}
		]
	}
};

export const mockVeloraDeltaPrice: DeltaPrice = {
	id: '204d3a61-693f-43ce-9658-6fe3a4c36c81',
	side: 'SELL',
	inputToken: { chainId: ETHEREUM_CHAIN_ID, address: mockEthAddress },
	outputToken: { chainId: ETHEREUM_CHAIN_ID, address: mockDestinationToken },
	route: mockVeloraSameChainRoute,
	partner: { name: 'PartnerName', feePercent: 0.25 },
	spender: '0xDeltaSpender',
	alternatives: []
};

export const mockVeloraOptimalRate: OptimalRate = {
	srcToken: mockEthAddress,
	destToken: mockDestinationToken,
	srcAmount: '1000000000000000000',
	destAmount: '900000000',
	gasCost: '50000',
	gasCostUSD: '15.5',
	srcUSD: '1000.0',
	destUSD: '895.5',
	partner: 'PartnerName',
	partnerFee: 0.25,
	hmac: 'abcd1234',
	blockNumber: 12345,
	network: ETHEREUM_CHAIN_ID,
	srcDecimals: 18,
	destDecimals: 6,
	bestRoute: [
		{
			percent: 100,
			swaps: [
				{
					srcToken: mockEthAddress,
					srcDecimals: 18,
					destToken: mockDestinationToken,
					destDecimals: 6,
					swapExchanges: [
						{
							exchange: 'uniswap_v2',
							percent: 100,
							srcAmount: '1000000000000000000',
							destAmount: '900000000'
						}
					]
				}
			]
		}
	],
	side: SwapSide.SELL,
	version: ParaSwapVersion.V6,
	contractMethod: 'swap',
	tokenTransferProxy: '0xTokenTransferProxy',
	contractAddress: '0xSwapContract'
};

export const mockVeloraDeltaSwapResponse: DeltaSwapResponse = {
	delta: mockVeloraDeltaPrice
};

export const mockVeloraCrossChainSwapResponse: DeltaSwapResponse = {
	delta: {
		...mockVeloraDeltaPrice,
		inputToken: { chainId: BSC_CHAIN_ID, address: mockEthAddress },
		outputToken: { chainId: BASE_CHAIN_ID, address: mockDestinationToken },
		route: mockVeloraCrossChainRoute
	}
};
