import { SOLANA_DEVNET_TOKEN, SOLANA_LOCAL_TOKEN, SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import * as appContants from '$lib/constants/app.constants';
import type { Token } from '$lib/types/token';
import { defineSupportedTokens } from '$lib/utils/env.tokens.utils';

describe('env.tokens.utils', () => {
	describe('defineSupportedTokens', () => {
		const mainnetTokens: Token[] = [SOLANA_TOKEN];
		const testnetTokens: Token[] = [SOLANA_DEVNET_TOKEN];
		const localTokens: Token[] = [SOLANA_LOCAL_TOKEN];

		const mockBaseParams = {
			mainnetFlag: true,
			mainnetTokens,
			testnetTokens,
			localTokens
		};

		beforeEach(() => {
			vi.spyOn(appContants, 'LOCAL', 'get').mockReturnValue(false);
		});

		const mockParams = { ...mockBaseParams, $testnetsEnabled: true };

		it('should return mainnet and testnet tokens', () => {
			expect(defineSupportedTokens(mockParams)).toEqual([...mainnetTokens, ...testnetTokens]);
		});

		it('should return only testnet tokens when mainnet disabled', () => {
			expect(defineSupportedTokens({ ...mockParams, mainnetFlag: false })).toEqual(testnetTokens);
		});

		it('should return only mainnet tokens when no testnet token is provided', () => {
			const { testnetTokens: _, ...params } = mockParams;

			expect(defineSupportedTokens(params)).toEqual(mainnetTokens);
		});

		describe('when local networks are enabled', () => {
			beforeEach(() => {
				vi.spyOn(appContants, 'LOCAL', 'get').mockReturnValueOnce(true);
			});

			it('should return all tokens', () => {
				expect(defineSupportedTokens(mockParams)).toEqual([
					...mainnetTokens,
					...testnetTokens,
					...localTokens
				]);
			});

			it('should return only testnet and local tokens when mainnet disabled', () => {
				expect(defineSupportedTokens({ ...mockParams, mainnetFlag: false })).toEqual([
					...testnetTokens,
					...localTokens
				]);
			});

			it('should return only mainnet and testnet tokens when no local token is provided', () => {
				const { localTokens: _, ...params } = mockParams;

				expect(defineSupportedTokens(params)).toEqual([...mainnetTokens, ...testnetTokens]);
			});
		});
	});
});
