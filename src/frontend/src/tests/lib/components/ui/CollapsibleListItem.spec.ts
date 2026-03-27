import CollapsibleListItem from '$lib/components/ui/CollapsibleListItem.svelte';
import { createMockSnippet } from '$tests/mocks/snippet.mock';
import { render } from '@testing-library/svelte';

describe('CollapsibleListItem', () => {
	it('should render all snippets', () => {
		const { queryByTestId } = render(CollapsibleListItem, {
			props: {
				icon: createMockSnippet('icon'),
				title: createMockSnippet('title'),
				description: createMockSnippet('description')
			}
		});

		expect(queryByTestId('icon')).toBeInTheDocument();
		expect(queryByTestId('title')).toBeInTheDocument();
		expect(queryByTestId('description')).toBeInTheDocument();
	});

	it('should not render optional snippets if not supplied', () => {
		const { queryByTestId } = render(CollapsibleListItem, {
			props: {
				title: createMockSnippet('title')
			}
		});

		expect(queryByTestId('icon')).not.toBeInTheDocument();
		expect(queryByTestId('title')).toBeInTheDocument();
		expect(queryByTestId('description')).not.toBeInTheDocument();
	});
});
