import GldtInfoBox from '$icp/components/stake/gldt/GldtInfoBox.svelte';
import { render, screen } from '@testing-library/svelte';
import { get, writable } from 'svelte/store';

import { GLDT_STAKE_CONTEXT_KEY } from '$icp/stores/gldt-stake.store';
import { i18n } from '$lib/stores/i18n.store';
import { formatStakeApyNumber } from '$lib/utils/format.utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';

const renderWithStakeContext = (apy?: number) => {
	const mockStore = writable({
		apy,
		position: { staked: 10n }
	});

	const mockContext = new Map([
		[GLDT_STAKE_CONTEXT_KEY, { store: { subscribe: mockStore.subscribe } }]
	]);

	return render(GldtInfoBox, { context: mockContext });
};

describe('GldtInfoBox', () => {
	it('renders info title and description', () => {
		renderWithStakeContext(5);

		expect(screen.getByText(get(i18n).stake.info.gldt.title)).toBeInTheDocument();

		expect(screen.getByText(get(i18n).stake.info.gldt.description)).toBeInTheDocument();
	});

	it('renders fact titles and descriptions', () => {
		renderWithStakeContext(5);

		expect(screen.getByText(get(i18n).stake.info.gldt.fact_1_title)).toBeInTheDocument();
		expect(screen.getByText(get(i18n).stake.info.gldt.fact_1_description)).toBeInTheDocument();

		expect(screen.getByText(get(i18n).stake.info.gldt.fact_2_title)).toBeInTheDocument();
		expect(screen.getByText(get(i18n).stake.info.gldt.fact_2_description)).toBeInTheDocument();

		expect(screen.getByText(get(i18n).stake.info.gldt.fact_3_title)).toBeInTheDocument();
		expect(screen.getByText(get(i18n).stake.info.gldt.fact_3_description)).toBeInTheDocument();
	});

	it('renders APY replaced text when APY exists', () => {
		const apy = 7;
		renderWithStakeContext(apy);

		const expectedText = replacePlaceholders(get(i18n).stake.info.gldt.fact_3_description, {
			$apy: `${formatStakeApyNumber(apy)}`
		});

		expect(screen.getByText(expectedText)).toBeInTheDocument();
	});

	it('renders fallback description when APY is missing', () => {
		renderWithStakeContext(undefined);

		expect(
			screen.getByText(get(i18n).stake.info.gldt.fact_3_description_fallback)
		).toBeInTheDocument();
	});
});
