import BitcoinListener from '$btc/components/core/BitcoinListener.svelte';
import {
	BASE_ETH_TOKEN,
	BASE_SEPOLIA_ETH_TOKEN
} from '$env/tokens/tokens-evm/tokens-base/tokens.eth.env';
import {
	BNB_MAINNET_TOKEN,
	BNB_TESTNET_TOKEN
} from '$env/tokens/tokens-evm/tokens-bsc/tokens.bnb.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN, SEPOLIA_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import EthListener from '$eth/components/core/EthListener.svelte';
import type { OptionToken } from '$lib/types/token';
import { mapListeners } from '$lib/utils/listener.utils';

describe('mapListeners', () => {
	it('should return an empty array if all tokens are nullish', () => {
		const tokens: OptionToken[] = [null, undefined, null];

		expect(mapListeners(tokens)).toEqual([]);
	});

	it('should map a Bitcoin token to `BitcoinListener`', () => {
		const tokens: OptionToken[] = [null, undefined, BTC_MAINNET_TOKEN];

		expect(mapListeners(tokens)).toEqual([{ token: BTC_MAINNET_TOKEN, listener: BitcoinListener }]);
	});

	it.each([
		ETHEREUM_TOKEN,
		SEPOLIA_TOKEN,
		BASE_ETH_TOKEN,
		BASE_SEPOLIA_ETH_TOKEN,
		BNB_MAINNET_TOKEN,
		BNB_TESTNET_TOKEN
	])('should map token $name of network $network.name to `EthListener`', (token: OptionToken) => {
		const tokens: OptionToken[] = [null, undefined, token];

		expect(mapListeners(tokens)).toEqual([{ token, listener: EthListener }]);
	});

	it('should map other tokens with no listener', () => {
		const tokens: OptionToken[] = [null, undefined, ICP_TOKEN];

		expect(mapListeners(tokens)).toEqual([]);
	});

	it('should handle multiple tokens correctly', () => {
		const tokens: OptionToken[] = [
			null,
			undefined,
			ICP_TOKEN,
			SEPOLIA_TOKEN,
			BTC_MAINNET_TOKEN,
			BASE_ETH_TOKEN,
			BNB_TESTNET_TOKEN
		];

		expect(mapListeners(tokens)).toEqual([
			{ token: SEPOLIA_TOKEN, listener: EthListener },
			{ token: BTC_MAINNET_TOKEN, listener: BitcoinListener },
			{ token: BASE_ETH_TOKEN, listener: EthListener },
			{ token: BNB_TESTNET_TOKEN, listener: EthListener }
		]);
	});
});
