import { goto } from '$app/navigation';
import GoToTradeButton from '$lib/components/trading/GoToTradeButton.svelte';
import { AppPath } from '$lib/constants/routes.constants';
import { TRADING_GOTO_BUTTON } from '$lib/constants/test-ids.constants';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

vi.mock(import('$app/navigation'), async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		goto: vi.fn()
	};
});

describe('GoToTradeButton', () => {
	it('should render the label', () => {
		const { getByText } = render(GoToTradeButton);

		expect(getByText(en.trading.text.go_to_trade)).toBeInTheDocument();
	});

	it('should render the icon', () => {
		const { container } = render(GoToTradeButton);

		expect(container.querySelector('svg')).toBeInTheDocument();
	});

	it('should redirect to the OISY Trade provider page when clicked', () => {
		const { getByTestId } = render(GoToTradeButton);

		const button = getByTestId(TRADING_GOTO_BUTTON) as HTMLButtonElement;

		button.click();

		expect(goto).toHaveBeenCalledExactlyOnceWith(AppPath.ProvidersOisyTrade);
	});
});
