import TokensCategoryFilterToggle from '$lib/components/tokens/TokensCategoryFilterToggle.svelte';
import { tokenCategoryFilterEnabled } from '$lib/derived/settings.derived';
import { tokenCategoryFilterEnabledStore } from '$lib/stores/settings.store';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('TokensCategoryFilterToggle', () => {
	beforeEach(() => {
		tokenCategoryFilterEnabledStore.reset({ key: 'token-category-filter-enabled' });
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

		expect(get(tokenCategoryFilterEnabled)).toBeFalsy();

		window.dispatchEvent(new CustomEvent('oisyToggleTokenCategoryFilter'));

		expect(get(tokenCategoryFilterEnabled)).toBeTruthy();
	});

	it('should toggle back to disabled on second event', () => {
		render(TokensCategoryFilterToggle);

		window.dispatchEvent(new CustomEvent('oisyToggleTokenCategoryFilter'));

		expect(get(tokenCategoryFilterEnabled)).toBeTruthy();

		window.dispatchEvent(new CustomEvent('oisyToggleTokenCategoryFilter'));

		expect(get(tokenCategoryFilterEnabled)).toBeFalsy();
	});
});
