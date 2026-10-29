import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import { swapProviderPool } from '$lib/providers/swap-provider-pool.providers';
import { SwapProvider } from '$lib/types/swap';

// KongSwap is disabled; every other provider, LI.FI included, is enabled everywhere.
describe('swapProviderPool', () => {
	it('starts an ICP pair with the ICP providers and its bridges, then the rest', () => {
		expect(
			swapProviderPool({ sourceNetworkId: ICP_NETWORK_ID, destinationNetworkId: ICP_NETWORK_ID })
		).toEqual({
			related: [
				SwapProvider.ICP_SWAP,
				SwapProvider.OISY_TRADE,
				SwapProvider.ONE_SEC,
				SwapProvider.CHAIN_FUSION
			],
			wider: [SwapProvider.VELORA, SwapProvider.NEAR_INTENTS, SwapProvider.LIFI]
		});
	});

	it('starts an EVM pair with the EVM providers and leaves ICPSwap and OISY Trade to the end', () => {
		expect(
			swapProviderPool({
				sourceNetworkId: ETHEREUM_NETWORK_ID,
				destinationNetworkId: ETHEREUM_NETWORK_ID
			})
		).toEqual({
			related: [
				SwapProvider.VELORA,
				SwapProvider.NEAR_INTENTS,
				SwapProvider.ONE_SEC,
				SwapProvider.CHAIN_FUSION,
				SwapProvider.LIFI
			],
			wider: [SwapProvider.ICP_SWAP, SwapProvider.OISY_TRADE]
		});
	});

	it('counts a destination network as related, so an EVM to ICP pair includes the ICP providers', () => {
		const { related, wider } = swapProviderPool({
			sourceNetworkId: ETHEREUM_NETWORK_ID,
			destinationNetworkId: ICP_NETWORK_ID
		});

		expect(related).toEqual(
			expect.arrayContaining([SwapProvider.ICP_SWAP, SwapProvider.OISY_TRADE, SwapProvider.VELORA])
		);
		expect(wider).toEqual([]);
	});

	it('serves a Bitcoin pair from its own registry first', () => {
		expect(
			swapProviderPool({
				sourceNetworkId: BTC_MAINNET_NETWORK_ID,
				destinationNetworkId: BTC_MAINNET_NETWORK_ID
			}).related
		).toEqual([SwapProvider.CHAIN_FUSION, SwapProvider.NEAR_INTENTS]);
	});

	it('never includes a disabled provider', () => {
		const { related, wider } = swapProviderPool({
			sourceNetworkId: ICP_NETWORK_ID,
			destinationNetworkId: ETHEREUM_NETWORK_ID
		});

		expect([...related, ...wider]).not.toContain(SwapProvider.KONG_SWAP);
	});
});
