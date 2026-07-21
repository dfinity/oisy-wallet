import type { EthAddress } from '$eth/types/address';
import { liquidiumClient } from '$lib/api/liquidium.api';
import { TRACK_COUNT_LIQUIDIUM_SUBMITTED } from '$lib/constants/analytics.constants';
import {
	LIQUIDIUM_WITHDRAW_CAP_TOLERANCE,
	type LiquidiumHealthLevel
} from '$lib/constants/liquidium.constants';
import { ProgressStepsLiquidiumWithdraw } from '$lib/enums/progress-steps';
import { createActiveUserTransaction } from '$lib/services/active-user-transactions.services';
import { trackEvent } from '$lib/services/analytics.services';
import { liquidiumWalletAdapter } from '$lib/services/liquidium-wallet-adapter.services';
import { getOrCreateLiquidiumProfile } from '$lib/services/liquidium.services';
import type { LiquidiumPortfolio, LiquidiumReserve } from '$lib/types/liquidium';
import { LIQUIDIUM_EXTERNAL_REF_KEYS } from '$lib/types/liquidium-active-tx';
import { consoleError } from '$lib/utils/console.utils';
import {
	liquidiumTrackingMetadata,
	toLiquidiumExternalRefs
} from '$lib/utils/liquidium-active-tx.utils';
import {
	liquidiumAssetTokenId,
	liquidiumFreeCollateralUsd,
	liquidiumHealthLevel,
	liquidiumProjectedHealthAfterWithdrawPercent
} from '$lib/utils/liquidium.utils';
import { nonNullish } from '@dfinity/utils';
import type { Identity } from '@icp-sdk/core/agent';
import { Chain } from '@liquidium/client';

export interface LiquidiumWithdrawPreview {
	projectedHealthPercent: number;
	healthLevel: LiquidiumHealthLevel;
	maxWithdrawableUsd: number;
	reservedByDebtUsd: number;
	valid: boolean;
}

export const computeLiquidiumWithdrawPreview = ({
	portfolio,
	reserve,
	withdrawUsd
}: {
	portfolio: LiquidiumPortfolio;
	reserve: LiquidiumReserve;
	withdrawUsd: number;
}): LiquidiumWithdrawPreview => {
	const freeCollateralUsd = liquidiumFreeCollateralUsd({
		totalCollateralUsd: portfolio.totalSuppliedUsd,
		totalDebtUsd: portfolio.totalBorrowedUsd,
		weightedLiquidationThresholdBps: portfolio.weightedLiquidationThresholdBps
	});

	const maxWithdrawableUsd = Math.min(reserve.suppliedUsd, freeCollateralUsd);
	const reservedByDebtUsd = Math.max(0, reserve.suppliedUsd - maxWithdrawableUsd);

	const projectedHealthPercent = liquidiumProjectedHealthAfterWithdrawPercent({
		totalCollateralUsd: portfolio.totalSuppliedUsd,
		totalDebtUsd: portfolio.totalBorrowedUsd,
		withdrawUsd,
		weightedLiquidationThresholdBps: portfolio.weightedLiquidationThresholdBps
	});

	const exceedsFreeCollateral =
		withdrawUsd > maxWithdrawableUsd * (1 + LIQUIDIUM_WITHDRAW_CAP_TOLERANCE);

	return {
		projectedHealthPercent,
		healthLevel: liquidiumHealthLevel(projectedHealthPercent),
		maxWithdrawableUsd,
		reservedByDebtUsd,
		valid: !exceedsFreeCollateral
	};
};

export const executeLiquidiumWithdraw = async ({
	identity,
	ethAddress,
	poolId,
	chain,
	asset,
	amount,
	receiverAddress,
	displayAmount,
	progressStep,
	progress
}: {
	identity: Identity;
	ethAddress: EthAddress;
	poolId: string;
	chain: Chain;
	asset: string;
	amount: bigint;
	receiverAddress: string;
	displayAmount: string;
	progressStep?: string;
	progress?: (step: ProgressStepsLiquidiumWithdraw) => void;
}): Promise<void> => {
	progress?.(ProgressStepsLiquidiumWithdraw.INITIALIZATION);

	const profileId = await getOrCreateLiquidiumProfile({ identity, ethAddress });

	progress?.(ProgressStepsLiquidiumWithdraw.SUBMIT);

	// Correlate by receipt `id`; `txid` may be assigned later.
	const receipt = await liquidiumClient({ identity }).lending.withdraw({
		profileId,
		poolId,
		amount,
		chain,
		receiver: receiverAddress,
		signerWalletAddress: ethAddress,
		signerChain: Chain.ETH,
		signerWalletAdapter: liquidiumWalletAdapter({ identity })
	});

	trackEvent({
		name: TRACK_COUNT_LIQUIDIUM_SUBMITTED,
		metadata: liquidiumTrackingMetadata({
			action: 'withdraw',
			token: asset,
			tokenAmount: displayAmount
		})
	});

	progress?.(ProgressStepsLiquidiumWithdraw.REGISTER);

	// Best-effort: withdraw is committed, so a bookkeeping failure must not fail it.
	try {
		await createActiveUserTransaction({
			identity,
			id: crypto.randomUUID(),
			data: {
				Liquidium: {
					token: liquidiumAssetTokenId(asset),
					action: { Withdraw: null },
					pool_id: poolId,
					amount
				}
			},
			...(nonNullish(progressStep) ? { progressStep } : {}),
			externalRefs: toLiquidiumExternalRefs({
				[LIQUIDIUM_EXTERNAL_REF_KEYS.PROFILE_ID]: profileId,
				[LIQUIDIUM_EXTERNAL_REF_KEYS.OUTFLOW_ID]: receipt.id,
				[LIQUIDIUM_EXTERNAL_REF_KEYS.AMOUNT]: displayAmount,
				[LIQUIDIUM_EXTERNAL_REF_KEYS.ASSET_SYMBOL]: asset,
				...(nonNullish(receipt.txid) ? { [LIQUIDIUM_EXTERNAL_REF_KEYS.TXID]: receipt.txid } : {})
			})
		});
	} catch (err: unknown) {
		consoleError(err);
	}

	progress?.(ProgressStepsLiquidiumWithdraw.DONE);
};
