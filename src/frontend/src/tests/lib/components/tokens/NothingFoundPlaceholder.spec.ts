import NothingFoundPlaceholder from '$lib/components/tokens/NothingFoundPlaceholder.svelte';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('NothingFoundPlaceholder', () => {
	it('should render the default title', () => {
		const { getByText } = render(NothingFoundPlaceholder);

		expect(getByText(en.tokens.text.filter_nothing_found)).toBeInTheDocument();
	});

	it('should render the default description', () => {
		const { getByText } = render(NothingFoundPlaceholder);

		expect(getByText(en.tokens.text.filter_nothing_found_description)).toBeInTheDocument();
	});

	it('should render a custom title when provided', () => {
		const customTitle = 'No stablecoins found';

		const { getByText, queryByText } = render(NothingFoundPlaceholder, {
			props: { title: customTitle }
		});

		expect(getByText(customTitle)).toBeInTheDocument();
		expect(queryByText(en.tokens.text.filter_nothing_found)).not.toBeInTheDocument();
	});

	it('should render a custom description string when provided', () => {
		const customDescription = 'Choose from <strong>500 supported tokens</strong> to customize.';

		const { container, queryByText } = render(NothingFoundPlaceholder, {
			props: { description: customDescription }
		});

		expect(container).toHaveTextContent('Choose from 500 supported tokens to customize.');
		expect(container.querySelector('strong')).toBeInTheDocument();
		expect(queryByText(en.tokens.text.filter_nothing_found_description)).not.toBeInTheDocument();
	});

	it('should not render description when an empty string is provided', () => {
		const { container, queryByText } = render(NothingFoundPlaceholder, {
			props: { description: '' }
		});

		expect(queryByText(en.tokens.text.filter_nothing_found_description)).not.toBeInTheDocument();

		const paragraphs = container.querySelectorAll('p');

		expect(paragraphs).toHaveLength(1);
	});

	it('should always render the shocked image', () => {
		const { container } = render(NothingFoundPlaceholder);

		const img = container.querySelector('img');

		expect(img).toBeInTheDocument();
	});
});
