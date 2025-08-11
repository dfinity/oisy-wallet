import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import {
	CKBTC_LEDGER_CANISTER_IDS,
	CKERC20_LEDGER_CANISTER_IDS,
	CKETH_LEDGER_CANISTER_IDS
} from '$env/networks/networks.icrc.env';
import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
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
import IcTransactionsCkBTCListeners from '$icp/components/transactions/IcTransactionsCkBTCListeners.svelte';
import IcTransactionsCkEthereumListeners from '$icp/components/transactions/IcTransactionsCkEthereumListeners.svelte';
import type { IcCkToken } from '$icp/types/ic-token';
import type { OptionToken } from '$lib/types/token';
import { mapListeners } from '$lib/utils/listener.utils';

describe('mapListeners', () => {
	it('should return an empty array if all tokens are nullish', () => {
		const tokens: OptionToken[] = [null, undefined, null];

		expect(mapListeners(tokens)).toEqual([]);
	});

	it.each([
		BTC_MAINNET_TOKEN,
		ETHEREUM_TOKEN,
		SEPOLIA_TOKEN,
		BASE_ETH_TOKEN,
		BASE_SEPOLIA_ETH_TOKEN,
		BNB_MAINNET_TOKEN,
		BNB_TESTNET_TOKEN
	])('should map token $name of network $network.name to nothing', (token: OptionToken) => {
		const tokens: OptionToken[] = [null, undefined, token];

		expect(mapListeners(tokens)).toEqual([]);
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

		expect(mapListeners(tokens)).toEqual([]);
	});

	const mockCkBtcToken = {
		...BTC_MAINNET_TOKEN,
		network: ICP_NETWORK,
		ledgerCanisterId: CKBTC_LEDGER_CANISTER_IDS[0]
	} as unknown as IcCkToken;
	const mockCkEthToken = {
		...ETHEREUM_TOKEN,
		network: ICP_NETWORK,
		ledgerCanisterId: CKETH_LEDGER_CANISTER_IDS[0]
	} as unknown as IcCkToken as unknown as IcCkToken;
	const mockCkUSDCToken = {
		...USDC_TOKEN,
		network: ICP_NETWORK,
		ledgerCanisterId: CKERC20_LEDGER_CANISTER_IDS[0]
	} as unknown as IcCkToken as unknown as IcCkToken;

	it('should handle IC CK tokens correctly', () => {
		const tokens: OptionToken[] = [mockCkBtcToken, mockCkEthToken, mockCkUSDCToken];

		expect(mapListeners(tokens)).toEqual([
			{ token: mockCkBtcToken, listener: IcTransactionsCkBTCListeners },
			{ token: mockCkEthToken, listener: IcTransactionsCkEthereumListeners },
			{ token: mockCkUSDCToken, listener: IcTransactionsCkEthereumListeners }
		]);
	});

	it('should handle all tokens correctly', () => {
		const tokens: OptionToken[] = [
			mockCkBtcToken,
			mockCkEthToken,
			mockCkUSDCToken,
			BTC_MAINNET_TOKEN,
			BASE_ETH_TOKEN,
			BNB_TESTNET_TOKEN
		];

		expect(mapListeners(tokens)).toEqual([
			{ token: mockCkBtcToken, listener: IcTransactionsCkBTCListeners },
			{ token: mockCkEthToken, listener: IcTransactionsCkEthereumListeners },
			{ token: mockCkUSDCToken, listener: IcTransactionsCkEthereumListeners }
		]);
	});
});
