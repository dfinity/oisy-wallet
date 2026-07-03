import * as navModule from '$app/navigation';
import AllEarningOpportunityCardList from '$lib/components/earning/AllEarningOpportunityCardList.svelte';
import * as earningDerived from '$lib/derived/earning.derived';
import * as earningRegistry from '$lib/providers/earning.providers';
import { mockHarvestProvider, mockHarvestProviderData } from '$tests/mocks/earning-providers.mock';
import { render, screen } from '@testing-library/svelte';
import { readable } from 'svelte/store';

describe('AllEarningOpportunityCardList', () => {
	beforeEach(() => {
		vi.resetAllMocks();

		vi.spyOn(earningRegistry, 'earningProviders', 'get').mockReturnValue([mockHarvestProvider]);

		vi.spyOn(earningDerived, 'earningData', 'get').mockReturnValue(
			readable({
				'harvest-autopilot': {
					...mockHarvestProviderData,
					action: () => navModule.goto('/earn/autopilot/')
				}
			})
		);

		vi.spyOn(navModule, 'goto').mockResolvedValue();
	});

	it('renders earning cards', () => {
		render(AllEarningOpportunityCardList);

		expect(screen.getByText('mock.harvest.title')).toBeInTheDocument();
		expect(screen.getByText('mock.harvest.description')).toBeInTheDocument();
	});

	it('renders all card buttons with correct text', () => {
		render(AllEarningOpportunityCardList);

		const buttons = screen
			.getAllByRole('button')
			.filter((btn) => btn.getAttribute('type') === 'submit');

		expect(buttons).toHaveLength(1);
		expect(buttons[0]).toHaveTextContent('mock.harvest.action');
	});

	it('calls goto when a card action button is clicked', async () => {
		render(AllEarningOpportunityCardList);

		const buttons = screen
			.getAllByRole('button')
			.filter((btn) => btn.getAttribute('type') === 'submit');

		expect(buttons).toHaveLength(1);

		for (const btn of buttons) {
			await btn.click();
		}

		expect(navModule.goto).toHaveBeenCalledOnce();
	});
});
