import SwapContexts from '$lib/components/swap/SwapContexts.svelte';
import { mockSnippet, mockSnippetTestId } from '$tests/mocks/snippet.mock';
import { render } from '@testing-library/svelte';

describe('SwapContexts', () => {
	it('renders children snippet', () => {
		const { getByTestId } = render(SwapContexts, {
			children: mockSnippet
		});

		expect(getByTestId(mockSnippetTestId)).toBeInTheDocument();
	});
});
