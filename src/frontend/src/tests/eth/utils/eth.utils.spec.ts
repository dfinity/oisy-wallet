import { BASE_NETWORK } from '$env/networks/networks-evm/networks.evm.base.env';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { WBTC_TOKEN } from '$env/tokens/tokens-erc20/tokens.wbtc.env';
import { BASE_ETH_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens.eth.env';
import { EVM_ERC20_TOKENS } from '$env/tokens/tokens-evm/tokens.erc20.env';
import { SUPPORTED_EVM_TOKENS } from '$env/tokens/tokens-evm/tokens.evm.env';
import { SUPPORTED_BITCOIN_TOKENS } from '$env/tokens/tokens.btc.env';
import { ADDITIONAL_ERC20_TOKENS, ERC20_TWIN_TOKENS } from '$env/tokens/tokens.erc20.env';
import { ETHEREUM_TOKEN, SUPPORTED_ETHEREUM_TOKENS } from '$env/tokens/tokens.eth.env';
import { SPL_TOKENS } from '$env/tokens/tokens.spl.env';
import type { EthereumNetwork } from '$eth/types/network';
import {
	getExplorerUrl,
	isDefaultEthereumToken,
	isNotDefaultEthereumToken,
	isNotSupportedEthTokenId,
	isSupportedEthToken,
	isSupportedEthTokenId
} from '$eth/utils/eth.utils';
import { DEFAULT_ETHEREUM_NETWORK } from '$lib/constants/networks.constants';
import type { Token } from '$lib/types/token';

describe('eth.utils', () => {
	describe('isDefaultEthereumToken', () => {
		it.each([...SUPPORTED_ETHEREUM_TOKENS, ...SUPPORTED_EVM_TOKENS])(
			'should return true for standard Ethereum token $symbol',
			(token) => {
				expect(isDefaultEthereumToken(token)).toBeTruthy();
			}
		);

		it.each([...ERC20_TWIN_TOKENS, ...EVM_ERC20_TOKENS, ...ADDITIONAL_ERC20_TOKENS])(
			'should return false for non-standard Ethereum token $symbol',
			(token) => {
				expect(isDefaultEthereumToken(token)).toBeFalsy();
			}
		);

		it('should return false for a custom Ethereum user token', () => {
			const token = { ...ETHEREUM_TOKEN, category: 'custom' as const };

			expect(isDefaultEthereumToken(token)).toBeFalsy();
		});

		it('should return false for a non-standard Ethereum user token', () => {
			const token = { ...ETHEREUM_TOKEN, standard: 'erc20' as const };

			expect(isDefaultEthereumToken(token)).toBeFalsy();
		});

		it('should return true for a default standard Ethereum token', () => {
			const token = {
				...WBTC_TOKEN,
				standard: 'ethereum' as const,
				category: 'default' as const
			};

			expect(isDefaultEthereumToken(token)).toBeTruthy();
		});

		it('should return false for a nullish token', () => {
			expect(isDefaultEthereumToken(null)).toBeFalsy();

			expect(isDefaultEthereumToken(undefined)).toBeFalsy();
		});
	});

	describe('isNotDefaultEthereumToken', () => {
		it.each([...SUPPORTED_ETHEREUM_TOKENS, ...SUPPORTED_EVM_TOKENS])(
			'should return false for standard Ethereum token $symbol',
			(token) => {
				expect(isNotDefaultEthereumToken(token)).toBeFalsy();
			}
		);

		it.each([...ERC20_TWIN_TOKENS, ...EVM_ERC20_TOKENS, ...ADDITIONAL_ERC20_TOKENS])(
			'should return true for non-standard Ethereum token $symbol',
			(token) => {
				expect(isNotDefaultEthereumToken(token)).toBeTruthy();
			}
		);

		it('should return true for a custom Ethereum user token', () => {
			const token = { ...ETHEREUM_TOKEN, category: 'custom' as const };

			expect(isNotDefaultEthereumToken(token)).toBeTruthy();
		});

		it('should return true for a non-standard Ethereum user token', () => {
			const token = { ...ETHEREUM_TOKEN, standard: 'erc20' as const };

			expect(isNotDefaultEthereumToken(token)).toBeTruthy();
		});

		it('should return false for a default standard Ethereum token', () => {
			const token = {
				...WBTC_TOKEN,
				standard: 'ethereum' as const,
				category: 'default' as const
			};

			expect(isNotDefaultEthereumToken(token)).toBeFalsy();
		});

		it('should return true for a nullish token', () => {
			expect(isNotDefaultEthereumToken(null)).toBeTruthy();

			expect(isNotDefaultEthereumToken(undefined)).toBeTruthy();
		});
	});

	describe('isSupportedEthTokenId', () => {
		it.each(SUPPORTED_ETHEREUM_TOKENS)(
			'should return true for supported token $symbol',
			({ id }) => {
				expect(isSupportedEthTokenId(id)).toBeTruthy();
			}
		);

		it.each([...SUPPORTED_EVM_TOKENS, ...SUPPORTED_BITCOIN_TOKENS])(
			'should return false for unsupported token $symbol',
			({ id }) => {
				expect(isSupportedEthTokenId(id)).toBeFalsy();
			}
		);

		it.each([...ERC20_TWIN_TOKENS, ...EVM_ERC20_TOKENS, ...ADDITIONAL_ERC20_TOKENS, ...SPL_TOKENS])(
			'should return false for unsupported token $symbol',
			({ id }) => {
				expect(isSupportedEthTokenId(id)).toBeFalsy();
			}
		);
	});

	describe('isSupportedEthToken', () => {
		it.each(SUPPORTED_ETHEREUM_TOKENS)(
			'should return true for supported token $symbol',
			(token) => {
				expect(isSupportedEthToken(token)).toBeTruthy();
			}
		);

		it.each([...SUPPORTED_EVM_TOKENS, ...SUPPORTED_BITCOIN_TOKENS])(
			'should return false for unsupported token $symbol',
			(token) => {
				expect(isSupportedEthToken(token)).toBeFalsy();
			}
		);

		it.each([...ERC20_TWIN_TOKENS, ...EVM_ERC20_TOKENS, ...ADDITIONAL_ERC20_TOKENS, ...SPL_TOKENS])(
			'should return false for unsupported token $symbol',
			(token) => {
				expect(isSupportedEthToken(token)).toBeFalsy();
			}
		);

		it('should return false for a nullish token', () => {
			expect(isSupportedEthToken(null)).toBeFalsy();

			expect(isSupportedEthToken(undefined)).toBeFalsy();
		});
	});

	describe('isNotSupportedEthTokenId', () => {
		it.each(SUPPORTED_ETHEREUM_TOKENS)(
			'should return false for supported token $symbol',
			({ id }) => {
				expect(isNotSupportedEthTokenId(id)).toBeFalsy();
			}
		);

		it.each([...SUPPORTED_EVM_TOKENS, ...SUPPORTED_BITCOIN_TOKENS])(
			'should return true for unsupported token $symbol',
			({ id }) => {
				expect(isNotSupportedEthTokenId(id)).toBeTruthy();
			}
		);

		it.each([...ERC20_TWIN_TOKENS, ...EVM_ERC20_TOKENS, ...ADDITIONAL_ERC20_TOKENS, ...SPL_TOKENS])(
			'should return true for unsupported token $symbol',
			({ id }) => {
				expect(isNotSupportedEthTokenId(id)).toBeTruthy();
			}
		);
	});

	describe('getExplorerUrl', () => {
		const mockNetworkBase = BASE_NETWORK;
		const mockNetworkEth = ETHEREUM_NETWORK;

		it('returns Base explorerUrl when Base network is provided', () => {
			const result = getExplorerUrl({ network: mockNetworkBase });

			expect(result).toBe(mockNetworkBase.explorerUrl);
		});

		it('returns Base explorerUrl when Base token is provided', () => {
			const result = getExplorerUrl({ token: BASE_ETH_TOKEN });

			expect(result).toBe(mockNetworkBase.explorerUrl);
		});

		it('returns Ethereum explorerUrl when ETH network is provided', () => {
			const result = getExplorerUrl({ network: mockNetworkEth });

			expect(result).toBe(mockNetworkEth.explorerUrl);
		});

		it('returns the explorerUrl for the provided network if both network and token are provided', () => {
			const result = getExplorerUrl({ network: mockNetworkBase, token: ETHEREUM_TOKEN });

			expect(result).toBe(mockNetworkBase.explorerUrl);
		});

		it('returns DEFAULT_ETHEREUM_NETWORK.explorerUrl if nothing provided', () => {
			const result = getExplorerUrl({});

			expect(result).toBe(DEFAULT_ETHEREUM_NETWORK.explorerUrl);
		});

		it('returns DEFAULT_ETHEREUM_NETWORK.explorerUrl if wrong data is provided', () => {
			const result1 = getExplorerUrl({ token: null as unknown as undefined });

			expect(result1).toBe(DEFAULT_ETHEREUM_NETWORK.explorerUrl);

			const result2 = getExplorerUrl({ network: null as unknown as undefined });

			expect(result2).toBe(DEFAULT_ETHEREUM_NETWORK.explorerUrl);

			const result3 = getExplorerUrl({ token: {} as unknown as Token });

			expect(result3).toBe(DEFAULT_ETHEREUM_NETWORK.explorerUrl);

			const result4 = getExplorerUrl({ network: {} as unknown as EthereumNetwork });

			expect(result4).toBe(DEFAULT_ETHEREUM_NETWORK.explorerUrl);
		});
	});
});
