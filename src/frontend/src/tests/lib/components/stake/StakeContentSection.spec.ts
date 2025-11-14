import StakeContentSection from '$lib/components/stake/StakeContentSection.svelte';
import { createMockSnippet } from '$tests/mocks/snippet.mock';
import { render } from '@testing-library/svelte';

describe('StakeContentSection', () => {
	const props = {
		content: createMockSnippet('content'),
		title: createMockSnippet('title')
	};

	it('renders provided snippets correctly', () => {
		const { getByTestId } = render(StakeContentSection, {
			props
		});

		expect(getByTestId('content')).toBeInTheDocument();
		expect(getByTestId('title')).toBeInTheDocument();
	});
});
