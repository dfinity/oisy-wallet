import type { ActiveUserTransaction } from '$declarations/backend/backend.did';
import LiquidiumRepayModal from '$lib/components/liquidium/repay/LiquidiumRepayModal.svelte';
import { ZERO } from '$lib/constants/app.constants';
import {
	STAKE_FORM_REVIEW_BUTTON,
	STAKE_REVIEW_FORM_BUTTON
} from '$lib/constants/test-ids.constants';
import * as addressesStore from '$lib/derived/address.derived';
import * as liquidiumRepayServices from '$lib/services/liquidium-repay.services';
import * as liquidiumSupplyServices from '$lib/services/liquidium-supply.services';
import { activeUserTransactionsStore } from '$lib/stores/active-user-transactions.store';
import { liquidiumStore } from '$lib/stores/liquidium.store';
import type { LiquidiumPortfolio, LiquidiumReserve } from '$lib/types/liquidium';
import {
	mockLiquidiumActiveUserTransaction,
	mockNearIntentsActiveUserTransaction
} from '$tests/mocks/active-user-transactions.mock';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { runResolvedPromises } from '$tests/utils/timers.test-utils';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { readable } from 'svelte/store';

describe('LiquidiumRepayModal', () => {
	const reserve: LiquidiumReserve = {
		poolId: 'pool-icp',
		asset: 'ICP',
		chain: 'ICP',
		supplyApy: 0,
		borrowApy: 10,
		deposited: ZERO,
		depositedDecimals: 8,
		borrowed: 100_000_000n,
		borrowedDecimals: 8,
		debtInterest: ZERO,
		suppliedUsd: 0,
		borrowedUsd: 12
	};

	const portfolio: LiquidiumPortfolio = {
		reserves: [reserve],
		totalSuppliedUsd: 100,
		totalBorrowedUsd: 12,
		netValueUsd: 88,
		availableBorrowsUsd: 50,
		weightedLiquidationThresholdBps: 8_000,
		healthFactorPercent: 80
	};

	const pendingRepay: ActiveUserTransaction = {
		...mockLiquidiumActiveUserTransaction,
		data: {
			Liquidium: {
				token: { Icrc: mockIdentity.getPrincipal() },
				action: { Repay: null },
				pool_id: 'pool-icp',
				amount: 50_000_000n
			}
		}
	};

	let maxRepaySpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		vi.clearAllMocks();
		localStorage.clear();

		mockAuthStore();
		vi.spyOn(addressesStore, 'ethAddress', 'get').mockImplementation(() =>
			readable(mockEthAddress)
		);

		liquidiumStore.set({ markets: [], portfolio, assetPrices: {} });

		activeUserTransactionsStore.reset();
		activeUserTransactionsStore.init(mockIdentity.getPrincipal());
		activeUserTransactionsStore.upsert({ transaction: pendingRepay });

		vi.spyOn(liquidiumSupplyServices, 'estimateLiquidiumInflowFee').mockResolvedValue(50n);
		maxRepaySpy = vi
			.spyOn(liquidiumRepayServices, 'getLiquidiumMaxRepayAmount')
			.mockResolvedValue(100_000_000n);
	});

	it('shows the pending repays of the position', async () => {
		const { container } = render(LiquidiumRepayModal, { props: { reserve } });

		await waitFor(() => expect(container).toHaveTextContent(en.liquidium.text.pending_repays));
	});

	it('refetches the protocol max once a pending repay settles', async () => {
		render(LiquidiumRepayModal, { props: { reserve } });

		await waitFor(() => expect(maxRepaySpy).toHaveBeenCalledOnce());

		activeUserTransactionsStore.upsert({
			transaction: { ...pendingRepay, status: { Succeeded: null } }
		});

		await waitFor(() => expect(maxRepaySpy).toHaveBeenCalledTimes(2));
	});

	it('does not refetch the protocol max when an unrelated transaction changes', async () => {
		render(LiquidiumRepayModal, { props: { reserve } });

		await waitFor(() => expect(maxRepaySpy).toHaveBeenCalledOnce());

		activeUserTransactionsStore.upsert({ transaction: mockNearIntentsActiveUserTransaction });

		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(maxRepaySpy).toHaveBeenCalledOnce();
	});

	// Only the FIRST (pre-settlement) request is deferred, so the refetch can land before it. The
	// stale answer carries the old, larger debt: if it won, the cap would re-open to that amount.
	// Asserted on the Review button, not the error text, whose removal is animated.
	it('ignores a max response superseded by a refetch', async () => {
		let resolveStale: ((amount: bigint | null) => void) | undefined;

		maxRepaySpy
			.mockReturnValueOnce(
				new Promise((res) => {
					resolveStale = res;
				})
			)
			.mockResolvedValue(50_000_000n);

		const { getByPlaceholderText, getByTestId } = render(LiquidiumRepayModal, {
			props: { reserve }
		});

		await waitFor(() => expect(maxRepaySpy).toHaveBeenCalledOnce());

		activeUserTransactionsStore.upsert({
			transaction: { ...pendingRepay, status: { Succeeded: null } }
		});

		await waitFor(() => expect(maxRepaySpy).toHaveBeenCalledTimes(2));

		const input = getByPlaceholderText('0');

		// Control: within the fresh 0.5 ICP cap the form submits, so the cap is the only gate below.
		await fireEvent.input(input, { target: { value: '0.25' } });
		await waitFor(() =>
			expect(getByTestId(STAKE_FORM_REVIEW_BUTTON)).not.toHaveAttribute('disabled')
		);

		// 0.75 ICP: over the fresh 0.5 ICP cap, under the stale 1 ICP one.
		await fireEvent.input(input, { target: { value: '0.75' } });
		await waitFor(() => expect(getByTestId(STAKE_FORM_REVIEW_BUTTON)).toHaveAttribute('disabled'));

		resolveStale?.(100_000_000n);
		await runResolvedPromises();
		await runResolvedPromises();

		expect(getByTestId(STAKE_FORM_REVIEW_BUTTON)).toHaveAttribute('disabled');
	});

	// The refetch is left pending so the gap it opens on an already-open Review is observable.
	it('disables Confirm on Review while a settled repay refreshes the cap', async () => {
		maxRepaySpy.mockResolvedValueOnce(100_000_000n).mockReturnValue(new Promise(() => undefined));

		const { getByPlaceholderText, getByTestId } = render(LiquidiumRepayModal, {
			props: { reserve }
		});

		await waitFor(() => expect(maxRepaySpy).toHaveBeenCalledOnce());

		await fireEvent.input(getByPlaceholderText('0'), { target: { value: '0.25' } });
		await waitFor(() =>
			expect(getByTestId(STAKE_FORM_REVIEW_BUTTON)).not.toHaveAttribute('disabled')
		);

		await fireEvent.click(getByTestId(STAKE_FORM_REVIEW_BUTTON));
		await waitFor(() =>
			expect(getByTestId(STAKE_REVIEW_FORM_BUTTON)).not.toHaveAttribute('disabled')
		);

		activeUserTransactionsStore.upsert({
			transaction: { ...pendingRepay, status: { Succeeded: null } }
		});

		await waitFor(() => expect(getByTestId(STAKE_REVIEW_FORM_BUTTON)).toHaveAttribute('disabled'));
	});

	it('says the debt is unavailable when the max request fails', async () => {
		maxRepaySpy.mockRejectedValue(new Error('canister unreachable'));

		const { container } = render(LiquidiumRepayModal, { props: { reserve } });

		await waitFor(() =>
			expect(container).toHaveTextContent(en.liquidium.text.repay_debt_unavailable)
		);
	});
});
