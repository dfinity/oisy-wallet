import HarvestAutopilotInfoBox from '$eth/components/stake/harvest-autopilot/HarvestAutopilotInfoBox.svelte';
import { stakeProvidersConfig } from '$lib/config/stake.config';
import { StakeProvider } from '$lib/types/stake';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('HarvestAutopilotInfoBox', () => {
	it('should render the title', () => {
		const { getByText } = render(HarvestAutopilotInfoBox);

		expect(getByText(en.stake.info.harvest_autopilot.title)).toBeInTheDocument();
	});

	it('should render the description', () => {
		const { getByText } = render(HarvestAutopilotInfoBox);

		expect(getByText(en.stake.info.harvest_autopilot.description)).toBeInTheDocument();
	});

	it('should render the provider logo', () => {
		const { getByRole } = render(HarvestAutopilotInfoBox);

		const img = getByRole('presentation');

		expect(img).toHaveAttribute('src', stakeProvidersConfig[StakeProvider.HARVEST_AUTOPILOTS].logo);
	});

	it('should render the external link with correct href', () => {
		const { getByRole } = render(HarvestAutopilotInfoBox);

		const link = getByRole('link', {
			name: stakeProvidersConfig[StakeProvider.HARVEST_AUTOPILOTS].name
		});

		expect(link).toHaveAttribute(
			'href',
			stakeProvidersConfig[StakeProvider.HARVEST_AUTOPILOTS].url
		);
	});

	it('should render the visit provider text', () => {
		const { getByText } = render(HarvestAutopilotInfoBox);

		expect(getByText(en.stake.text.visit_provider)).toBeInTheDocument();
	});

	it('should render all three fact boxes', () => {
		const { getByText } = render(HarvestAutopilotInfoBox);

		expect(getByText(en.stake.info.harvest_autopilot.fact_1_title)).toBeInTheDocument();
		expect(getByText(en.stake.info.harvest_autopilot.fact_1_description)).toBeInTheDocument();

		expect(getByText(en.stake.info.harvest_autopilot.fact_2_title)).toBeInTheDocument();
		expect(getByText(en.stake.info.harvest_autopilot.fact_2_description)).toBeInTheDocument();

		expect(getByText(en.stake.info.harvest_autopilot.fact_3_title)).toBeInTheDocument();
		expect(getByText(en.stake.info.harvest_autopilot.fact_3_description)).toBeInTheDocument();
	});
});
