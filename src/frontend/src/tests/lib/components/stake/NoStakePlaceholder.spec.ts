import NoStakePlaceholder from '$lib/components/stake/NoStakePlaceholder.svelte';
import * as earningDerived from '$lib/derived/earning.derived';
import { Currency } from '$lib/enums/currency';
import { Languages } from '$lib/enums/languages';
import { formatCurrency } from '$lib/utils/format.utils';
import en from '$tests/mocks/i18n.mock';
import { assertNonNullish } from '@dfinity/utils';
import { render } from '@testing-library/svelte';
import { readable } from 'svelte/store';

describe('NoStakePlaceholder', () => {
	const threshold = 20;

	const mockApy = 12;

	beforeEach(() => {
		vi.clearAllMocks();

		vi.spyOn(earningDerived, 'highestApyEarning', 'get').mockReturnValue(readable(mockApy));
	});

	it('should render the description by default', () => {
		const { getByText } = render(NoStakePlaceholder);

		expect(getByText(en.stake.text.description_empty)).toBeInTheDocument();
	});

	it('should hide the description if hideDescription is true', () => {
		const { queryByText } = render(NoStakePlaceholder, { props: { hideDescription: true } });

		expect(queryByText(en.stake.text.description_empty)).not.toBeInTheDocument();
	});

	it('should render the correct message when highest potential earning is below the threshold', () => {
		const mockPotential = threshold - 5;

		vi.spyOn(earningDerived, 'highestEarningPotentialUsd', 'get').mockReturnValue(
			readable(mockPotential)
		);

		const { getByText } = render(NoStakePlaceholder);

		expect(getByText(en.stake.text.title_empty_1)).toBeInTheDocument();
		expect(getByText(en.stake.text.title_empty_2_apy)).toBeInTheDocument();
		expect(getByText(`${mockApy}%`)).toBeInTheDocument();
	});

	it('should render the correct message when highest potential earning is above the threshold', () => {
		const mockPotential = threshold + 5;

		vi.spyOn(earningDerived, 'highestEarningPotentialUsd', 'get').mockReturnValue(
			readable(mockPotential)
		);

		const { getByText } = render(NoStakePlaceholder);

		const expected = formatCurrency({
			value: mockPotential,
			currency: Currency.USD,
			exchangeRate: {
				currency: Currency.USD,
				exchangeRateToUsd: 1,
				exchangeRate24hChangeMultiplier: 1
			},
			language: Languages.ENGLISH
		});

		assertNonNullish(expected);

		expect(getByText(en.stake.text.title_empty_1)).toBeInTheDocument();
		expect(getByText(en.stake.text.title_empty_2_usd)).toBeInTheDocument();
		expect(getByText(expected)).toBeInTheDocument();
	});

	it('should render the correct message when highest potential earning is the same as the threshold', () => {
		vi.spyOn(earningDerived, 'highestEarningPotentialUsd', 'get').mockReturnValue(
			readable(threshold)
		);

		const { getByText } = render(NoStakePlaceholder);

		const expected = formatCurrency({
			value: threshold,
			currency: Currency.USD,
			exchangeRate: {
				currency: Currency.USD,
				exchangeRateToUsd: 1,
				exchangeRate24hChangeMultiplier: 1
			},
			language: Languages.ENGLISH
		});

		assertNonNullish(expected);

		expect(getByText(en.stake.text.title_empty_1)).toBeInTheDocument();
		expect(getByText(en.stake.text.title_empty_2_usd)).toBeInTheDocument();
		expect(getByText(expected)).toBeInTheDocument();
	});
});
