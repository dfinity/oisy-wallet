import HarvestStakeProvider from '$eth/components/stake/harvest-autopilot/HarvestStakeProvider.svelte';
import { stakeProvidersConfig } from '$lib/config/stake.config';
import {
	STAKE_PROVIDER_EXTERNAL_URL,
	STAKE_PROVIDER_LOGO
} from '$lib/constants/test-ids.constants';
import { StakeProvider } from '$lib/types/stake';
import { formatStakeApyNumber } from '$lib/utils/format.utils';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('HarvestStakeProvider', () => {
	const mockApy = 5.25;

	it('should render the provider logo', () => {
		const { getByTestId } = render(HarvestStakeProvider, {
			props: { apy: mockApy }
		});

		expect(getByTestId(STAKE_PROVIDER_LOGO)).toBeInTheDocument();
	});

	it('should render the provider external link', () => {
		const { getByTestId } = render(HarvestStakeProvider, {
			props: { apy: mockApy }
		});

		const link = getByTestId(STAKE_PROVIDER_EXTERNAL_URL);

		expect(link).toHaveAttribute(
			'href',
			stakeProvidersConfig[StakeProvider.HARVEST_AUTOPILOTS].url
		);
	});

	it('should render the current APY label with formatted value', () => {
		const { getByText } = render(HarvestStakeProvider, {
			props: { apy: mockApy }
		});

		expect(
			getByText(`${en.stake.text.current_apy_label} ${formatStakeApyNumber(mockApy)}%`)
		).toBeInTheDocument();
	});

	it('should render the provider description', () => {
		const { getByText } = render(HarvestStakeProvider, {
			props: { apy: mockApy }
		});

		expect(getByText(en.stake.text.harvest_autopilot_provider_description)).toBeInTheDocument();
	});

	it('should render the visit provider text', () => {
		const { getByText } = render(HarvestStakeProvider, {
			props: { apy: mockApy }
		});

		expect(getByText(en.stake.text.visit_provider)).toBeInTheDocument();
	});

	it('should render the provider name', () => {
		const { container } = render(HarvestStakeProvider, {
			props: { apy: mockApy }
		});

		expect(container).toHaveTextContent(
			stakeProvidersConfig[StakeProvider.HARVEST_AUTOPILOTS].description
		);
	});
});
