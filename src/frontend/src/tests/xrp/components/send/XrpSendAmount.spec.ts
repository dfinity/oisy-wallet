import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
import { MAX_BUTTON } from '$lib/constants/test-ids.constants';
import { balancesStore } from '$lib/stores/balances.store';
import { SEND_CONTEXT_KEY, initSendContext } from '$lib/stores/send.store';
import { formatToken } from '$lib/utils/format.utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import en from '$tests/mocks/i18n.mock';
import XrpSendAmount from '$xrp/components/send/XrpSendAmount.svelte';
import { XRP_BASE_RESERVE_DROPS } from '$xrp/constants/xrp.constants';
import {
	XRP_FEE_CONTEXT_KEY,
	initFeeStore,
	initReserveStore,
	initXrpFeeContext
} from '$xrp/stores/xrp-fee.store';
import { getXrpReserveDrops } from '$xrp/utils/xrp-send.utils';
import { fireEvent, render } from '@testing-library/svelte';
import { writable } from 'svelte/store';

describe('XrpSendAmount', () => {
	const fee = 12n;
	const balance = 5_000_000n;

	const feeStore = initFeeStore();
	const reserveStore = initReserveStore();

	const renderAmount = ({
		amount,
		destinationUnfunded
	}: { amount?: number; destinationUnfunded?: boolean } = {}) => {
		const context = new Map();

		context.set(SEND_CONTEXT_KEY, initSendContext({ token: XRP_TOKEN }));
		context.set(
			XRP_FEE_CONTEXT_KEY,
			initXrpFeeContext({
				feeStore,
				reserveStore,
				feeSymbolStore: writable(XRP_TOKEN.symbol),
				feeDecimalsStore: writable(XRP_TOKEN.decimals),
				feeTokenIdStore: writable(XRP_TOKEN.id),
				feeExchangeRateStore: writable(0.5)
			})
		);

		return render(XrpSendAmount, {
			props: { amount, destinationUnfunded, onTokensList: vi.fn() },
			context
		});
	};

	// The Max button renders the spendable amount, which is the balance minus the fee and the
	// reserve the account must retain.
	const maxAmount = (container: HTMLElement): number => {
		const button = container.querySelector(`[data-tid="${MAX_BUTTON}"]`);

		expect(button).not.toBeNull();

		const [amount] = /[\d.]+/.exec(button?.textContent ?? '') ?? [];

		return Number(amount);
	};

	const spendableXrp = (reserve: bigint): number => Number(balance - fee - reserve) / 1_000_000;

	beforeEach(() => {
		vi.clearAllMocks();

		balancesStore.reset(XRP_TOKEN.id);
		balancesStore.set({ id: XRP_TOKEN.id, data: { data: balance, certified: true } });

		feeStore.setFee(fee);
		reserveStore.setReserve(getXrpReserveDrops({ ownerCount: 0 }));
	});

	it('excludes the fee and the base reserve from the max amount', () => {
		const { container } = renderAmount();

		expect(maxAmount(container)).toBeCloseTo(
			spendableXrp(getXrpReserveDrops({ ownerCount: 0 })),
			6
		);
	});

	// An account owning ledger objects must retain more than the base reserve: offering the
	// base-only amount would leave it short and the send would fail on submit.
	it('also excludes the owner reserve of owned ledger objects', () => {
		reserveStore.setReserve(getXrpReserveDrops({ ownerCount: 2 }));

		const { container } = renderAmount();

		expect(maxAmount(container)).toBeCloseTo(
			spendableXrp(getXrpReserveDrops({ ownerCount: 2 })),
			6
		);
	});

	// Base-only is the smallest reserve the ledger can demand, so while the requirement is
	// unknown nothing may be offered: any figure would risk a send the ledger rejects.
	it('offers nothing while the reserve is unknown', () => {
		reserveStore.setReserve(undefined);

		const { container } = renderAmount();

		expect(maxAmount(container)).toBe(0);
	});

	it('offers the spendable amount again once the reserve is known', () => {
		reserveStore.setReserve(undefined);

		expect(maxAmount(renderAmount().container)).toBe(0);

		reserveStore.setReserve(getXrpReserveDrops({ ownerCount: 1 }));

		expect(maxAmount(renderAmount().container)).toBeCloseTo(
			spendableXrp(getXrpReserveDrops({ ownerCount: 1 })),
			6
		);
	});

	// The fee and the reserve arrive from separate requests, so the reserve can be known while the
	// fee is not. Treating that fee as zero would advertise a max over by exactly the fee, which
	// the send then refuses — and it would stick, since the amount is revalidated only when the
	// amount or token changes, not when the fee lands.
	it('offers nothing while the fee is unknown', () => {
		feeStore.setFee(undefined);

		const { container } = renderAmount();

		expect(maxAmount(container)).toBe(0);
	});

	it('offers the spendable amount again once the fee is known', () => {
		feeStore.setFee(undefined);

		expect(maxAmount(renderAmount().container)).toBe(0);

		feeStore.setFee(fee);

		expect(maxAmount(renderAmount().container)).toBeCloseTo(
			spendableXrp(getXrpReserveDrops({ ownerCount: 0 })),
			6
		);
	});

	// `MaxBalanceButton` re-maxes when the fee moves, and clears that intent when the user types —
	// but only if the input and the button share the flag. Unbound they each keep a copy, the
	// button's stays set, and the next poll overwrites what was typed.
	describe('Max followed by typing', () => {
		const input = (container: HTMLElement): HTMLInputElement =>
			container.querySelector('input') as HTMLInputElement;

		const clickMax = async (container: HTMLElement) => {
			const button = container.querySelector(`[data-tid="${MAX_BUTTON}"]`);

			expect(button).not.toBeNull();

			await fireEvent.click(button as HTMLElement);
		};

		it('keeps a typed amount when the fee changes afterwards', async () => {
			vi.useFakeTimers();

			const { container } = renderAmount();

			await clickMax(container);
			await fireEvent.input(input(container), { target: { value: '1' } });

			feeStore.setFee(fee * 2n);

			await vi.advanceTimersByTimeAsync(2_000);

			expect(input(container).value).toBe('1');

			vi.useRealTimers();
		});

		// The other half: with Max still the user's intent, a fee change must still re-max, or the
		// shared flag would have bought correctness by disabling the feature.
		it('re-maxes when the fee changes and nothing was typed', async () => {
			vi.useFakeTimers();

			const { container } = renderAmount();

			await clickMax(container);

			const atFirstFee = input(container).value;

			feeStore.setFee(fee * 1000n);

			await vi.advanceTimersByTimeAsync(2_000);

			expect(input(container).value).not.toBe(atFirstFee);

			vi.useRealTimers();
		});
	});

	// A payment to an address with no account yet has to create it, and below the base reserve XRPL
	// applies it as `tecNO_DST_INSUF_XRP`: the payment fails and the fee is claimed.
	describe('a recipient without an account', () => {
		const unfundedMessage = replacePlaceholders(en.send.assertion.xrp_destination_unfunded, {
			$reserve: formatToken({ value: XRP_BASE_RESERVE_DROPS, unitName: XRP_TOKEN.decimals })
		});

		const typeAmount = async ({ container, value }: { container: HTMLElement; value: string }) => {
			await fireEvent.input(container.querySelector('input') as HTMLInputElement, {
				target: { value }
			});

			// Past the validation debounce.
			await vi.advanceTimersByTimeAsync(500);
		};

		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('rejects an amount below the base reserve', async () => {
			const { container, getByText } = renderAmount({ destinationUnfunded: true });

			await typeAmount({ container, value: '0.5' });

			expect(getByText(unfundedMessage)).toBeInTheDocument();
		});

		it('accepts exactly the base reserve', async () => {
			const { container, queryByText } = renderAmount({ destinationUnfunded: true });

			await typeAmount({ container, value: '1' });

			expect(queryByText(unfundedMessage)).not.toBeInTheDocument();
		});

		it('does not restrict the amount for a recipient with an account', async () => {
			const { container, queryByText } = renderAmount({ destinationUnfunded: false });

			await typeAmount({ container, value: '0.5' });

			expect(queryByText(unfundedMessage)).not.toBeInTheDocument();
		});

		// The lookup usually answers after the amount was entered. Without the revalidation the error
		// would appear only after the next edit. The amount is a prop rather than typed, because a
		// rerender hands the harness's props back and would clear a typed one.
		it('rejects an amount entered before the lookup answered, without an edit', async () => {
			const { queryByText, rerender } = renderAmount({ amount: 0.5, destinationUnfunded: false });

			await vi.advanceTimersByTimeAsync(500);

			expect(queryByText(unfundedMessage)).not.toBeInTheDocument();

			await rerender({ destinationUnfunded: true });

			await vi.advanceTimersByTimeAsync(500);

			expect(queryByText(unfundedMessage)).toBeInTheDocument();
		});

		// Insufficient funds comes first: raising the amount, which the unfunded error asks for,
		// cannot fix an amount the account cannot cover.
		it('reports insufficient funds over the unfunded recipient', async () => {
			balancesStore.set({ id: XRP_TOKEN.id, data: { data: 1_200_000n, certified: true } });

			const { container, getByText, queryByText } = renderAmount({ destinationUnfunded: true });

			await typeAmount({ container, value: '0.5' });

			expect(getByText(en.send.assertion.insufficient_funds_for_reserve)).toBeInTheDocument();
			expect(queryByText(unfundedMessage)).not.toBeInTheDocument();
		});
	});

	it('offers less as the owner count grows', () => {
		reserveStore.setReserve(getXrpReserveDrops({ ownerCount: 0 }));

		const { container: withNone } = renderAmount();
		const none = maxAmount(withNone);

		reserveStore.setReserve(getXrpReserveDrops({ ownerCount: 3 }));

		const { container: withThree } = renderAmount();

		expect(maxAmount(withThree)).toBeLessThan(none);
	});
});
