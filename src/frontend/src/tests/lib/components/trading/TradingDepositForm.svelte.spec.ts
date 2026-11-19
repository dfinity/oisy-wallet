import type { IcToken } from '$icp/types/ic-token';
import TradingDepositForm from '$lib/components/trading/TradingDepositForm.svelte';
import {
	TOKEN_INPUT_CURRENCY_TOKEN,
	TRADING_DEPOSIT_FORM_REVIEW_BUTTON
} from '$lib/constants/test-ids.constants';
import { balancesStore } from '$lib/stores/balances.store';
import * as deviceUtils from '$lib/utils/device.utils';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { fireEvent, render } from '@testing-library/svelte';
import type { MockInstance } from 'vitest';

describe('TradingDepositForm', () => {
	const token: IcToken = { ...mockValidIcToken, symbol: 'ICP', decimals: 8, fee: 10000n };

	const baseProps = {
		token,
		amount: undefined,
		amountSetToMax: false,
		onSelectToken: () => {},
		onClose: () => {},
		onNext: () => {}
	};

	beforeEach(() => {
		// Give the wallet a balance that comfortably covers the amounts used below;
		// without it the deposit validation treats the balance as zero.
		balancesStore.set({ id: token.id, data: { data: 100_000_000_000n, certified: true } });
	});

	afterEach(() => {
		balancesStore.reset(token.id);
	});

	it('should render the deposit title and provider name', () => {
		const { getByText } = render(TradingDepositForm, { props: { ...baseProps } });

		expect(getByText(en.trading.deposit.you_deposit)).toBeInTheDocument();
		expect(getByText(en.trading.text.provider_name)).toBeInTheDocument();
	});

	it('should render the OISY Trade logo, hidden from assistive tech', () => {
		const { container } = render(TradingDepositForm, { props: { ...baseProps } });

		const mark = container.querySelector('[aria-label="OISY Trade"]');

		expect(mark).toBeInTheDocument();
		// Decorative next to its own text label: must stay inside an aria-hidden
		// wrapper so screen readers don't announce "OISY Trade" twice.
		expect(mark?.closest('[aria-hidden="true"]')).not.toBeNull();
	});

	it('should disable the review button when there is no amount', () => {
		const { getByTestId } = render(TradingDepositForm, { props: { ...baseProps } });

		expect(getByTestId(TRADING_DEPOSIT_FORM_REVIEW_BUTTON)).toBeDisabled();
	});

	it('should keep the review button disabled with a zero amount', () => {
		const { getByTestId } = render(TradingDepositForm, {
			props: { ...baseProps, amount: 0 }
		});

		expect(getByTestId(TRADING_DEPOSIT_FORM_REVIEW_BUTTON)).toBeDisabled();
	});

	it('should enable the review button with a valid amount', () => {
		const { getByTestId } = render(TradingDepositForm, {
			props: { ...baseProps, amount: 5 }
		});

		expect(getByTestId(TRADING_DEPOSIT_FORM_REVIEW_BUTTON)).toBeEnabled();
	});

	it('should disable the review button and show an error when the amount exceeds the wallet balance', () => {
		balancesStore.set({ id: token.id, data: { data: 100_000_000n, certified: true } });

		const { getByTestId, getByText } = render(TradingDepositForm, {
			props: { ...baseProps, amount: 5 }
		});

		expect(getByTestId(TRADING_DEPOSIT_FORM_REVIEW_BUTTON)).toBeDisabled();
		expect(getByText(en.trading.deposit.error_insufficient_balance)).toBeInTheDocument();
	});

	it('should render without a token selected', () => {
		const { getByText } = render(TradingDepositForm, {
			props: { ...baseProps, token: undefined }
		});

		expect(getByText(en.trading.deposit.you_deposit)).toBeInTheDocument();
	});

	it('should call onNext when the enabled review button is clicked', async () => {
		const onNext = vi.fn();

		const { getByTestId } = render(TradingDepositForm, {
			props: { ...baseProps, amount: 5, onNext }
		});

		await fireEvent.click(getByTestId(TRADING_DEPOSIT_FORM_REVIEW_BUTTON));

		expect(onNext).toHaveBeenCalledOnce();
	});

	describe('amount input autofocus', () => {
		let isDesktopSpy: MockInstance<typeof deviceUtils.isDesktop>;

		beforeEach(() => {
			isDesktopSpy = vi.spyOn(deviceUtils, 'isDesktop');
		});

		afterEach(() => {
			isDesktopSpy.mockRestore();
		});

		it('should auto-focus the amount input on desktop when a token is selected', () => {
			isDesktopSpy.mockReturnValue(true);

			const { getByTestId } = render(TradingDepositForm, { props: { ...baseProps } });

			expect(getByTestId(TOKEN_INPUT_CURRENCY_TOKEN)).toHaveFocus();
		});

		it('should not auto-focus the amount input on mobile', () => {
			isDesktopSpy.mockReturnValue(false);

			const { getByTestId } = render(TradingDepositForm, { props: { ...baseProps } });

			expect(getByTestId(TOKEN_INPUT_CURRENCY_TOKEN)).not.toHaveFocus();
		});

		it('should not auto-focus when no token is selected', () => {
			isDesktopSpy.mockReturnValue(true);

			const { queryByTestId } = render(TradingDepositForm, {
				props: { ...baseProps, token: undefined }
			});

			expect(queryByTestId(TOKEN_INPUT_CURRENCY_TOKEN)).not.toBeInTheDocument();
		});
	});
});
