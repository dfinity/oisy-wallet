import WithdrawProgress from '$lib/components/trading/WithdrawProgress.svelte';
import { ProgressStepsTradingWithdraw } from '$lib/enums/progress-steps';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('WithdrawProgress', () => {
	it('renders the withdraw progress steps', () => {
		const symbol = 'STK';

		const { container } = render(WithdrawProgress, {
			props: {
				withdrawProgressStep: ProgressStepsTradingWithdraw.INITIALIZATION,
				symbol
			}
		});

		expect(container).toHaveTextContent(en.send.text.initializing);
		expect(container).toHaveTextContent(
			replacePlaceholders(en.trading.withdraw.progress_withdraw, { $symbol: symbol })
		);
		expect(container).toHaveTextContent(en.send.text.refreshing_ui);
	});
});
