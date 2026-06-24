import LiquidiumSupplyProgress from '$lib/components/liquidium/supply/LiquidiumSupplyProgress.svelte';
import { ProgressStepsLiquidiumSupply } from '$lib/enums/progress-steps';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('LiquidiumSupplyProgress', () => {
	it('renders the supply progress steps', () => {
		const { container } = render(LiquidiumSupplyProgress, {
			props: { supplyProgressStep: ProgressStepsLiquidiumSupply.INITIALIZATION }
		});

		expect(container).toHaveTextContent(en.send.text.initializing);
		expect(container).toHaveTextContent(en.liquidium.text.starting_to_supply);
		expect(container).toHaveTextContent(en.liquidium.text.supply_started);
	});
});
