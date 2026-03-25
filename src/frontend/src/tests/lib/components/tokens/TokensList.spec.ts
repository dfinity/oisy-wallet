import TokensList from '$lib/components/tokens/TokensList.svelte';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import { hideTokenCategoryFilterStore, tokenCategoryFilterStore } from '$lib/stores/settings.store';
import { tokenListStore } from '$lib/stores/token-list.store';
import type { Token } from '$lib/types/token';
import type { TokenToggleable } from '$lib/types/token-toggleable';
import type { filterTokenGroups } from '$lib/utils/token-group.utils';
import en from '$tests/mocks/i18n.mock';
import { mockValidToken } from '$tests/mocks/tokens.mock';
import { render, waitFor } from '@testing-library/svelte';

const mockStores = vi.hoisted(() => ({
	setAllFungibleNetworkTokens: (_v: Token[]) => {},
	setSortedTokens: (_v: unknown[]) => {}
}));

vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

vi.mock('$lib/derived/all-network-tokens.derived', async () => {
	const { writable } = await import('svelte/store');
	const store = writable<Token[]>([]);
	mockStores.setAllFungibleNetworkTokens = (v) => store.set(v);
	return { allFungibleNetworkTokens: store };
});

vi.mock('$lib/derived/network-tokens-ui.derived', async () => {
	const { writable } = await import('svelte/store');
	const store = writable<unknown[]>([]);
	mockStores.setSortedTokens = (v) => store.set(v);
	return { sortedEnabledNetworkTokenUiOrGroupUi: store };
});

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
	}): TokenToggleable<Token> => ({
		...mockValidToken,
		tags: [{ type: TokenTagType.CATEGORY, value: category }],
		enabled
	});

	beforeEach(() => {
		vi.clearAllMocks();

		hideTokenCategoryFilterStore.reset({ key: 'hide-token-category-filter' });
		tokenCategoryFilterStore.reset({ key: 'token-category-filter' });
		tokenListStore.set({ filter: '' });

		mockStores.setSortedTokens([]);
		mockStores.setAllFungibleNetworkTokens([]);
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

		it('should use the proper label text when disabledCategoryTokenCount is 0', async () => {
			tokenCategoryFilterStore.set({
				key: 'token-category-filter',
				value: { value: TokenCategoryTagValue.CRYPTO }
			});

			const { container } = render(TokensList);

			await waitFor(() => {
				const title = container.querySelector('p.font-bold');

				expect(title).not.toBeNull();
				expect(title?.textContent).toContain(en.token_tag.category.crypto.toLocaleLowerCase('en'));
				expect(title?.textContent).toContain('in the selected network');
			});
		});

		it('should use the proper label text when there are disabled tokens to enable', async () => {
			const disabledStablecoin = mkToggleableToken({
				category: TokenCategoryTagValue.STABLECOIN,
				enabled: false
			});

			mockStores.setAllFungibleNetworkTokens([disabledStablecoin]);

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

			mockStores.setAllFungibleNetworkTokens(disabledTokens);

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
