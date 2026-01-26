import EarningOpportunityCard from '$lib/components/earning/EarningOpportunityCard.svelte';
import { createMockSnippet } from '$tests/mocks/snippet.mock';
import { assertNonNullish } from '@dfinity/utils';
import { render, screen } from '@testing-library/svelte';

describe('EarningOpportunityCard', () => {
	const props = {
		logo: createMockSnippet('logo'),
		badge: createMockSnippet('badge'),
		titles: ['title1', 'title2'],
		description: createMockSnippet('description'),
		button: createMockSnippet('button')
	};

	it('renders all snippet sections (logo, badge, title, description, button)', () => {
		const { getByTestId, getByText } = render(EarningOpportunityCard, props);

		expect(getByTestId('logo')).toBeInTheDocument();
		expect(getByTestId('badge')).toBeInTheDocument();
		expect(getByText('title1')).toBeInTheDocument();
		expect(getByText('title2')).toBeInTheDocument();
		expect(getByTestId('description')).toBeInTheDocument();
		expect(getByTestId('button')).toBeInTheDocument();
	});

	it('applies the expected container classes', () => {
		const { container } = render(EarningOpportunityCard, props);

		const root = container.firstElementChild as HTMLElement;

		expect(root).toHaveClass('flex', 'flex-col', 'rounded-lg');
	});

	it('renders snippets within the header row container', () => {
		render(EarningOpportunityCard, props);

		const logo = screen.getByTestId('logo');
		const headerRow = logo.parentElement?.parentElement;

		expect(headerRow).toBeTruthy();

		assertNonNullish(headerRow);

		expect(headerRow.querySelector('[data-tid="logo"]')).not.toBeNull();
		expect(headerRow.querySelector('[data-tid="badge"]')).not.toBeNull();
	});
});
