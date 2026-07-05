import LiquidiumInfoBox from '$lib/components/liquidium/LiquidiumInfoBox.svelte';
import { lendBorrowProvidersConfig } from '$lib/config/lend-borrow.config';
import { LendBorrowProvider } from '$lib/types/lend-borrow';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('LiquidiumInfoBox', () => {
	const liquidium = lendBorrowProvidersConfig[LendBorrowProvider.LIQUIDIUM];

	it('should render the title', () => {
		const { getByText } = render(LiquidiumInfoBox);

		expect(getByText(en.liquidium.info.title)).toBeInTheDocument();
	});

	it('should render the description', () => {
		const { getByText } = render(LiquidiumInfoBox);

		expect(getByText(en.liquidium.info.description)).toBeInTheDocument();
	});

	it('should render the provider logo', () => {
		const { getByRole } = render(LiquidiumInfoBox);

		const img = getByRole('presentation');

		expect(img).toHaveAttribute('src', liquidium.logo);
	});

	it('should render the external link with correct href', () => {
		const { getByRole } = render(LiquidiumInfoBox);

		const link = getByRole('link', { name: liquidium.name });

		expect(link).toHaveAttribute('href', liquidium.url);
	});

	it('should render the visit provider text', () => {
		const { getByText } = render(LiquidiumInfoBox);

		expect(getByText(en.stake.text.visit_provider)).toBeInTheDocument();
	});

	it('should render all three fact boxes', () => {
		const { getByText } = render(LiquidiumInfoBox);

		expect(getByText(en.liquidium.info.fact_1_title)).toBeInTheDocument();
		expect(getByText(en.liquidium.info.fact_1_description)).toBeInTheDocument();

		expect(getByText(en.liquidium.info.fact_2_title)).toBeInTheDocument();
		expect(getByText(en.liquidium.info.fact_2_description)).toBeInTheDocument();

		expect(getByText(en.liquidium.info.fact_3_title)).toBeInTheDocument();
		expect(getByText(en.liquidium.info.fact_3_description)).toBeInTheDocument();
	});
});
