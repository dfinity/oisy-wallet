import UtxosFeeContexts from '$btc/components/fee/UtxosFeeContexts.svelte';
import { mockSnippet, mockSnippetTestId } from '$tests/mocks/snippet.mock';
import { render } from '@testing-library/svelte';

describe('UtxosFeeContexts', () => {
	it('renders children snippet', () => {
		const { getByTestId } = render(UtxosFeeContexts, {
			children: mockSnippet
		});

		expect(getByTestId(mockSnippetTestId)).toBeInTheDocument();
	});
});
