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

		expect(headerRow!.querySelector('[data-tid="logo"]')).not.toBeNull();
		expect(headerRow!.querySelector('[data-tid="badge"]')).not.toBeNull();
	});
});
