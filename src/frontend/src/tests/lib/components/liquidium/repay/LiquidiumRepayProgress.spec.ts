import LiquidiumRepayProgress from '$lib/components/liquidium/repay/LiquidiumRepayProgress.svelte';
import { ProgressStepsLiquidiumRepay } from '$lib/enums/progress-steps';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('LiquidiumRepayProgress', () => {
	it('renders the repay progress steps', () => {
		const { container } = render(LiquidiumRepayProgress, {
			props: { repayProgressStep: ProgressStepsLiquidiumRepay.INITIALIZATION }
		});

		expect(container).toHaveTextContent(en.send.text.initializing);
		expect(container).toHaveTextContent(en.liquidium.text.starting_to_repay);
		expect(container).toHaveTextContent(en.liquidium.text.repay_started);
	});
});