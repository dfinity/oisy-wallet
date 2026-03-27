import GetTokenActionItem from '$lib/components/get-token/GetTokenActionItem.svelte';
import { createMockSnippet } from '$tests/mocks/snippet.mock';
import { render } from '@testing-library/svelte';

describe('GetTokenActionItem', () => {
	it('renders snippets correctly', () => {
		const { getByTestId } = render(GetTokenActionItem, {
			icon: createMockSnippet('icon'),
			title: createMockSnippet('title'),
			description: createMockSnippet('description'),
			button: createMockSnippet('button')
		});

		expect(getByTestId('icon')).toBeInTheDocument();
		expect(getByTestId('title')).toBeInTheDocument();
		expect(getByTestId('description')).toBeInTheDocument();
		expect(getByTestId('button')).toBeInTheDocument();
	});
});
