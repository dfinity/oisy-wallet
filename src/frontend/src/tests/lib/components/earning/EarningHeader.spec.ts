import EarningHeader from '$lib/components/earning/EarningHeader.svelte';
import { i18n } from '$lib/stores/i18n.store';
import { render, screen } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('EarningHeader', () => {
	it('renders header title', () => {
		render(EarningHeader);

		expect(screen.getByText(get(i18n).earning.text.header_title)).toBeInTheDocument();
	});

	it('renders header description', () => {
		render(EarningHeader);

		expect(screen.getByText(get(i18n).earning.text.header_description)).toBeInTheDocument();
	});

	it('renders the potential card', () => {
		render(EarningHeader);

		expect(screen.getByText(get(i18n).stake.text.earning_potential)).toBeInTheDocument();
	});

	it('renders the position card', () => {
		render(EarningHeader);

		expect(screen.getByText(get(i18n).stake.text.active_earning)).toBeInTheDocument();
	});
});
