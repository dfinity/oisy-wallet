import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import LiquidiumWithdrawForm from '$lib/components/liquidium/withdraw/LiquidiumWithdrawForm.svelte';
import { ZERO } from '$lib/constants/app.constants';
import type { LiquidiumWithdrawPreview } from '$lib/services/liquidium-withdraw.services';
import type { LiquidiumPortfolio, LiquidiumReserve } from '$lib/types/liquidium';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';

describe('LiquidiumWithdrawForm', () => {
	const reserve: LiquidiumReserve = {
		poolId: 'pool-btc',
		asset: 'BTC',
		chain: 'BTC',
		supplyApy: 5,
		borrowApy: 0,
		// 1 BTC in satoshis.
		deposited: 100_000_000n,
		depositedDecimals: 8,
		borrowed: ZERO,
		borrowedDecimals: 8,
		suppliedUsd: 100_000,
		borrowedUsd: 0
	};

	const portfolio = (overrides: Partial<LiquidiumPortfolio> = {}): LiquidiumPortfolio => ({
		reserves: [],
		totalSuppliedUsd: 100_000,
		totalBorrowedUsd: 0,
		netValueUsd: 100_000,
		availableBorrowsUsd: 80_000,
		weightedLiquidationThresholdBps: 8000,
		healthFactorPercent: 100,
		...overrides
	});

	const preview = (
		overrides: Partial<LiquidiumWithdrawPreview> = {}
	): LiquidiumWithdrawPreview => ({
		projectedHealthPercent: 100,
		healthLevel: 'healthy',
		maxWithdrawableUsd: 100_000,
		reservedByDebtUsd: 0,
		valid: true,
		...overrides
	});

	const baseProps = {
		reserve,
		withdrawToken: BTC_MAINNET_TOKEN,
		withdrawPrice: 60_000,
		portfolio: portfolio(),
		preview: preview(),
		amount: undefined,
		confirmChecked: false,
		onClose: () => {},
		onNext: () => {}
	};

	const reviewButton = (getByRole: ReturnType<typeof render>['getByRole']) =>
		getByRole('button', { name: en.send.text.review });

	it('renders the supplied context and risk line', () => {
		const { container } = render(LiquidiumWithdrawForm, { props: baseProps });

		expect(container).toHaveTextContent(en.liquidium.text.supplied_label);
		expect(container).toHaveTextContent(en.liquidium.text.withdraw_risk_info);
	});

	it('disables Review with no amount entered', () => {
		const { getByRole } = render(LiquidiumWithdrawForm, { props: baseProps });

		expect(reviewButton(getByRole)).toBeDisabled();
	});

	it('enables Review for a valid amount with a healthy projection', () => {
		const { getByRole } = render(LiquidiumWithdrawForm, {
			props: { ...baseProps, amount: 0.5 }
		});

		expect(reviewButton(getByRole)).toBeEnabled();
	});

	it('requires confirmation for a non-healthy projection before Review', async () => {
		const { container, getByRole } = render(LiquidiumWithdrawForm, {
			props: {
				...baseProps,
				amount: 0.5,
				portfolio: portfolio({ totalBorrowedUsd: 20_000 }),
				preview: preview({ healthLevel: 'at-risk', projectedHealthPercent: 30 })
			}
		});

		expect(container).toHaveTextContent(en.liquidium.text.withdraw_at_risk_warning);
		expect(container).toHaveTextContent(en.liquidium.text.withdraw_risk_confirm);
		expect(reviewButton(getByRole)).toBeDisabled();

		await fireEvent.click(getByRole('checkbox'));

		expect(reviewButton(getByRole)).toBeEnabled();
	});

	it('shows the reserved-by-debt line when collateral is pledged', () => {
		const { container } = render(LiquidiumWithdrawForm, {
			props: {
				...baseProps,
				portfolio: portfolio({ totalBorrowedUsd: 20_000 }),
				preview: preview({ maxWithdrawableUsd: 30_000, reservedByDebtUsd: 70_000 })
			}
		});

		expect(container).toHaveTextContent(en.liquidium.text.reserved_by_debt);
	});

	it('blocks withdrawing and warns when the price is unavailable with open debt', () => {
		const { container, getByRole } = render(LiquidiumWithdrawForm, {
			props: {
				...baseProps,
				amount: 0.5,
				withdrawPrice: 0,
				portfolio: portfolio({ totalBorrowedUsd: 20_000 }),
				preview: preview({ maxWithdrawableUsd: 30_000 })
			}
		});

		expect(container).toHaveTextContent(en.liquidium.text.withdraw_prices_unavailable);
		expect(reviewButton(getByRole)).toBeDisabled();
		// The dedicated warning explains the blocker; the cap-based error must not be shown.
		expect(container).not.toHaveTextContent(en.liquidium.text.withdraw_exceeds_free_collateral);
	});

	// Native SOL pays out through the ckSOL minter, which has a minimum withdrawal.
	describe('with a rail minimum', () => {
		// The input validates on a 300ms debounce.
		const VALIDATION_DEBOUNCE_MS = 300;

		const solProps = {
			...baseProps,
			reserve: {
				...reserve,
				poolId: 'pool-sol',
				asset: 'SOL',
				chain: 'SOL',
				deposited: 1_000_000_000n,
				depositedDecimals: 9,
				borrowedDecimals: 9,
				suppliedUsd: 150
			},
			withdrawToken: SOLANA_TOKEN,
			withdrawPrice: 150,
			portfolio: portfolio({ totalSuppliedUsd: 150, netValueUsd: 150 }),
			railMinimum: 2_001_000n
		};

		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('shows no minimum without one', () => {
			const { container } = render(LiquidiumWithdrawForm, { props: baseProps });

			expect(container).not.toHaveTextContent(en.liquidium.text.minimum_withdraw);
		});

		it('shows it at full precision', () => {
			const { container } = render(LiquidiumWithdrawForm, { props: solProps });

			expect(container).toHaveTextContent(en.liquidium.text.minimum_withdraw);
			expect(container).toHaveTextContent('0.002001 SOL');
		});

		it('blocks an amount below it', async () => {
			const { container, getByRole } = render(LiquidiumWithdrawForm, {
				props: { ...solProps, amount: 0.002 }
			});

			await vi.advanceTimersByTimeAsync(VALIDATION_DEBOUNCE_MS);

			expect(container).toHaveTextContent(en.liquidium.text.withdraw_below_minimum);
			expect(reviewButton(getByRole)).toBeDisabled();
		});

		it('accepts the minimum itself', async () => {
			const { container, getByRole } = render(LiquidiumWithdrawForm, {
				props: { ...solProps, amount: 0.002001 }
			});

			await vi.advanceTimersByTimeAsync(VALIDATION_DEBOUNCE_MS);

			expect(container).not.toHaveTextContent(en.liquidium.text.withdraw_below_minimum);
			expect(reviewButton(getByRole)).toBeEnabled();
		});
	});
});
