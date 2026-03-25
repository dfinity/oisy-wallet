import TokensList from '$lib/components/tokens/TokensList.svelte';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import {
	hideTokenCategoryFilterStore,
	tokenCategoryFilterStore
} from '$lib/stores/settings.store';
import { tokenListStore } from '$lib/stores/token-list.store';
import type { Token } from '$lib/types/token';
import type { TokenUiOrGroupUi } from '$lib/types/token-ui-group';
import { filterTokenGroups } from '$lib/utils/token-group.utils';
import { mockValidToken } from '$tests/mocks/tokens.mock';
import en from '$tests/mocks/i18n.mock';
import { render, waitFor } from '@testing-library/svelte';

const { mockAllFungibleNetworkTokens, mockSortedTokens } = vi.hoisted(() => {
	const { writable } = require('svelte/store');
	return {
		mockAllFungibleNetworkTokens: writable<Token[]>([]),
		mockSortedTokens: writable<TokenUiOrGroupUi[]>([])
	};
});

vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

vi.mock('$lib/derived/all-network-tokens.derived', () => ({
	allFungibleNetworkTokens: mockAllFungibleNetworkTokens
}));

vi.mock('$lib/derived/network-tokens-ui.derived', () => ({
	sortedEnabledNetworkTokenUiOrGroupUi: mockSortedTokens
}));

vi.mock(import('$lib/utils/token-group.utils'), async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		filterTokenGroups: vi
			.fn<typeof filterTokenGroups>()
			.mockImplementation(({ groupedTokens }) => groupedTokens)
	};
});

describe('TokensList', () => {
	const mkToggleableToken = ({
		category,
		enabled
	}: {
		category: TokenCategoryTagValue;
		enabled: boolean;
	}): Token => ({
		...mockValidToken,
		tags: [{ type: TokenTagType.CATEGORY, value: category }],
		enabled
	});

	beforeEach(() => {
		vi.clearAllMocks();

		hideTokenCategoryFilterStore.reset({ key: 'hide-token-category-filter' });
		tokenCategoryFilterStore.reset({ key: 'token-category-filter' });
		tokenListStore.set({ filter: '' });

		mockSortedTokens.set([]);
		mockAllFungibleNetworkTokens.set([]);
	});

	describe('category filter placeholder', () => {
		it('should show lowercased category name in the placeholder title', async () => {
			tokenCategoryFilterStore.set({
				key: 'token-category-filter',
				value: { value: TokenCategoryTagValue.STABLECOIN }
			});

			const { container } = render(TokensList);

			await waitFor(() => {
				const title = container.querySelector('p.font-bold');

				expect(title).not.toBeNull();
				expect(title?.textContent).toContain(
					en.token_tag.category.stablecoin.toLocaleLowerCase('en')
				);
			});
		});

		it('should use no_tokens_for_asset_type_zero_tokens text when disabledCategoryTokenCount is 0', async () => {
			mockAllFungibleNetworkTokens.set([]);

			tokenCategoryFilterStore.set({
				key: 'token-category-filter',
				value: { value: TokenCategoryTagValue.CRYPTO }
			});

			const { container } = render(TokensList);

			await waitFor(() => {
				const title = container.querySelector('p.font-bold');

				expect(title).not.toBeNull();
				expect(title?.textContent).toContain(
					en.token_tag.category.crypto.toLocaleLowerCase('en')
				);
				expect(title?.textContent).toContain('in the selected network');
			});
		});

		it('should use no_tokens_for_asset_type text when there are disabled tokens to enable', async () => {
			const disabledStablecoin = mkToggleableToken({
				category: TokenCategoryTagValue.STABLECOIN,
				enabled: false
			});

			mockAllFungibleNetworkTokens.set([disabledStablecoin]);

			tokenCategoryFilterStore.set({
				key: 'token-category-filter',
				value: { value: TokenCategoryTagValue.STABLECOIN }
			});

			const { container } = render(TokensList);

			await waitFor(() => {
				const title = container.querySelector('p.font-bold');

				expect(title).not.toBeNull();
				expect(title?.textContent).toContain(
					en.token_tag.category.stablecoin.toLocaleLowerCase('en')
				);
				expect(title?.textContent).toContain('in your wallet');
			});
		});

		it('should show description with token count when there are disabled tokens to enable', async () => {
			const disabledTokens = [
				mkToggleableToken({ category: TokenCategoryTagValue.COMMODITY, enabled: false }),
				mkToggleableToken({ category: TokenCategoryTagValue.COMMODITY, enabled: false })
			];

			mockAllFungibleNetworkTokens.set(disabledTokens);

			tokenCategoryFilterStore.set({
				key: 'token-category-filter',
				value: { value: TokenCategoryTagValue.COMMODITY }
			});

			const { container } = render(TokensList);

			await waitFor(() => {
				expect(container).toHaveTextContent('2 supported tokens');
				expect(container.querySelector('strong')).toBeInTheDocument();
			});
		});

		it('should not show description when there are no disabled tokens to enable', async () => {
			mockAllFungibleNetworkTokens.set([]);

			tokenCategoryFilterStore.set({
				key: 'token-category-filter',
				value: { value: TokenCategoryTagValue.STOCK }
			});

			const { container } = render(TokensList);

			await waitFor(() => {
				const title = container.querySelector('p.font-bold');

				expect(title).not.toBeNull();
			});

			const paragraphs = container.querySelectorAll('p');

			expect(paragraphs).toHaveLength(1);
		});
	});
});
