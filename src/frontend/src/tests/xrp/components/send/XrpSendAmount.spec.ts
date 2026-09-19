import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
import { MAX_BUTTON } from '$lib/constants/test-ids.constants';
import { balancesStore } from '$lib/stores/balances.store';
import { SEND_CONTEXT_KEY, initSendContext } from '$lib/stores/send.store';
import XrpSendAmount from '$xrp/components/send/XrpSendAmount.svelte';
import {
	XRP_FEE_CONTEXT_KEY,
	initFeeStore,
	initReserveStore,
	initXrpFeeContext
} from '$xrp/stores/xrp-fee.store';
import { getXrpReserveDrops } from '$xrp/utils/xrp-send.utils';
import { render } from '@testing-library/svelte';
import { writable } from 'svelte/store';

describe('XrpSendAmount', () => {
	const fee = 12n;
	const balance = 5_000_000n;

	const feeStore = initFeeStore();
	const reserveStore = initReserveStore();

	const renderAmount = () => {
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
			props: { amount: undefined, onTokensList: vi.fn() },
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

	it('offers less as the owner count grows', () => {
		reserveStore.setReserve(getXrpReserveDrops({ ownerCount: 0 }));

		const { container: withNone } = renderAmount();
		const none = maxAmount(withNone);

		reserveStore.setReserve(getXrpReserveDrops({ ownerCount: 3 }));

		const { container: withThree } = renderAmount();

		expect(maxAmount(withThree)).toBeLessThan(none);
	});
});
