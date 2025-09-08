import { BONK_TOKEN } from '$env/tokens/tokens-spl/tokens.bonk.env';
import { TRUMP_TOKEN } from '$env/tokens/tokens-spl/tokens.trump.env';
import { parseTokenId } from '$lib/validation/token.validation';
import { enabledSplTokenAddresses, enabledSplTokens, splTokens } from '$sol/derived/spl.derived';
import { splCustomTokensStore } from '$sol/stores/spl-custom-tokens.store';
import { splDefaultTokensStore } from '$sol/stores/spl-default-tokens.store';
import type { SplToken } from '$sol/types/spl';
import type { SplCustomToken } from '$sol/types/spl-custom-token';
import { mockSolAddress, mockSolAddress2 } from '$tests/mocks/sol.mock';
import { mockSplCustomToken, mockValidSplToken } from '$tests/mocks/spl-tokens.mock';
import { get } from 'svelte/store';

describe('spl.derived', () => {
	const mockSplDefaultToken: SplToken = {
		...mockValidSplToken,
		id: parseTokenId('SplDefaultTokenId1'),
		symbol: 'SplDefaultTokenId1'
	};

	const mockSplCustomToken1: SplCustomToken = {
		...mockSplCustomToken,
		id: parseTokenId('SplCustomTokenId1'),
		symbol: 'SplCustomTokenId1',
		address: mockSolAddress,
		enabled: false
	};

	const mockSplCustomToken2: SplCustomToken = {
		...mockSplCustomToken,
		id: parseTokenId('SplCustomTokenId2'),
		symbol: 'SplCustomTokenId2',
		address: mockSolAddress2,
		enabled: true
	};

	beforeEach(() => {
		splDefaultTokensStore.reset();
		splCustomTokensStore.resetAll();

		splDefaultTokensStore.add(mockSplDefaultToken);
		splDefaultTokensStore.add(BONK_TOKEN);
		splDefaultTokensStore.add(TRUMP_TOKEN);

		splCustomTokensStore.setAll([
			{ data: mockSplCustomToken1, certified: false },
			{ data: { ...mockSplDefaultToken, enabled: true }, certified: false },
			{ data: { ...BONK_TOKEN, enabled: false }, certified: false },
			{ data: mockSplCustomToken2, certified: false }
		]);
	});

	describe('splTokens', () => {
		it('should return all SPL tokens', () => {
			const tokens = get(splTokens);

			expect(tokens).toStrictEqual([
				{ ...mockSplDefaultToken, enabled: true, version: undefined },
				{ ...BONK_TOKEN, enabled: false, version: undefined },
				{ ...TRUMP_TOKEN, enabled: false, version: undefined },
				mockSplCustomToken1,
				mockSplCustomToken2
			]);
		});

		it('should not duplicate tokens with same address', () => {
			splCustomTokensStore.resetAll();
			splCustomTokensStore.setAll([
				{
					data: { ...mockSplDefaultToken, enabled: true, version: 1n },
					certified: false
				},
				{ data: { ...BONK_TOKEN, enabled: true }, certified: false }
			]);

			const tokens = get(splTokens);

			expect(tokens).toStrictEqual([
				{ ...mockSplDefaultToken, enabled: true, version: 1n },
				{ ...BONK_TOKEN, enabled: true, version: undefined },
				{ ...TRUMP_TOKEN, enabled: false, version: undefined }
			]);
		});

		it('should handle empty token stores', () => {
			splDefaultTokensStore.reset();
			splCustomTokensStore.resetAll();

			const tokens = get(splTokens);

			expect(tokens).toStrictEqual([]);
		});
	});

	describe('enabledSplTokens', () => {
		it('should return all enabled SPL tokens', () => {
			const tokens = get(enabledSplTokens);

			expect(tokens).toStrictEqual([
				{ ...mockSplDefaultToken, enabled: true, version: undefined },
				{ ...mockSplDefaultToken, enabled: true },
				mockSplCustomToken2
			]);
		});

		it('should duplicate enabled tokens', () => {
			splCustomTokensStore.resetAll();
			splCustomTokensStore.setAll([
				{
					data: { ...mockSplDefaultToken, enabled: true, version: 1n },
					certified: false
				},
				{ data: { ...BONK_TOKEN, enabled: true }, certified: false }
			]);

			const tokens = get(enabledSplTokens);

			expect(tokens).toStrictEqual([
				{ ...mockSplDefaultToken, enabled: true, version: 1n },
				{ ...BONK_TOKEN, enabled: true, version: undefined },
				{ ...mockSplDefaultToken, enabled: true, version: 1n },
				{ ...BONK_TOKEN, enabled: true }
			]);
		});

		it('should handle empty token stores', () => {
			splDefaultTokensStore.reset();
			splCustomTokensStore.resetAll();

			const tokens = get(enabledSplTokens);

			expect(tokens).toStrictEqual([]);
		});

		it('should handle no enabled tokens', () => {
			splCustomTokensStore.resetAll();
			splCustomTokensStore.setAll([
				{ data: { ...mockSplCustomToken1, enabled: false }, certified: false }
			]);

			const tokens = get(enabledSplTokens);

			expect(tokens).toStrictEqual([]);
		});
	});

	describe('enabledSplTokenAddresses', () => {
		it('should return all enabled SPL token addresses', () => {
			const tokens = get(enabledSplTokenAddresses);

			expect(tokens).toStrictEqual([mockSplDefaultToken.address, mockSplCustomToken2.address]);
		});

		it('should not duplicate enabled token addresses', () => {
			splCustomTokensStore.resetAll();
			splCustomTokensStore.setAll([
				{
					data: { ...mockSplDefaultToken, enabled: true, version: 1n },
					certified: false
				},
				{ data: { ...BONK_TOKEN, enabled: true }, certified: false }
			]);

			const tokens = get(enabledSplTokenAddresses);

			expect(tokens).toStrictEqual([mockSplDefaultToken.address, BONK_TOKEN.address]);
		});

		it('should handle empty token stores', () => {
			splDefaultTokensStore.reset();
			splCustomTokensStore.resetAll();

			const tokens = get(enabledSplTokenAddresses);

			expect(tokens).toStrictEqual([]);
		});

		it('should handle no enabled token addresses', () => {
			splCustomTokensStore.resetAll();
			splCustomTokensStore.setAll([
				{ data: { ...mockSplCustomToken1, enabled: false }, certified: false }
			]);

			const tokens = get(enabledSplTokenAddresses);

			expect(tokens).toStrictEqual([]);
		});
	});
});
