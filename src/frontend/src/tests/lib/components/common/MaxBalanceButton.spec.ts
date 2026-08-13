import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import MaxBalanceButton from '$lib/components/common/MaxBalanceButton.svelte';
import { ZERO } from '$lib/constants/app.constants';
import { MAX_BUTTON } from '$lib/constants/test-ids.constants';
import MaxBalanceButtonTestHost from '$tests/lib/components/common/MaxBalanceButtonTestHost.svelte';
import { fireEvent, render } from '@testing-library/svelte';

describe('MaxBalanceButton', () => {
	// BTC has 8 decimals: 200_000_000 sat = 2 BTC, 100_000_000 sat = 1 BTC.
	const baseProps = {
		amount: undefined,
		balance: 200_000_000n,
		token: BTC_MAINNET_TOKEN
	};
	const amountTestId = 'max-balance-button-amount';
	const amountSetToMaxTestId = 'max-balance-button-amount-set-to-max';

	it('shows the affordable balance when no cap is set', () => {
		const { getByTestId } = render(MaxBalanceButton, { props: baseProps });

		expect(getByTestId(MAX_BUTTON)).toHaveTextContent('2 BTC');
	});

	it('clamps the max to maxAmount when the balance is higher', () => {
		const { getByTestId } = render(MaxBalanceButton, {
			props: { ...baseProps, maxAmount: 100_000_000n }
		});

		expect(getByTestId(MAX_BUTTON)).toHaveTextContent('1 BTC');
	});

	it('uses the affordable balance when it is below the cap', () => {
		const { getByTestId } = render(MaxBalanceButton, {
			props: { ...baseProps, maxAmount: 500_000_000n }
		});

		expect(getByTestId(MAX_BUTTON)).toHaveTextContent('2 BTC');
	});

	it('subtracts the fee before applying a higher maxAmount cap', () => {
		const { getByTestId } = render(MaxBalanceButton, {
			props: { ...baseProps, fee: 50_000_000n, maxAmount: 180_000_000n }
		});

		expect(getByTestId(MAX_BUTTON)).toHaveTextContent('1.5 BTC');
	});

	it('keeps the maxAmount cap when it is below the fee-adjusted balance', () => {
		const { getByTestId } = render(MaxBalanceButton, {
			props: { ...baseProps, fee: 10_000_000n, maxAmount: 100_000_000n }
		});

		expect(getByTestId(MAX_BUTTON)).toHaveTextContent('1 BTC');
	});

	it('sets the capped amount and marks it as max when clicked', async () => {
		const { getByTestId } = render(MaxBalanceButtonTestHost, {
			props: { ...baseProps, maxAmount: 100_000_000n }
		});

		await fireEvent.click(getByTestId(MAX_BUTTON));

		expect(getByTestId(amountTestId)).toHaveTextContent('1');
		expect(getByTestId(amountSetToMaxTestId)).toHaveTextContent('true');
	});

	it('does not set the amount for a zero balance', async () => {
		const { getByTestId } = render(MaxBalanceButtonTestHost, {
			props: { ...baseProps, balance: ZERO, maxAmount: 100_000_000n }
		});

		await fireEvent.click(getByTestId(MAX_BUTTON));

		expect(getByTestId(amountTestId)).toHaveTextContent('');
		expect(getByTestId(amountSetToMaxTestId)).toHaveTextContent('false');
	});

	it('reapplies max after the fee changes when the amount is set to max', async () => {
		vi.useFakeTimers();

		try {
			const { getByTestId, rerender } = render(MaxBalanceButtonTestHost, {
				props: {
					...baseProps,
					fee: 10_000_000n,
					maxAmount: 180_000_000n
				}
			});

			await fireEvent.click(getByTestId(MAX_BUTTON));

			expect(getByTestId(amountTestId)).toHaveTextContent('1.8');

			await rerender({
				...baseProps,
				fee: 50_000_000n,
				maxAmount: 180_000_000n
			});

			await vi.advanceTimersByTimeAsync(499);

			expect(getByTestId(amountTestId)).toHaveTextContent('1.8');

			await vi.advanceTimersByTimeAsync(1);

			expect(getByTestId(amountTestId)).toHaveTextContent('1.5');
		} finally {
			vi.useRealTimers();
		}
	});
});
