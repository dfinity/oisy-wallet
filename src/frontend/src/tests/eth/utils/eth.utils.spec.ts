import { WBTC_TOKEN } from '$env/tokens/tokens-erc20/tokens.wbtc.env';
import { EVM_ERC20_TOKENS } from '$env/tokens/tokens-evm/tokens.erc20.env';
import { SUPPORTED_EVM_TOKENS } from '$env/tokens/tokens-evm/tokens.evm.env';
import { SUPPORTED_BITCOIN_TOKENS } from '$env/tokens/tokens.btc.env';
import { ADDITIONAL_ERC20_TOKENS, ERC20_TWIN_TOKENS } from '$env/tokens/tokens.erc20.env';
import { ETHEREUM_TOKEN, SUPPORTED_ETHEREUM_TOKENS } from '$env/tokens/tokens.eth.env';
import { SPL_TOKENS } from '$env/tokens/tokens.spl.env';
import {
	isDefaultEthereumToken,
	isNotDefaultEthereumToken,
	isNotSupportedEthTokenId,
	isSupportedEthToken,
	isSupportedEthTokenId
} from '$eth/utils/eth.utils';

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
});
