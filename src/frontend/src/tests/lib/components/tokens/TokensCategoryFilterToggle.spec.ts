import TokensCategoryFilterToggle from '$lib/components/tokens/TokensCategoryFilterToggle.svelte';
import { hideTokenCategoryFilter, tokenCategoryFilter } from '$lib/derived/settings.derived';
import { TokenCategoryTagValue } from '$lib/enums/token-tag';
import { hideTokenCategoryFilterStore, tokenCategoryFilterStore } from '$lib/stores/settings.store';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('TokensCategoryFilterToggle', () => {
	beforeEach(() => {
		hideTokenCategoryFilterStore.reset({ key: 'hide-token-category-filter' });
		tokenCategoryFilterStore.reset({ key: 'token-category-filter' });
	});

	it('should render a toggle with the correct aria label', () => {
		const { container } = render(TokensCategoryFilterToggle);

		const toggle = container.querySelector(`[aria-label="${en.tokens.text.hide_asset_types}"]`);

		expect(toggle).toBeInTheDocument();
	});

	it('should render without errors', () => {
		const { container } = render(TokensCategoryFilterToggle);

		expect(container).toBeTruthy();
	});

	it('should toggle store on oisyToggleTokenCategoryFilter event', () => {
		render(TokensCategoryFilterToggle);

		expect(get(hideTokenCategoryFilter)).toBeFalsy();

		window.dispatchEvent(new CustomEvent('oisyToggleTokenCategoryFilter'));

		expect(get(hideTokenCategoryFilter)).toBeTruthy();
	});

	it('should toggle back to disabled on second event', () => {
		render(TokensCategoryFilterToggle);

		window.dispatchEvent(new CustomEvent('oisyToggleTokenCategoryFilter'));

		expect(get(hideTokenCategoryFilter)).toBeTruthy();

		window.dispatchEvent(new CustomEvent('oisyToggleTokenCategoryFilter'));

		expect(get(hideTokenCategoryFilter)).toBeFalsy();
	});

	it('should reset token category filter on toggle', () => {
		tokenCategoryFilterStore.set({
			key: 'token-category-filter',
			value: { value: TokenCategoryTagValue.STABLECOIN }
		});

		expect(get(tokenCategoryFilter)).toBe(TokenCategoryTagValue.STABLECOIN);

		render(TokensCategoryFilterToggle);

		window.dispatchEvent(new CustomEvent('oisyToggleTokenCategoryFilter'));

		expect(get(tokenCategoryFilter)).toBeUndefined();
	});

	it('should reset token category filter on each toggle', () => {
		render(TokensCategoryFilterToggle);

		tokenCategoryFilterStore.set({
			key: 'token-category-filter',
			value: { value: TokenCategoryTagValue.CRYPTO }
		});

		expect(get(tokenCategoryFilter)).toBe(TokenCategoryTagValue.CRYPTO);

		window.dispatchEvent(new CustomEvent('oisyToggleTokenCategoryFilter'));

		expect(get(tokenCategoryFilter)).toBeUndefined();

		tokenCategoryFilterStore.set({
			key: 'token-category-filter',
			value: { value: TokenCategoryTagValue.COMMODITY }
		});

		expect(get(tokenCategoryFilter)).toBe(TokenCategoryTagValue.COMMODITY);

		window.dispatchEvent(new CustomEvent('oisyToggleTokenCategoryFilter'));

		expect(get(tokenCategoryFilter)).toBeUndefined();
	});
});
