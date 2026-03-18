import TokenTypeFilterBar from '$lib/components/tokens/TokenTypeFilterBar.svelte';
import { TokenCategoryTagValue } from '$lib/enums/token-tag';
import { hideTokenCategoryFilterStore } from '$lib/stores/settings.store';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';

describe('TokenTypeFilterBar', () => {
	beforeEach(() => {
		hideTokenCategoryFilterStore.reset({ key: 'token-category-filter' });
	});

	it('should render the "All asset types" button', () => {
		const { getByText } = render(TokenTypeFilterBar);

		expect(getByText(en.tokens.text.asset_type_all)).toBeInTheDocument();
	});

	it('should render all category buttons', () => {
		const { getByText } = render(TokenTypeFilterBar);

		expect(getByText(en.token_tag.category.crypto)).toBeInTheDocument();
		expect(getByText(en.token_tag.category.stablecoin)).toBeInTheDocument();
		expect(getByText(en.token_tag.category.stock)).toBeInTheDocument();
		expect(getByText(en.token_tag.category.commodity)).toBeInTheDocument();
	});

	it('should have "All asset types" selected by default', () => {
		const { getByText } = render(TokenTypeFilterBar);

		const allButton = getByText(en.tokens.text.asset_type_all);

		expect(allButton.classList.contains('bg-brand-primary')).toBeTruthy();
		expect(allButton.classList.contains('text-primary-inverted')).toBeTruthy();
	});

	it('should update store when a category is clicked', async () => {
		const spy = vi.spyOn(hideTokenCategoryFilterStore, 'set');
		const { getByText } = render(TokenTypeFilterBar);

		const cryptoButton = getByText(en.token_tag.category.crypto);
		await fireEvent.click(cryptoButton);

		expect(spy).toHaveBeenCalledWith({
			key: 'token-category-filter',
			value: { value: TokenCategoryTagValue.CRYPTO }
		});
	});

	it('should update store to undefined when "All" is clicked', async () => {
		const spy = vi.spyOn(tokenCategoryFilterStore, 'set');
		const { getByText } = render(TokenTypeFilterBar);

		const allButton = getByText(en.tokens.text.asset_type_all);
		await fireEvent.click(allButton);

		expect(spy).toHaveBeenCalledWith({
			key: 'token-category-filter',
			value: { value: undefined }
		});
	});

	it('should render the correct number of buttons', () => {
		const { container } = render(TokenTypeFilterBar);

		const buttons = container.querySelectorAll('button');
		const categoryCount = Object.values(TokenCategoryTagValue).length;

		expect(buttons).toHaveLength(categoryCount + 1);
	});
});
