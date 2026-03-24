import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { Token } from '$lib/types/token';
import type { TokenUi } from '$lib/types/token-ui';
import type { TokenUiOrGroupUi } from '$lib/types/token-ui-group';
import {
	filterTokensByCategory,
	filterTokensUiByCategory,
	getTokenCategoryTag
} from '$lib/utils/token-tag.utils';
import { mockValidToken } from '$tests/mocks/tokens.mock';

describe('token-tag.utils', () => {
	const cryptoToken: Pick<Token, 'tags'> = {
		tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.CRYPTO }]
	};

	const stablecoinToken: Pick<Token, 'tags'> = {
		tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STABLECOIN }]
	};

	const stockToken: Pick<Token, 'tags'> = {
		tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }]
	};

	const noTagsToken: Pick<Token, 'tags'> = {
		// @ts-expect-error Testing invalid input types
		tags: []
	};

	const multiTagToken: Pick<Token, 'tags'> = {
		// @ts-expect-error Testing invalid input types
		tags: [
			{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.COMMODITY },
			{ type: TokenTagType.RISK, value: 'low' }
		]
	};

	describe('getTokenCategoryTag', () => {
		it('should return the category tag value when present', () => {
			expect(getTokenCategoryTag(cryptoToken)).toBe(TokenCategoryTagValue.CRYPTO);
		});

		it('should return stablecoin category', () => {
			expect(getTokenCategoryTag(stablecoinToken)).toBe(TokenCategoryTagValue.STABLECOIN);
		});

		it('should return undefined when no tags are present', () => {
			expect(getTokenCategoryTag(noTagsToken)).toBeUndefined();
		});

		it('should return the category value even with multiple tag types', () => {
			expect(getTokenCategoryTag(multiTagToken)).toBe(TokenCategoryTagValue.COMMODITY);
		});
	});

	describe('filterTokensByCategory', () => {
		const mkTokenUi = (tags: Token['tags']): TokenUi => ({ ...mockValidToken, tags }) as TokenUi;

		const cryptoTokenUi = mkTokenUi(cryptoToken.tags);
		const stableTokenUi = mkTokenUi(stablecoinToken.tags);
		const stockTokenUi = mkTokenUi(stockToken.tags);
		// @ts-expect-error Testing invalid input types
		const noTagTokenUi = mkTokenUi([]);

		const items: TokenUiOrGroupUi[] = [
			{ token: cryptoTokenUi },
			{ token: stableTokenUi },
			{ token: stockTokenUi },
			{ token: noTagTokenUi }
		];

		it('should return all tokens when category is undefined', () => {
			const result = filterTokensByCategory({ tokens: items, category: undefined });

			expect(result).toHaveLength(4);
		});

		it('should filter tokens by crypto category', () => {
			const result = filterTokensByCategory({
				tokens: items,
				category: TokenCategoryTagValue.CRYPTO
			});

			expect(result).toHaveLength(1);
			expect((result[0] as { token: TokenUi }).token).toBe(cryptoTokenUi);
		});

		it('should filter tokens by stablecoin category', () => {
			const result = filterTokensByCategory({
				tokens: items,
				category: TokenCategoryTagValue.STABLECOIN
			});

			expect(result).toHaveLength(1);
			expect((result[0] as { token: TokenUi }).token).toBe(stableTokenUi);
		});

		it('should return empty array when no tokens match', () => {
			const result = filterTokensByCategory({
				tokens: items,
				category: TokenCategoryTagValue.COMMODITY
			});

			expect(result).toHaveLength(0);
		});

		it('should include group if any group token matches', () => {
			const groupItems: TokenUiOrGroupUi[] = [
				{
					group: {
						id: Symbol('test'),
						decimals: 8,
						groupData: { symbol: 'GRP', name: 'Group' },
						tokens: [cryptoTokenUi, stableTokenUi]
					} as TokenUiOrGroupUi extends { group: infer G } ? G : never
				}
			];

			const result = filterTokensByCategory({
				tokens: groupItems,
				category: TokenCategoryTagValue.CRYPTO
			});

			expect(result).toHaveLength(1);
		});

		it('should exclude group if no group tokens match', () => {
			const groupItems: TokenUiOrGroupUi[] = [
				{
					group: {
						id: Symbol('test'),
						decimals: 8,
						groupData: { symbol: 'GRP', name: 'Group' },
						tokens: [stableTokenUi]
					} as TokenUiOrGroupUi extends { group: infer G } ? G : never
				}
			];

			const result = filterTokensByCategory({
				tokens: groupItems,
				category: TokenCategoryTagValue.CRYPTO
			});

			expect(result).toHaveLength(0);
		});
	});

	describe('filterTokensUiByCategory', () => {
		const mkTokenUi = (tags: Token['tags']): TokenUi => ({ ...mockValidToken, tags }) as TokenUi;

		const cryptoTokenUi = mkTokenUi(cryptoToken.tags);
		const stableTokenUi = mkTokenUi(stablecoinToken.tags);

		const tokens: TokenUi[] = [cryptoTokenUi, stableTokenUi];

		it('should return all tokens when category is undefined', () => {
			const result = filterTokensUiByCategory({ tokens, category: undefined });

			expect(result).toHaveLength(2);
		});

		it('should filter tokens by category', () => {
			const result = filterTokensUiByCategory({
				tokens,
				category: TokenCategoryTagValue.STABLECOIN
			});

			expect(result).toHaveLength(1);
			expect(result[0]).toBe(stableTokenUi);
		});

		it('should return empty array when no tokens match', () => {
			const result = filterTokensUiByCategory({
				tokens,
				category: TokenCategoryTagValue.COMMODITY
			});

			expect(result).toHaveLength(0);
		});

		describe('group token counts', () => {
			const mkTokenUiWithOverrides = (tags: Token['tags'], overrides?: Partial<Token>): TokenUi =>
				({ ...mockValidToken, ...overrides, tags }) as TokenUi;

			const cryptoTokenUiGroup = mkTokenUiWithOverrides(cryptoToken.tags, {
				name: 'CryptoToken',
				symbol: 'CRY'
			});
			const stableTokenUiGroup = mkTokenUiWithOverrides(stablecoinToken.tags, {
				name: 'StableToken',
				symbol: 'STB'
			});
			const stockTokenUiGroup = mkTokenUiWithOverrides(stockToken.tags, {
				name: 'StockToken',
				symbol: 'STK'
			});

			it('should filter group tokens to only those matching the selected category', () => {
				const groupTokens: TokenUi[] = [cryptoTokenUiGroup, stableTokenUiGroup, stockTokenUiGroup];

				const filtered = filterTokensUiByCategory({
					tokens: groupTokens,
					category: TokenCategoryTagValue.CRYPTO
				});

				expect(filtered).toHaveLength(1);
				expect(filtered[0]).toBe(cryptoTokenUiGroup);
			});

			it('should return all group tokens when no category is selected', () => {
				const groupTokens: TokenUi[] = [cryptoTokenUiGroup, stableTokenUiGroup, stockTokenUiGroup];

				const filtered = filterTokensUiByCategory({
					tokens: groupTokens,
					category: undefined
				});

				expect(filtered).toHaveLength(3);
			});

			it('should return correct count when multiple tokens match the category', () => {
				const anotherCryptoTokenUi = mkTokenUiWithOverrides(cryptoToken.tags, {
					name: 'AnotherCrypto',
					symbol: 'AC'
				});
				const groupTokens: TokenUi[] = [
					cryptoTokenUiGroup,
					stableTokenUiGroup,
					anotherCryptoTokenUi
				];

				const filtered = filterTokensUiByCategory({
					tokens: groupTokens,
					category: TokenCategoryTagValue.CRYPTO
				});

				expect(filtered).toHaveLength(2);
				expect(filtered).toContain(cryptoTokenUiGroup);
				expect(filtered).toContain(anotherCryptoTokenUi);
			});

			it('should return empty when no group tokens match the category', () => {
				const groupTokens: TokenUi[] = [stableTokenUiGroup, stockTokenUiGroup];

				const filtered = filterTokensUiByCategory({
					tokens: groupTokens,
					category: TokenCategoryTagValue.CRYPTO
				});

				expect(filtered).toHaveLength(0);
			});
		});
	});
});
