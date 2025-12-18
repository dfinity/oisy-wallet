import type { VeloraSwapDetails } from '$lib/types/swap';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { SwapSide } from '@paraswap/core/src/constants';
import { ParaSwapVersion } from '@paraswap/core/src/types';
import type { BridgePrice, DeltaPrice, OptimalRate } from '@velora-dex/sdk';

const mockVeloraDeltaPrice: DeltaPrice = {
	srcToken: mockEthAddress,
	destToken: '0xDestinationToken',
	srcAmount: '1000000000000000000',
	destAmount: '900000000',
	destAmountBeforeFee: '920000000',
	receivedDestAmount: '890000000',
	receivedDestUSD: '910000000',
	gasCost: '50000',
	gasCostBeforeFee: '48000',
	gasCostUSD: '15.5',
	gasCostUSDBeforeFee: '14.8',
	srcUSD: '1000.0',
	destUSD: '895.5',
	destUSDBeforeFee: '915.2',
	partner: 'PartnerName',
	partnerFee: 0.25,
	hmac: 'abcd1234',
	bridge: {
		destinationChainId: 1,
		outputToken: '0xoutput456',
		protocolSelector: 'bridge_protocol',
		scalingFactor: 1000000,
		protocolData: '0xprotocol_data'
	}
};

const mockVeloraBridgePrice: BridgePrice = {
	srcToken: mockEthAddress,
	destToken: '0xDestinationToken',
	srcAmount: '1000000000000000000',
	destAmount: '900000000',
	destAmountBeforeFee: '920000000',
	receivedDestAmount: '890000000',
	receivedDestUSD: '910000000',
	gasCost: '50000',
	gasCostBeforeFee: '48000',
	gasCostUSD: '15.5',
	gasCostUSDBeforeFee: '14.8',
	srcUSD: '1000.0',
	destUSD: '895.5',
	destUSDBeforeFee: '915.2',
	partner: 'PartnerName',
	partnerFee: 0.25,
	hmac: 'abcd1234',
	bridge: {
		destinationChainId: 1,
		outputToken: '0xoutput456',
		protocolSelector: 'bridge_protocol',
		scalingFactor: 1000000,
		protocolData: '0xprotocol_data'
	},
	bridgeInfo: {
		destAmountAfterBridge: '800000000',
		destUSDAfterBridge: '795.0',
		protocolName: 'Canonical',
		fees: [
			{
				amount: '50',
				feeToken: '0xoutput456',
				amountInSrcToken: '50',
				amountInUSD: '50.0'
			}
		],
		estimatedTimeMs: 300000
	},
	availableBridges: []
};

const mockVeloraOptimalRate: OptimalRate = {
	srcToken: mockEthAddress,
	destToken: '0xDestinationToken',
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
	network: 1,
	srcDecimals: 18,
	destDecimals: 6,
	bestRoute: [
		{
			percent: 100,
			swaps: [
				{
					srcToken: mockEthAddress,
					srcDecimals: 18,
					destToken: '0xDestinationToken',
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

export const mockVeloraSwapDetails: VeloraSwapDetails = {
	...mockVeloraDeltaPrice,
	...mockVeloraBridgePrice,
	...mockVeloraOptimalRate
} as VeloraSwapDetails;
