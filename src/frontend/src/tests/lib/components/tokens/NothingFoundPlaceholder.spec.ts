import NothingFoundPlaceholder from '$lib/components/tokens/NothingFoundPlaceholder.svelte';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';

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

	it('should render a custom description snippet when provided', () => {
		const descriptionTestId = 'custom-description';
		const description = createRawSnippet(() => ({
			render: () => `<p data-tid="${descriptionTestId}">Custom description content</p>`
		}));

		const { getByTestId, queryByText } = render(NothingFoundPlaceholder, {
			props: { description }
		});

		expect(getByTestId(descriptionTestId)).toBeInTheDocument();
		expect(queryByText(en.tokens.text.filter_nothing_found_description)).not.toBeInTheDocument();
	});

	it('should render an action snippet when provided', () => {
		const actionTestId = 'custom-action';
		const action = createRawSnippet(() => ({
			render: () => `<button data-tid="${actionTestId}">Manage tokens</button>`
		}));

		const { getByTestId } = render(NothingFoundPlaceholder, {
			props: { action }
		});

		expect(getByTestId(actionTestId)).toBeInTheDocument();
	});

	it('should not render an action area by default', () => {
		const { container } = render(NothingFoundPlaceholder);

		const buttons = container.querySelectorAll('button');

		expect(buttons).toHaveLength(0);
	});

	it('should always render the shocked image', () => {
		const { container } = render(NothingFoundPlaceholder);

		const img = container.querySelector('img');

		expect(img).toBeInTheDocument();
	});
});
