import EarningOpportunityCard from '$lib/components/earning/EarningOpportunityCard.svelte';
import { createMockSnippet } from '$tests/mocks/snippet.mock';
import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

describe('EarningOpportunityCard', () => {
	const props = {
		logo: createMockSnippet('logo'),
		badge: createMockSnippet('badge'),
		title: createMockSnippet('title'),
		description: createMockSnippet('description'),
		button: createMockSnippet('button')
	};

	it('renders all snippet sections (logo, badge, title, description, button)', () => {
		render(EarningOpportunityCard, props);

		expect(screen.getByTestId('logo')).toBeInTheDocument();
		expect(screen.getByTestId('badge')).toBeInTheDocument();
		expect(screen.getByTestId('title')).toBeInTheDocument();
		expect(screen.getByTestId('description')).toBeInTheDocument();
		expect(screen.getByTestId('button')).toBeInTheDocument();
	});

	it('renders logo before badge in the header row (DOM order)', () => {
		render(EarningOpportunityCard, props);

		const logo = screen.getByTestId('logo');
		const badge = screen.getByTestId('badge');

		// Assert that badge is after logo in the document flow
		const relation = logo.compareDocumentPosition(badge);
		expect(relation & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	});

	it('applies the expected container classes', () => {
		const { container } = render(EarningOpportunityCard, props);

		const root = container.firstElementChild as HTMLElement;
		expect(root).toHaveClass('flex', 'flex-col', 'rounded-lg', 'border-1', 'bg-disabled', 'p-4');
	});

	it('renders snippets within the header row container', () => {
		render(EarningOpportunityCard, props);

		const logo = screen.getByTestId('logo');
		// DOM structure:
		// <span class="flex items-start">  <-- header row
		//   <span class="flex flex-1"> <span data-tid="logo">...</span> </span>
		//   <span class="..."> <span data-tid="badge">...</span> </span>
		// </span>
		const headerRow = logo.parentElement?.parentElement; // step out of the inner logo wrapper to the outer header span
		expect(headerRow).toBeTruthy();

		expect(headerRow!.querySelector('[data-tid="logo"]')).not.toBeNull();
		expect(headerRow!.querySelector('[data-tid="badge"]')).not.toBeNull();
	});
});
