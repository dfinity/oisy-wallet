import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import {
	isDisplayableErc20Decimals,
	toUnlistedErc20Token,
	unlistedErc20Name
} from '$eth/utils/erc20-unlisted.utils';

describe('erc20-unlisted.utils', () => {
	describe('isDisplayableErc20Decimals', () => {
		it.each([0, 6, 18, 80])('should accept %s decimals', (decimals) => {
			expect(isDisplayableErc20Decimals(decimals)).toBeTruthy();
		});

		// Amounts are formatted with ethers' `formatUnits`, which throws above 80 decimals, while a
		// contract can report up to 255.
		it.each([81, 255, -1, 1.5, Number.NaN])('should refuse %s decimals', (decimals) => {
			expect(isDisplayableErc20Decimals(decimals)).toBeFalsy();
		});
	});

	describe('unlistedErc20Name', () => {
		const labels = {
			unknownTokenLabel: 'Unknown token',
			unknownTokenNamedLabel: 'Unknown token ($symbol)'
		};

		it('should show the symbol the contract reports inside the placeholder', () => {
			expect(unlistedErc20Name({ ...labels, symbol: 'PAXG' })).toBe('Unknown token (PAXG)');
		});

		// Anybody can deploy a contract that calls itself after a listed token.
		it('should never let a reported symbol stand on its own', () => {
			expect(unlistedErc20Name({ ...labels, symbol: 'USDC' })).toBe('Unknown token (USDC)');
		});

		it('should bound the reported symbol', () => {
			expect(unlistedErc20Name({ ...labels, symbol: 'US\u200BDC\u202E' })).toBe(
				'Unknown token (USDC)'
			);
		});

		it.each([undefined, '', '\u200B\u202E'])(
			'should fall back to the bare placeholder for symbol %j',
			(symbol) => {
				expect(unlistedErc20Name({ ...labels, symbol })).toBe('Unknown token');
			}
		);
	});

	describe('toUnlistedErc20Token', () => {
		const address = '0x45804880De22913dAFE09f4980848ECE6EcbAf78';

		it('should state amounts in the contract decimals, under the name of the unlisted token', () => {
			expect(
				toUnlistedErc20Token({
					address,
					network: ETHEREUM_NETWORK,
					decimals: 18,
					name: 'Unknown token (PAXG)'
				})
			).toEqual(
				expect.objectContaining({
					address,
					network: ETHEREUM_NETWORK,
					standard: { code: 'erc20' },
					category: 'custom',
					decimals: 18,
					name: 'Unknown token (PAXG)',
					symbol: 'Unknown token (PAXG)'
				})
			);
		});
	});
});
