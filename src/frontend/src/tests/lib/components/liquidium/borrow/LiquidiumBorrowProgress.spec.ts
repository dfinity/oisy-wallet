import LiquidiumBorrowProgress from '$lib/components/liquidium/borrow/LiquidiumBorrowProgress.svelte';
import { ProgressStepsLiquidiumBorrow } from '$lib/enums/progress-steps';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('LiquidiumBorrowProgress', () => {
	it('renders the borrow progress steps', () => {
		const { container } = render(LiquidiumBorrowProgress, {
			props: { borrowProgressStep: ProgressStepsLiquidiumBorrow.INITIALIZATION }
		});

		expect(container).toHaveTextContent(en.send.text.initializing);
		expect(container).toHaveTextContent(en.liquidium.text.starting_to_borrow);
		expect(container).toHaveTextContent(en.liquidium.text.borrow_started);
	});
});
