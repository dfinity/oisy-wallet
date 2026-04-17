import { EarningCardFields } from '$env/types/env.earning-cards';
import DefaultEarningOpportunityCard from '$lib/components/earning/DefaultEarningOpportunityCard.svelte';
import { i18n } from '$lib/stores/i18n.store';
import * as formatUtils from '$lib/utils/format.utils';
import { render, screen } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('DefaultEarningOpportunityCard', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		vi.spyOn(formatUtils, 'formatCurrency').mockImplementation(({ value }) => `$${value}`);
	});

	const mockCardData = {
		id: 'gldt-staking',
		titles: ['mock.card.title'],
		description: 'mock.card.description',
		logo: '/mock/logo.svg',
		fields: [
			EarningCardFields.APY,
			EarningCardFields.CURRENT_STAKED,
			EarningCardFields.CURRENT_EARNING,
			EarningCardFields.EARNING_POTENTIAL,
			EarningCardFields.TERMS
		],
		actionText: 'mock.card.action'
	};

	const mockAction = vi.fn().mockResolvedValue(undefined);

	const mockCardFields = {
		[EarningCardFields.APY]: '5.00',
		[EarningCardFields.CURRENT_STAKED]: '100 GLDT',
		[EarningCardFields.CURRENT_EARNING]: 50,
		[EarningCardFields.EARNING_POTENTIAL]: 200,
		[EarningCardFields.TERMS]: 'earning.terms.flexible',
		action: mockAction
	};

	it('renders the logo, title and description', () => {
		render(DefaultEarningOpportunityCard, {
			cardData: mockCardData,
			cardFields: mockCardFields
		});

		expect(screen.getByText('mock.card.title')).toBeInTheDocument();
		expect(screen.getByText('mock.card.description')).toBeInTheDocument();
	});

	it('renders the APY badge correctly', () => {
		render(DefaultEarningOpportunityCard, {
			cardData: mockCardData,
			cardFields: mockCardFields
		});

		expect(screen.getByText(get(i18n).stake.text.max_apy_label)).toBeInTheDocument();
		expect(screen.getAllByText('5.00%').length).toBeGreaterThanOrEqual(1);
	});

	it('renders normal list fields correctly', () => {
		render(DefaultEarningOpportunityCard, {
			cardData: mockCardData,
			cardFields: mockCardFields
		});

		expect(screen.getByText('100 GLDT')).toBeInTheDocument();
		expect(screen.getByText(get(i18n).earning.terms.flexible)).toBeInTheDocument();
	});

	it('renders yearly amount fields using EarningYearlyAmount', () => {
		render(DefaultEarningOpportunityCard, {
			cardData: mockCardData,
			cardFields: mockCardFields
		});

		expect(screen.getByText('+ $50/year')).toBeInTheDocument();
		expect(screen.getByText('+ $200/year')).toBeInTheDocument();
	});

	it('renders dash when a field is missing', () => {
		const fieldsMissing = {
			...mockCardFields,
			[EarningCardFields.CURRENT_STAKED]: undefined
		};

		render(DefaultEarningOpportunityCard, {
			cardData: mockCardData,
			cardFields: fieldsMissing
		});

		expect(screen.getAllByText('-').length).toBeGreaterThan(0);
	});

	it('renders button with correct action text', () => {
		render(DefaultEarningOpportunityCard, {
			cardData: mockCardData,
			cardFields: mockCardFields
		});

		expect(screen.getByRole('button')).toHaveTextContent('mock.card.action');
	});

	it('calls action() when button is clicked', async () => {
		render(DefaultEarningOpportunityCard, {
			cardData: mockCardData,
			cardFields: mockCardFields
		});

		const btn = screen.getByRole('button');
		await btn.click();

		expect(mockAction).toHaveBeenCalledOnce();
	});

	describe('NETWORKS and ASSETS fields', () => {
		const cardDataWithIcons = {
			...mockCardData,
			fields: [EarningCardFields.NETWORKS, EarningCardFields.ASSETS]
		};

		it('renders a dash when the icons array is empty', () => {
			render(DefaultEarningOpportunityCard, {
				cardData: cardDataWithIcons,
				cardFields: {
					...mockCardFields,
					[EarningCardFields.NETWORKS]: [],
					[EarningCardFields.ASSETS]: []
				}
			});

			expect(screen.getAllByText('-').length).toBeGreaterThanOrEqual(2);
		});

		it('does not render a dash when icons are provided', () => {
			render(DefaultEarningOpportunityCard, {
				cardData: cardDataWithIcons,
				cardFields: {
					...mockCardFields,
					[EarningCardFields.NETWORKS]: ['/icon-eth.svg'],
					[EarningCardFields.ASSETS]: ['/icon-usdc.svg']
				}
			});

			expect(screen.queryByText('-')).toBeNull();
		});
	});

	describe('disabled state', () => {
		it('disables the button when disabled is true', () => {
			render(DefaultEarningOpportunityCard, {
				cardData: mockCardData,
				cardFields: { ...mockCardFields, disabled: true }
			});

			expect(screen.getByRole('button')).toBeDisabled();
		});

		it('does not disable the button when disabled is false', () => {
			render(DefaultEarningOpportunityCard, {
				cardData: mockCardData,
				cardFields: { ...mockCardFields, disabled: false }
			});

			expect(screen.getByRole('button')).not.toBeDisabled();
		});

		it('shows disabledNotice text when set', () => {
			render(DefaultEarningOpportunityCard, {
				cardData: mockCardData,
				cardFields: {
					...mockCardFields,
					disabled: true,
					disabledNotice: 'earning.cards.harvest_autopilot.no_networks_enabled'
				}
			});

			expect(
				screen.getByText(get(i18n).earning.cards.harvest_autopilot.no_networks_enabled)
			).toBeInTheDocument();
		});

		it('does not show notice text when disabledNotice is not set', () => {
			render(DefaultEarningOpportunityCard, {
				cardData: mockCardData,
				cardFields: mockCardFields
			});

			expect(
				screen.queryByText(get(i18n).earning.cards.harvest_autopilot.no_networks_enabled)
			).toBeNull();
		});
	});
});
