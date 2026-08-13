import TradingDepositProgress from '$lib/components/trading/TradingDepositProgress.svelte';
import { ProgressStepsTradingDeposit } from '$lib/enums/progress-steps';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('TradingDepositProgress', () => {
	it('should render all deposit progress steps', () => {
		const { getByText } = render(TradingDepositProgress, {
			props: { depositProgressStep: ProgressStepsTradingDeposit.INITIALIZATION }
		});

		expect(getByText(en.send.text.initializing)).toBeInTheDocument();
		expect(getByText(en.trading.deposit.approving)).toBeInTheDocument();
		expect(getByText(en.trading.deposit.depositing)).toBeInTheDocument();
		expect(getByText(en.send.text.refreshing_ui)).toBeInTheDocument();
	});
});
