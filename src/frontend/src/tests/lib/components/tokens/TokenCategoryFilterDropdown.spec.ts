import TokenCategoryFilterDropdown from '$lib/components/tokens/TokenCategoryFilterDropdown.svelte';
import { tokenCategoryFilter } from '$lib/derived/settings.derived';
import { TokenCategoryTagValue } from '$lib/enums/token-tag';
import { i18n } from '$lib/stores/i18n.store';
import { tokenCategoryFilterStore } from '$lib/stores/settings.store';
import { assertNonNullish } from '@dfinity/utils';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('TokenCategoryFilterDropdown', () => {
	const tokenCategoryFilterStoreSpy = vi.spyOn(tokenCategoryFilterStore, 'set');

	beforeEach(() => {
		vi.clearAllMocks();
		tokenCategoryFilterStore.reset({ key: 'token-category-filter' });
	});

	it('should render the filter button', () => {
		const { container } = render(TokenCategoryFilterDropdown);

		const button = container.querySelector('button');

		expect(button).toBeInTheDocument();
	});

	it('should render with the correct aria label', () => {
		const { container } = render(TokenCategoryFilterDropdown);

		const button = container.querySelector(
			`[aria-label="${get(i18n).tokens.text.asset_type_all}"]`
		);

		expect(button).toBeInTheDocument();
	});

	it('should display "All asset types" label when no category is selected', () => {
		const { getByText } = render(TokenCategoryFilterDropdown);

		expect(getByText(get(i18n).tokens.text.asset_type_all)).toBeInTheDocument();
	});

	it('should display selected category label when a category is set', () => {
		tokenCategoryFilterStore.set({
			key: 'token-category-filter',
			value: { value: TokenCategoryTagValue.STABLECOIN }
		});

		const { getByText } = render(TokenCategoryFilterDropdown);

		expect(getByText(get(i18n).token_tag.category.stablecoin)).toBeInTheDocument();
	});

	it('should open the popover when button is clicked', async () => {
		const { container } = render(TokenCategoryFilterDropdown);

		const button = container.querySelector('button');
		assertNonNullish(button);

		await fireEvent.click(button);

		await waitFor(() => {
			const popover = container.querySelector('[data-tid="popover-content"]');

			expect(popover).toBeInTheDocument();
		});
	});

	it('should display all category options in the popover', async () => {
		const { container, getByText } = render(TokenCategoryFilterDropdown);

		const button = container.querySelector('button');
		assertNonNullish(button);

		await fireEvent.click(button);

		await waitFor(() => {
			expect(getByText(get(i18n).token_tag.category.crypto)).toBeInTheDocument();
			expect(getByText(get(i18n).token_tag.category.stablecoin)).toBeInTheDocument();
			expect(getByText(get(i18n).token_tag.category.stock)).toBeInTheDocument();
			expect(getByText(get(i18n).token_tag.category.commodity)).toBeInTheDocument();
		});
	});

	it('should set the store when a category is selected', async () => {
		const { container, getByText } = render(TokenCategoryFilterDropdown);

		const button = container.querySelector('button');
		assertNonNullish(button);

		await fireEvent.click(button);

		await waitFor(() => {
			expect(getByText(get(i18n).token_tag.category.stablecoin)).toBeInTheDocument();
		});

		const option = getByText(get(i18n).token_tag.category.stablecoin);
		await fireEvent.click(option);

		expect(tokenCategoryFilterStoreSpy).toHaveBeenCalledWith({
			key: 'token-category-filter',
			value: { value: TokenCategoryTagValue.STABLECOIN }
		});
	});

	it('should reset the store when "All" is selected', async () => {
		tokenCategoryFilterStore.set({
			key: 'token-category-filter',
			value: { value: TokenCategoryTagValue.CRYPTO }
		});

		const { container, getAllByText } = render(TokenCategoryFilterDropdown);

		const button = container.querySelector('button');
		assertNonNullish(button);

		await fireEvent.click(button);

		await waitFor(() => {
			const allOptions = getAllByText(get(i18n).tokens.text.asset_type_all);

			expect(allOptions.length).toBeGreaterThan(0);
		});

		const allOptions = getAllByText(get(i18n).tokens.text.asset_type_all);
		const popoverAllOption = allOptions.find((el) => el.closest('ul'));
		assertNonNullish(popoverAllOption);

		await fireEvent.click(popoverAllOption);

		expect(tokenCategoryFilterStoreSpy).toHaveBeenCalledWith({
			key: 'token-category-filter',
			value: { value: undefined }
		});
	});

	it('should update the derived store value after selection', async () => {
		const { container, getByText } = render(TokenCategoryFilterDropdown);

		expect(get(tokenCategoryFilter)).toBeUndefined();

		const button = container.querySelector('button');
		assertNonNullish(button);

		await fireEvent.click(button);

		await waitFor(() => {
			expect(getByText(get(i18n).token_tag.category.commodity)).toBeInTheDocument();
		});

		const option = getByText(get(i18n).token_tag.category.commodity);
		await fireEvent.click(option);

		expect(get(tokenCategoryFilter)).toBe(TokenCategoryTagValue.COMMODITY);
	});
});
