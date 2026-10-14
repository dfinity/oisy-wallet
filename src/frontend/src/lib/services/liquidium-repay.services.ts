import type { EthAddress, OptionEthAddress } from '$eth/types/address';
import { liquidiumClient } from '$lib/api/liquidium.api';
import { TRACK_COUNT_LIQUIDIUM_SUBMITTED } from '$lib/constants/analytics.constants';
import { ZERO } from '$lib/constants/app.constants';
import { LIQUIDIUM_REPAY_LEASE_RENEWAL_MILLIS } from '$lib/constants/liquidium.constants';
import { ProgressStepsLiquidiumRepay } from '$lib/enums/progress-steps';
import {
	createActiveUserTransaction,
	deleteActiveUserTransaction,
	updateActiveUserTransaction
} from '$lib/services/active-user-transactions.services';
import { trackEvent } from '$lib/services/analytics.services';
import { getOrCreateLiquidiumProfile } from '$lib/services/liquidium.services';
import type { NullishIdentity } from '$lib/types/identity';
import type { LiquidiumPortfolio, LiquidiumReserve } from '$lib/types/liquidium';
import {
	LIQUIDIUM_EXTERNAL_REF_KEYS,
	type LiquidiumExternalRefKey
} from '$lib/types/liquidium-active-tx';
import { consoleError } from '$lib/utils/console.utils';
import {
	liquidiumTrackingMetadata,
	toLiquidiumExternalRefs
} from '$lib/utils/liquidium-active-tx.utils';
import {
	liquidiumAssetTokenId,
	liquidiumProjectedHealthAfterRepayPercent
} from '$lib/utils/liquidium.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import type { Identity } from '@icp-sdk/core/agent';
import { SupplyAction, type Chain, type SupplyTarget } from '@liquidium/client';

export interface LiquidiumRepayPreview {
	projectedHealthPercent: number;
}

// Full outstanding debt (principal + accrued interest + small buffer) in base units, for the
// "Max (full debt)" shortcut. `null` when the user has no profile yet (should not happen for a
// position that already carries debt, but guarded so callers can no-op gracefully).
export const getLiquidiumMaxRepayAmount = async ({
	identity,
	ethAddress,
	poolId
}: {
	identity: NullishIdentity;
	ethAddress: OptionEthAddress;
	poolId: string;
}): Promise<bigint | null> => {
	if (isNullish(identity) || isNullish(ethAddress)) {
		return null;
	}

	const { accounts, positions } = liquidiumClient({ identity });

	const profileId = await accounts.getProfileId(ethAddress);

	if (isNullish(profileId)) {
		return null;
	}

	const { amount } = await positions.getMaxRepayAmount(profileId, poolId);

	return amount;
};

// USD value of this position's accrued borrow interest, derived from the reserve's own price basis
// (interest and principal share the asset price, so this scales consistently with `borrowedUsd`).
export const liquidiumDebtInterestUsd = (reserve: LiquidiumReserve): number =>
	reserve.borrowed > ZERO
		? (Number(reserve.debtInterest ?? ZERO) / Number(reserve.borrowed)) * reserve.borrowedUsd
		: 0;

// Repaying reduces debt, so the projected health moves toward 100% (aggregate, portfolio-based).
// The per-position debt breakdown is rendered by `LiquidiumRepayDebtRows`, not here.
export const computeLiquidiumRepayPreview = ({
	portfolio,
	repayUsd
}: {
	portfolio: LiquidiumPortfolio;
	repayUsd: number;
}): LiquidiumRepayPreview => ({
	projectedHealthPercent: liquidiumProjectedHealthAfterRepayPercent({
		totalCollateralUsd: portfolio.totalSuppliedUsd,
		totalDebtUsd: portfolio.totalBorrowedUsd,
		repayUsd,
		weightedLiquidationThresholdBps: portfolio.weightedLiquidationThresholdBps
	})
});

// Pending repays already cover the whole debt: nothing is left to repay until they settle. The net
// cap rarely lands on exactly zero (interest accrued since the pending repay was quoted leaves dust
// that its own buffer already covers), so the debt itself is checked too. Shared by the form, the
// Review step and the broadcast guard so every gate agrees on "nothing left to repay".
export const liquidiumPendingCoversDebt = ({
	pendingRepay,
	maxRepay,
	reserve
}: {
	pendingRepay: bigint;
	maxRepay: bigint | undefined;
	reserve: LiquidiumReserve;
}): boolean =>
	pendingRepay > ZERO &&
	(maxRepay === ZERO || pendingRepay >= reserve.borrowed + (reserve.debtInterest ?? ZERO));

// Why `amount` can no longer be repaid under the cap, or `undefined` when it can. Review can
// outlive the cap it was entered under (a repay that settles clears and refetches it; a new pending
// one lowers it), so the wizards re-check at the point of broadcast rather than trust the form.
export const liquidiumRepayCapError = ({
	amount,
	maxRepay,
	pendingRepay,
	reserve,
	i18n
}: {
	amount: bigint;
	maxRepay: bigint | undefined;
	pendingRepay: bigint;
	reserve: LiquidiumReserve;
	i18n: I18n;
}): Error | undefined =>
	isNullish(maxRepay)
		? new Error(i18n.liquidium.text.repay_debt_unavailable)
		: liquidiumPendingCoversDebt({ pendingRepay, maxRepay, reserve })
			? new Error(i18n.liquidium.text.repay_pending_covers_debt)
			: amount > maxRepay
				? new Error(i18n.liquidium.text.repay_exceeds_debt)
				: undefined;

