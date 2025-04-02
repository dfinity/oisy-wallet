import BitcoinListener from '$btc/components/core/BitcoinListener.svelte';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { SEPOLIA_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import EthListener from '$eth/components/core/EthListener.svelte';
import type { OptionToken } from '$lib/types/token';
import { mapListeners } from '$lib/utils/listener.utils';

// We need to mock these nested dependencies too because otherwise there is an error raise in the importing of `WebSocket` from `ws` inside the `ethers/provider` package
vi.mock('ethers/providers', () => {
	const provider = vi.fn();
	return { EtherscanProvider: provider, InfuraProvider: provider, JsonRpcProvider: provider };
});

describe('mapListeners', () => {
	it('should return an empty array if all tokens are nullish', () => {
		const tokens: OptionToken[] = [null, undefined, null];

		expect(mapListeners(tokens)).toEqual([]);
	});

	it('should map a Bitcoin token to BitcoinListener', () => {
		const tokens: OptionToken[] = [null, undefined, BTC_MAINNET_TOKEN];

		expect(mapListeners(tokens)).toEqual([{ token: BTC_MAINNET_TOKEN, listener: BitcoinListener }]);
	});

	it('should map an Ethereum token to EthListener', () => {
		const tokens: OptionToken[] = [null, undefined, SEPOLIA_TOKEN];

		expect(mapListeners(tokens)).toEqual([{ token: SEPOLIA_TOKEN, listener: EthListener }]);
	});

	it('should map other tokens with no listener', () => {
		const tokens: OptionToken[] = [null, undefined, ICP_TOKEN];

		expect(mapListeners(tokens)).toEqual([]);
	});

	it('should handle multiple tokens correctly', () => {
		const tokens: OptionToken[] = [null, undefined, ICP_TOKEN, SEPOLIA_TOKEN, BTC_MAINNET_TOKEN];

		expect(mapListeners(tokens)).toEqual([
			{ token: SEPOLIA_TOKEN, listener: EthListener },
			{ token: BTC_MAINNET_TOKEN, listener: BitcoinListener }
		]);
	});
});
