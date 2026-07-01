import type { EthAddress } from '$eth/types/address';
import { liquidiumClient } from '$lib/api/liquidium.api';
import { TRACK_COUNT_LIQUIDIUM_SUBMITTED } from '$lib/constants/analytics.constants';
import {
	LIQUIDIUM_BORROWING_POWER_TOLERANCE,
	type LiquidiumHealthLevel
} from '$lib/constants/liquidium.constants';
import { ProgressStepsLiquidiumBorrow } from '$lib/enums/progress-steps';
import { createActiveUserTransaction } from '$lib/services/active-user-transactions.services';
import { trackEvent } from '$lib/services/analytics.services';
import { liquidiumWalletAdapter } from '$lib/services/liquidium-wallet-adapter.services';
import { getOrCreateLiquidiumProfile } from '$lib/services/liquidium.services';
import type { LiquidiumPortfolio } from '$lib/types/liquidium';
import { LIQUIDIUM_EXTERNAL_REF_KEYS } from '$lib/types/liquidium-active-tx';
import { consoleError } from '$lib/utils/console.utils';
import {
	liquidiumTrackingMetadata,
	toLiquidiumExternalRefs
} from '$lib/utils/liquidium-active-tx.utils';
import {
	liquidiumAssetTokenId,
	liquidiumHealthLevel,
	liquidiumProjectedHealthPercent,
	liquidiumResultingLtvPercent
} from '$lib/utils/liquidium.utils';
import { nonNullish } from '@dfinity/utils';
import type { Identity } from '@icp-sdk/core/agent';
import { Chain } from '@liquidium/client';

export interface LiquidiumBorrowPreview {
	resultingLtvPercent: number;
	projectedHealthPercent: number;
	healthLevel: LiquidiumHealthLevel;
	valid: boolean;
}

// Aggregate preview: borrowing is backed by the whole portfolio, so the cap and
// projected health come from the summary, not a single pool. Min-borrow lives in the form.
export const computeLiquidiumBorrowPreview = ({
	portfolio,
	newBorrowUsd
}: {
	portfolio: LiquidiumPortfolio;
	newBorrowUsd: number;
}): LiquidiumBorrowPreview => {
	const projectedHealthPercent = liquidiumProjectedHealthPercent({
		currentHealthPercent: portfolio.healthFactorPercent,
		newBorrowUsd,
		totalCollateralUsd: portfolio.totalSuppliedUsd,
		weightedLiquidationThresholdBps: portfolio.weightedLiquidationThresholdBps
	});
	const healthLevel = liquidiumHealthLevel(projectedHealthPercent);
	const exceedsBorrowingPower =
		newBorrowUsd > portfolio.availableBorrowsUsd * (1 + LIQUIDIUM_BORROWING_POWER_TOLERANCE);

	return {
		resultingLtvPercent: liquidiumResultingLtvPercent({
			totalDebtUsd: portfolio.totalBorrowedUsd,
			newBorrowUsd,
			totalCollateralUsd: portfolio.totalSuppliedUsd
		}),
		projectedHealthPercent,
		healthLevel,
		valid: !exceedsBorrowingPower
	};
};

// Borrow is a `signMessage` outflow (no oisy broadcast): resolve profile → `lending.borrow`
// → record an AUT so the modal closes before settlement. Funds land at `receiverAddress`.
export const executeLiquidiumBorrow = async ({
	identity,
	ethAddress,
	poolId,
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
	asset: string;
	amount: bigint;
	receiverAddress: string;
	displayAmount: string;
	progressStep?: string;
	progress?: (step: ProgressStepsLiquidiumBorrow) => void;
}): Promise<void> => {
	progress?.(ProgressStepsLiquidiumBorrow.INITIALIZATION);

	const profileId = await getOrCreateLiquidiumProfile({ identity, ethAddress });

	progress?.(ProgressStepsLiquidiumBorrow.SUBMIT);

	// `txid` may be unset until the protocol assigns it, so the AUT correlates by receipt `id`.
	const receipt = await liquidiumClient({ identity }).lending.borrow({
		profileId,
		poolId,
		amount,
		receiverAddress,
		signerWalletAddress: ethAddress,
		signerChain: Chain.ETH,
		signerWalletAdapter: liquidiumWalletAdapter({ identity })
	});

	trackEvent({
		name: TRACK_COUNT_LIQUIDIUM_SUBMITTED,
		metadata: liquidiumTrackingMetadata({
			action: 'borrow',
			token: asset,
			tokenAmount: displayAmount
		})
	});

	progress?.(ProgressStepsLiquidiumBorrow.REGISTER);

	// Best-effort: the borrow is already committed, so a bookkeeping failure must not
	// fail it (positions self-heal; mirrors Supply).
	try {
		await createActiveUserTransaction({
			identity,
			id: crypto.randomUUID(),
			data: {
				Liquidium: {
					token: liquidiumAssetTokenId(asset),
					action: { Borrow: null },
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

	progress?.(ProgressStepsLiquidiumBorrow.DONE);
};
