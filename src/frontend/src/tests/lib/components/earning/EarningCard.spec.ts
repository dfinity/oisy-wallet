import { goto } from '$app/navigation';
import EarningCard from '$lib/components/earning/EarningCard.svelte';
import { AppPath } from '$lib/constants/routes.constants';
import { EARNING_CARD } from '$lib/constants/test-ids.constants';
import { Currency } from '$lib/enums/currency';
import { Languages } from '$lib/enums/languages';
import { formatCurrency, formatStakeApyNumber } from '$lib/utils/format.utils';
import { replacePlaceholders, resolveText } from '$lib/utils/i18n.utils';
import en from '$tests/mocks/i18n.mock';
import { mockProviderUi } from '$tests/mocks/providers-ui.mock';
import { render } from '@testing-library/svelte';

vi.mock(import('$app/navigation'), async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		goto: vi.fn()
	};
});

describe('EarningCard', () => {
	const props = {
		provider: mockProviderUi
	};

	it('should render the provider logo', () => {
		const { getByAltText } = render(EarningCard, { props });

		expect(
			getByAltText(replacePlaceholders(en.core.alt.logo, { $name: mockProviderUi.name }))
		).toBeInTheDocument();
	});

	it('should render the provider title', () => {
		const { getByText } = render(EarningCard, { props });

		mockProviderUi.card.titles.forEach((title) => {
			expect(getByText(resolveText({ i18n: en, path: title }))).toBeInTheDocument();
		});
	});

	it('should render the tag with max APY', () => {
		const { getByText } = render(EarningCard, { props });

		expect(getByText(`${formatStakeApyNumber(mockProviderUi.maxApy)}%`)).toBeInTheDocument();
	});

	it('should render the list of tokens and networks', () => {
		const { getByText } = render(EarningCard, { props });

		expect(getByText(mockProviderUi.tokens[0].symbol, { exact: false })).toBeInTheDocument();
		expect(getByText('•')).toBeInTheDocument();
		expect(getByText(mockProviderUi.tokens[0].network.name, { exact: false })).toBeInTheDocument();
	});

	it('should render total earning per year', () => {
		const expected = replacePlaceholders(en.stake.text.active_earning_per_year, {
			$amount: `${formatCurrency({
				value: mockProviderUi.totalEarningPerYear,
				currency: Currency.USD,
				exchangeRate: {
					currency: Currency.USD,
					exchangeRateToUsd: 1,
					exchangeRate24hChangeMultiplier: 1
				},
				language: Languages.ENGLISH
			})}`
		});

		const { getByText } = render(EarningCard, { props });

		expect(getByText(expected)).toBeInTheDocument();
	});

	it('should render total earning position', () => {
		const expected =
			formatCurrency({
				value: mockProviderUi.totalPositionUsd,
				currency: Currency.USD,
				exchangeRate: {
					currency: Currency.USD,
					exchangeRateToUsd: 1,
					exchangeRate24hChangeMultiplier: 1
				},
				language: Languages.ENGLISH
			}) ?? '';

		const { getByText } = render(EarningCard, { props });

		expect(getByText(expected)).toBeInTheDocument();
	});

	it('should render the logo button', () => {
		const { getByTestId } = render(EarningCard, { props });

		expect(getByTestId(`${EARNING_CARD}-${mockProviderUi.name}`)).toBeInTheDocument();
	});

	it('should trigger the action when clicked', () => {
		const { getByTestId } = render(EarningCard, { props });

		const button = getByTestId(`${EARNING_CARD}-${mockProviderUi.name}`) as HTMLButtonElement;

		button.click();

		expect(goto).toHaveBeenCalledExactlyOnceWith(AppPath.EarnGold);
	});
});
