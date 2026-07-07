import type { IcToken } from '$icp/types/ic-token';
import TradingDepositForm from '$lib/components/trading/TradingDepositForm.svelte';
import {
	TRADING_DEPOSIT_CONSENT_CHECKBOX,
	TRADING_DEPOSIT_FORM_REVIEW_BUTTON
} from '$lib/constants/test-ids.constants';
import { balancesStore } from '$lib/stores/balances.store';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { fireEvent, render } from '@testing-library/svelte';

describe('TradingDepositForm', () => {
	const token: IcToken = { ...mockValidIcToken, symbol: 'ICP', decimals: 8, fee: 10000n };

	const baseProps = {
		token,
		amount: undefined,
		amountSetToMax: false,
		consent: false,
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

	it('should render the deposit title, provider name and consent text', () => {
		const { getByText } = render(TradingDepositForm, { props: { ...baseProps } });

		expect(getByText(en.trading.deposit.you_deposit)).toBeInTheDocument();
		expect(getByText(en.trading.text.provider_name)).toBeInTheDocument();
		expect(getByText(en.trading.deposit.consent)).toBeInTheDocument();
	});

	it('should disable the review button when there is no consent', () => {
		const { getByTestId } = render(TradingDepositForm, { props: { ...baseProps } });

		expect(getByTestId(TRADING_DEPOSIT_FORM_REVIEW_BUTTON)).toBeDisabled();
	});

	it('should keep the review button disabled with consent but no amount', () => {
		const { getByTestId } = render(TradingDepositForm, {
			props: { ...baseProps, consent: true }
		});

		expect(getByTestId(TRADING_DEPOSIT_FORM_REVIEW_BUTTON)).toBeDisabled();
	});

	it('should keep the review button disabled with consent but a zero amount', () => {
		const { getByTestId } = render(TradingDepositForm, {
			props: { ...baseProps, consent: true, amount: 0 }
		});

		expect(getByTestId(TRADING_DEPOSIT_FORM_REVIEW_BUTTON)).toBeDisabled();
	});

	it('should enable the review button with consent and a valid amount', () => {
		const { getByTestId } = render(TradingDepositForm, {
			props: { ...baseProps, consent: true, amount: 5 }
		});

		expect(getByTestId(TRADING_DEPOSIT_FORM_REVIEW_BUTTON)).toBeEnabled();
	});

	it('should disable the review button and show an error when the amount exceeds the wallet balance', () => {
		balancesStore.set({ id: token.id, data: { data: 100_000_000n, certified: true } });

		const { getByTestId, getByText } = render(TradingDepositForm, {
			props: { ...baseProps, consent: true, amount: 5 }
		});

		expect(getByTestId(TRADING_DEPOSIT_FORM_REVIEW_BUTTON)).toBeDisabled();
		expect(getByText(en.trading.deposit.error_insufficient_balance)).toBeInTheDocument();
	});

	it('should toggle consent when the checkbox is clicked', async () => {
		const testProps = $state({ ...baseProps });

		const { getByTestId } = render(TradingDepositForm, { props: testProps });

		await fireEvent.click(getByTestId(TRADING_DEPOSIT_CONSENT_CHECKBOX));

		expect(testProps.consent).toBeTruthy();
	});

	it('should render without a token selected', () => {
		const { getByText } = render(TradingDepositForm, {
			props: { ...baseProps, token: undefined }
		});

		expect(getByText(en.trading.deposit.you_deposit)).toBeInTheDocument();
		expect(getByText(en.trading.deposit.consent)).toBeInTheDocument();
	});

	it('should call onNext when the enabled review button is clicked', async () => {
		const onNext = vi.fn();

		const { getByTestId } = render(TradingDepositForm, {
			props: { ...baseProps, consent: true, amount: 5, onNext }
		});

		await fireEvent.click(getByTestId(TRADING_DEPOSIT_FORM_REVIEW_BUTTON));

		expect(onNext).toHaveBeenCalledOnce();
	});
});