// Broadcasts `amount` base units (gross = repay + provider fee) to the native target and returns
// the txid the AUT poller correlates on. Implemented by the wizard (per-chain fee/UTXO machinery).
export type LiquidiumRepayBroadcast = (params: {
	target: SupplyTarget;
	amount: bigint;
}) => Promise<string>;

// Repays `amount` (base units) of `asset`'s debt: resolve profile → record an AUT → broadcast the
// transfer → add its txid to the AUT, so the modal can close before settlement. Repaying is an
// inflow on the supply path (`SupplyAction.repayment`), so this mirrors `executeLiquidiumSupply`
// except for when the AUT is recorded — we drive the transfer rail and broadcast to the flat
// `SupplyTarget` address, and the protocol deducts its inflow fee from the inflow, so we transfer
// `amount + inflowFee` to credit the net `amount` against the debt.
export const executeLiquidiumRepay = async ({
	identity,
	ethAddress,
	poolId,
	chain,
	asset,
	amount,
	inflowFee,
	displayAmount,
	progressStep,
	broadcast,
	progress
}: {
	identity: Identity;
	ethAddress: EthAddress;
	poolId: string;
	chain: Chain;
	asset: string;
	amount: bigint;
	inflowFee: bigint;
	displayAmount: string;
	progressStep?: string;
	broadcast: LiquidiumRepayBroadcast;
	progress?: (step: ProgressStepsLiquidiumRepay) => void;
}): Promise<void> => {
	progress?.(ProgressStepsLiquidiumRepay.INITIALIZATION);

	const profileId = await getOrCreateLiquidiumProfile({ identity, ethAddress });

	const flow = await liquidiumClient({ identity }).lending.supply({
		profileId,
		poolId,
		chain,
		action: SupplyAction.repayment
	});

	progress?.(ProgressStepsLiquidiumRepay.TRANSFER);

	const id = crypto.randomUUID();

	const refs: Partial<Record<LiquidiumExternalRefKey, string>> = {
		[LIQUIDIUM_EXTERNAL_REF_KEYS.PROFILE_ID]: profileId,
		[LIQUIDIUM_EXTERNAL_REF_KEYS.AMOUNT]: displayAmount,
		[LIQUIDIUM_EXTERNAL_REF_KEYS.ASSET_SYMBOL]: asset
	};

	// For a row whose repay sent nothing: until it is gone it counts as a pending repay and lowers
	// the repay max. Best-effort, because a row a failed delete leaves behind never gets a txid, and
	// the poller drops it once nobody has written it for the grace period.
	const deleteRow = async () => {
		try {
			await deleteActiveUserTransaction({ identity, id });
		} catch (err: unknown) {
			consoleError(err);
		}
	};

	// Before the broadcast: the row is what nets this repay out of the repay max until it settles,
	// so a repay that cannot be recorded is not sent. Sent anyway, nothing would count it, and a
	// second full repay could reach Liquidium with no debt left to apply it to.
	try {
		await createActiveUserTransaction({
			identity,
			id,
			data: {
				Liquidium: {
					token: liquidiumAssetTokenId(asset),
					action: { Repay: null },
					pool_id: poolId,
					amount
				}
			},
			...(nonNullish(progressStep) ? { progressStep } : {}),
			externalRefs: toLiquidiumExternalRefs(refs)
		});
	} catch (err: unknown) {
		// The backend may have committed the row all the same, if only its answer was lost.
		await deleteRow();

		throw err;
	}

	// The poller drops a row without a txid that nobody has written for its grace period, and a
	// broadcast can outlast that (a BTC send awaits a canister call with no deadline). A write with
	// no fields still moves the row's `updated_at_ns`, which is what the poller watches, here and in
	// any other tab.
	const renewLease = async () => {
		try {
			await updateActiveUserTransaction({ identity, id });
		} catch (err: unknown) {
			consoleError(err);
		}
	};

	const lease = setInterval(renewLease, LIQUIDIUM_REPAY_LEASE_RENEWAL_MILLIS);

	let txid: string;

	try {
		// Gross transfer = net repayment + provider inflow fee (deducted on arrival).
		txid = await broadcast({ target: flow.target, amount: amount + inflowFee });
	} catch (err: unknown) {
		clearInterval(lease);

		// Taken as not sent, as the wizard reports it.
		await deleteRow();

		throw err;
	}

	clearInterval(lease);

	// Submitted on-chain; success/error events fire from the AUT poller once it settles.
	trackEvent({
		name: TRACK_COUNT_LIQUIDIUM_SUBMITTED,
		metadata: liquidiumTrackingMetadata({
			action: 'repay',
			token: asset,
			tokenAmount: displayAmount
		})
	});

	progress?.(ProgressStepsLiquidiumRepay.REGISTER);

	// Point of no return: the txid write and the SDK submit (a txid indexing hint) are both
	// best-effort and independent (each its own try/catch). Neither fails the repay: the protocol
	// detects the inflow on-chain regardless and positions self-heal from `client.positions`
	// (mirrors the Supply flow).
	//
	// The txid first: it is what the poller correlates the row on, and a row still without one once
	// the grace period is over is dropped. `external_refs` is replaced wholesale, so the other refs
	// go along again.
	try {
		await updateActiveUserTransaction({
			identity,
			id,
			externalRefs: toLiquidiumExternalRefs({
				...refs,
				[LIQUIDIUM_EXTERNAL_REF_KEYS.TXID]: txid
			})
		});
	} catch (err: unknown) {
		consoleError(err);
	}

	try {
		await flow.submit({ txid });
	} catch (err: unknown) {
		consoleError(err);
	}

	progress?.(ProgressStepsLiquidiumRepay.DONE);
};
