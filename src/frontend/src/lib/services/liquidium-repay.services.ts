import type { EthAddress, OptionEthAddress } from '$eth/types/address';
import { liquidiumClient } from '$lib/api/liquidium.api';
import { TRACK_COUNT_LIQUIDIUM_SUBMITTED } from '$lib/constants/analytics.constants';
import { ZERO } from '$lib/constants/app.constants';
import { ProgressStepsLiquidiumRepay } from '$lib/enums/progress-steps';
import { createActiveUserTransaction } from '$lib/services/active-user-transactions.services';
import { trackEvent } from '$lib/services/analytics.services';
import { getOrCreateLiquidiumProfile } from '$lib/services/liquidium.services';
import type { NullishIdentity } from '$lib/types/identity';
import type { LiquidiumPortfolio, LiquidiumReserve } from '$lib/types/liquidium';
import { LIQUIDIUM_EXTERNAL_REF_KEYS } from '$lib/types/liquidium-active-tx';
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
import { SupplyAction, type NativeAddressSupplyTarget } from '@liquidium/client';

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

// Broadcasts `amount` base units (gross = repay + provider fee) to the native target and returns
// the txid the AUT poller correlates on. Implemented by the wizard (per-chain fee/UTXO machinery).
export type LiquidiumRepayBroadcast = (params: {
	target: NativeAddressSupplyTarget;
	amount: bigint;
}) => Promise<string>;

// Repays `amount` (base units) of `asset`'s debt: resolve profile → broadcast the transfer →
// record an AUT so the modal can close before settlement. Repaying is an inflow on the supply
// path (`SupplyAction.repayment`), so this mirrors `executeLiquidiumSupply` exactly — the only
// rail v1 assets return is `nativeAddress`, and the protocol deducts its inflow fee from the
// inflow, so we transfer `amount + inflowFee` to credit the net `amount` against the debt.
export const executeLiquidiumRepay = async ({
	identity,
	ethAddress,
	poolId,
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
		action: SupplyAction.repayment
	});

	if (flow.target.type !== 'nativeAddress') {
		throw new Error(
			`Liquidium repay: unsupported "${flow.target.type}" target for ${asset} (only nativeAddress is supported)`
		);
	}

	progress?.(ProgressStepsLiquidiumRepay.TRANSFER);

	// Gross transfer = net repayment + provider inflow fee (deducted on arrival).
	const txid = await broadcast({ target: flow.target, amount: amount + inflowFee });

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

	// Point of no return: the SDK submit (a txid indexing hint) and the AUT row are both
	// best-effort and independent (each its own try/catch). Neither fails the repay: the protocol
	// detects the inflow on-chain regardless and positions self-heal from `client.positions`
	// (mirrors the Supply flow).
	try {
		await flow.submit({ txid });
	} catch (err: unknown) {
		consoleError(err);
	}

	try {
		await createActiveUserTransaction({
			identity,
			id: crypto.randomUUID(),
			data: {
				Liquidium: {
					token: liquidiumAssetTokenId(asset),
					action: { Repay: null },
					pool_id: poolId,
					amount
				}
			},
			...(nonNullish(progressStep) ? { progressStep } : {}),
			externalRefs: toLiquidiumExternalRefs({
				[LIQUIDIUM_EXTERNAL_REF_KEYS.PROFILE_ID]: profileId,
				[LIQUIDIUM_EXTERNAL_REF_KEYS.AMOUNT]: displayAmount,
				[LIQUIDIUM_EXTERNAL_REF_KEYS.ASSET_SYMBOL]: asset,
				[LIQUIDIUM_EXTERNAL_REF_KEYS.TXID]: txid
			})
		});
	} catch (err: unknown) {
		consoleError(err);
	}

	progress?.(ProgressStepsLiquidiumRepay.DONE);
};
