import { BSC_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.bsc.env';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { VELORA_DELTA_ADDRESSES } from '$env/rest/velora.env';
import {
	VELORA_DELTA_EIP712_DOMAIN,
	VELORA_DELTA_ORDER_TYPES
} from '$eth/constants/velora.constants';
import { getSignParamsEIP712 } from '$eth/utils/eip712.utils';
import { assertNonNullish } from '@dfinity/utils';
import type { DeltaAuctionOrder } from '@velora-dex/sdk';

// Orders Velora's API built, each with the `orderHash` it returned: the digest the pinned domain and
// types must reproduce through the real encoder, as the order is hashed before signing.
const sameChainOrder: DeltaAuctionOrder = {
	owner: '0x5a52e96bacdabb82fd05763e25335261b270efcb',
	beneficiary: '0x0000000000000000000000000000000000000000',
	srcToken: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
	destToken: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
	srcAmount: '100000000',
	destAmount: '41173455568984299',
	expectedAmount: '41589349059580101',
	deadline: 1792766290,
	kind: 0,
	nonce: '46044960915549323991956273295755817914487262528810318179194073118678599606439',
	permit: '0x',
	partnerAndFee: '512',
	metadata: '0x',
	bridge: {
		protocolSelector: '0x00000000',
		destinationChainId: 0,
		outputToken: '0x0000000000000000000000000000000000000000',
		scalingFactor: 0,
		protocolData: '0x'
	}
};

const bridgedOrder: DeltaAuctionOrder = {
	owner: '0xbb45edcd7938842c5955c8b63030a0017f4aeb1a',
	beneficiary: '0x0000000000000000000000000000000000000000',
	srcToken: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
	destToken: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
	srcAmount: '100000000000000000000',
	destAmount: '98990265256872546234',
	expectedAmount: '99990166926133885085',
	deadline: 1793953069,
	kind: 0,
	nonce: '59515498699871636639091346077955205140852692778652394578226867238506793273444',
	permit: '0x',
	partnerAndFee: '512',
	metadata: '0x',
	bridge: {
		protocolSelector: '0x2e09f389',
		destinationChainId: 8453,
		outputToken: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
		scalingFactor: -12,
		protocolData: `0x${'00'.repeat(57)}62d14252405c7a`
	}
};

describe('velora.constants', () => {
	describe('the Delta order format', () => {
		it.each([
			{
				case: '100 USDC to WETH on Ethereum (2026-10-23)',
				network: ETHEREUM_NETWORK,
				order: sameChainOrder,
				orderHash: '0x324b38749417c2bfcd6b78ee00541cbd448ab4192f3b594bb598c90a69bea4d9'
			},
			{
				case: '100 USDC on BSC to USDC on Base, scaled by -12 (2026-11-06)',
				network: BSC_MAINNET_NETWORK,
				order: bridgedOrder,
				orderHash: '0xe546f4025174f8752ded41f275ac3ade9ebf45083bc9394dd81fa09b6042800e'
			}
		])(
			'hashes the order Velora built for $case to its order hash',
			({ network, order, orderHash }) => {
				const verifyingContract = VELORA_DELTA_ADDRESSES[network.id];

				assertNonNullish(verifyingContract);

				expect(
					getSignParamsEIP712({
						domain: {
							...VELORA_DELTA_EIP712_DOMAIN,
							chainId: Number(network.chainId),
							verifyingContract
						},
						types: VELORA_DELTA_ORDER_TYPES,
						value: order
					})
				).toBe(orderHash);
			}
		);
	});
});
