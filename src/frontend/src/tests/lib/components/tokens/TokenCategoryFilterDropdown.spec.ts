import TokenCategoryFilterDropdown from '$lib/components/tokens/TokenCategoryFilterDropdown.svelte';
import { TOKEN_CATEGORY_FILTER } from '$lib/constants/test-ids.constants';
import { TokenCategoryTagValue } from '$lib/enums/token-tag';
import { i18n } from '$lib/stores/i18n.store';
import { openFilterChip } from '$tests/utils/filter-chip.test-utils';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('TokenCategoryFilterDropdown', () => {
	const onSelect = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	const trigger = () => screen.getByTestId(`${TOKEN_CATEGORY_FILTER}-trigger`);

	const optionLabels = (panel: HTMLElement): string[] =>
		within(panel)
			.getAllByRole('button')
			.map((button) => button.textContent?.trim() ?? '');

	it('names the trigger "All types" when no category is selected', () => {
		render(TokenCategoryFilterDropdown, { props: { onSelect } });

		expect(trigger()).toHaveAccessibleName(get(i18n).tokens.text.asset_type_all_short);
	});

	it('names the trigger after the selected category', () => {
		render(TokenCategoryFilterDropdown, {
			props: { onSelect, selectedCategory: TokenCategoryTagValue.STABLECOIN }
		});

		expect(trigger()).toHaveAccessibleName(get(i18n).token_tag.category.stablecoin);
	});

	it('offers every category after "All asset types", Compute last', async () => {
		render(TokenCategoryFilterDropdown, { props: { onSelect } });

		const labels = optionLabels(await openFilterChip(TOKEN_CATEGORY_FILTER));

		expect(labels[0]).toBe(get(i18n).tokens.text.asset_type_all);
		expect(labels.at(-1)).toBe(get(i18n).token_tag.category.compute);
		expect(labels).toHaveLength(Object.values(TokenCategoryTagValue).length + 1);
	});

	it('offers only the given categories', async () => {
		render(TokenCategoryFilterDropdown, {
			props: { onSelect, categories: [TokenCategoryTagValue.CRYPTO] }
		});

		expect(optionLabels(await openFilterChip(TOKEN_CATEGORY_FILTER))).toEqual([
			get(i18n).tokens.text.asset_type_all,
			get(i18n).token_tag.category.crypto
		]);
	});

	it('reports a picked category and closes', async () => {
		render(TokenCategoryFilterDropdown, { props: { onSelect } });

		const panel = await openFilterChip(TOKEN_CATEGORY_FILTER);

		await fireEvent.click(within(panel).getByText(get(i18n).token_tag.category.stablecoin));

		expect(onSelect).toHaveBeenCalledExactlyOnceWith(TokenCategoryTagValue.STABLECOIN);

		await waitFor(() => expect(trigger()).toHaveAttribute('aria-expanded', 'false'));
	});

	it('reports all asset types when "All asset types" is picked', async () => {
		render(TokenCategoryFilterDropdown, {
			props: { onSelect, selectedCategory: TokenCategoryTagValue.STOCK }
		});

		const panel = await openFilterChip(TOKEN_CATEGORY_FILTER);

		await fireEvent.click(within(panel).getByText(get(i18n).tokens.text.asset_type_all));

		expect(onSelect).toHaveBeenCalledExactlyOnceWith(undefined);
	});

	it('marks the selected category as pressed', async () => {
		render(TokenCategoryFilterDropdown, {
			props: { onSelect, selectedCategory: TokenCategoryTagValue.CRYPTO }
		});

		const panel = await openFilterChip(TOKEN_CATEGORY_FILTER);

		expect(
			within(panel).getByRole('button', { name: get(i18n).token_tag.category.crypto })
		).toHaveAttribute('aria-pressed', 'true');
		expect(
			within(panel).getByRole('button', { name: get(i18n).tokens.text.asset_type_all })
		).toHaveAttribute('aria-pressed', 'false');
	});

	it('clears the selected category from the chip', async () => {
		render(TokenCategoryFilterDropdown, {
			props: { onSelect, selectedCategory: TokenCategoryTagValue.CRYPTO }
		});

		await fireEvent.click(
			screen.getByRole('button', { name: get(i18n).tokens.text.clear_asset_type_filter })
		);

		expect(onSelect).toHaveBeenCalledExactlyOnceWith(undefined);
	});
});
