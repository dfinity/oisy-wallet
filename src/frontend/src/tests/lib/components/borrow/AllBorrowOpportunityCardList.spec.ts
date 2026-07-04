import * as navModule from '$app/navigation';
import AllBorrowOpportunityCardList from '$lib/components/borrow/AllBorrowOpportunityCardList.svelte';
import * as borrowDerived from '$lib/derived/borrow.derived';
import * as borrowRegistry from '$lib/providers/borrow.providers';
import { i18n } from '$lib/stores/i18n.store';
import {
	mockLiquidiumBorrowProvider,
	mockLiquidiumBorrowProviderData
} from '$tests/mocks/earning-providers.mock';
import { render, screen } from '@testing-library/svelte';
import { get, readable } from 'svelte/store';

describe('AllBorrowOpportunityCardList', () => {
	beforeEach(() => {
		vi.resetAllMocks();

		vi.spyOn(borrowRegistry, 'borrowProviders', 'get').mockReturnValue([
			mockLiquidiumBorrowProvider
		]);

		vi.spyOn(borrowDerived, 'borrowData', 'get').mockReturnValue(
			readable({
				liquidium: {
					...mockLiquidiumBorrowProviderData,
					action: () => navModule.goto('/borrow/liquidium/')
				}
			})
		);

		vi.spyOn(navModule, 'goto').mockResolvedValue();
	});

	it('renders borrow cards from matching provider data', () => {
		render(AllBorrowOpportunityCardList);

		expect(screen.getByText('mock.liquidium.title')).toBeInTheDocument();
		expect(screen.getByText('mock.liquidium.description')).toBeInTheDocument();
	});

	it('renders the borrow APY badge framing', () => {
		const { container } = render(AllBorrowOpportunityCardList);

		expect(screen.getByText(get(i18n).borrow.text.borrow_apr_from)).toBeInTheDocument();
		expect(container.querySelector('.text-warning-primary')).toHaveTextContent('4.5%');
	});

	it('renders the card action button with the configured text', () => {
		render(AllBorrowOpportunityCardList);

		const buttons = screen
			.getAllByRole('button')
			.filter((btn) => btn.getAttribute('type') === 'submit');

		expect(buttons).toHaveLength(1);
		expect(buttons[0]).toHaveTextContent('mock.liquidium.action');
	});

	it('calls goto when a card action button is clicked', async () => {
		render(AllBorrowOpportunityCardList);

		const buttons = screen
			.getAllByRole('button')
			.filter((btn) => btn.getAttribute('type') === 'submit');

		expect(buttons).toHaveLength(1);

		await buttons[0].click();

		expect(navModule.goto).toHaveBeenCalledExactlyOnceWith('/borrow/liquidium/');
	});

	it('omits providers without derived borrow data', () => {
		vi.spyOn(borrowDerived, 'borrowData', 'get').mockReturnValue(readable({}));

		render(AllBorrowOpportunityCardList);

		expect(screen.queryByText('mock.liquidium.title')).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'mock.liquidium.action' })).not.toBeInTheDocument();
	});
});
