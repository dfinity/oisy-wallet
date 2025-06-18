import ModalListItem from '$lib/components/common/ModalListItem.svelte';
import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';

describe('ModalListItem', () => {
	const mockContext = new Map([]);
	mockContext.set('list-context', {
		variant: 'styled'
	});

	it('renders correctly', () => {
		const label = 'label';
		const content = 'content';
		const { getByText } = render(ModalListItem, {
			context: mockContext,
			props: {
				label: createRawSnippet(() => ({
					render: () => label
				})),
				content: createRawSnippet(() => ({
					render: () => content
				}))
			}
		});

		expect(getByText(label)).toBeInTheDocument();
		expect(getByText(content)).toBeInTheDocument();
	});
});
