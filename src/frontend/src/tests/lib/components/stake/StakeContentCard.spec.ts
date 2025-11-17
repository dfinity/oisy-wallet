import StakeContentCard from '$lib/components/stake/StakeContentCard.svelte';
import { createMockSnippet } from '$tests/mocks/snippet.mock';
import { render } from '@testing-library/svelte';

describe('StakeContentCard', () => {
	const props = {
		content: createMockSnippet('content'),
		buttons: createMockSnippet('buttons')
	};

	it('renders provided snippets correctly', () => {
		const { getByTestId } = render(StakeContentCard, {
			props
		});

		expect(getByTestId('content')).toBeInTheDocument();
		expect(getByTestId('buttons')).toBeInTheDocument();
	});
});
