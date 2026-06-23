import type { TokenId } from '$declarations/backend/backend.did';
import type { EthAddress } from '$eth/types/address';
import { liquidiumClient } from '$lib/api/liquidium.api';
import { TRACK_COUNT_LIQUIDIUM_SUBMITTED } from '$lib/constants/analytics.constants';
import { LIQUIDIUM_ASSET_LEDGER_CANISTER_IDS } from '$lib/constants/liquidium.constants';
import { ProgressStepsLiquidiumSupply } from '$lib/enums/progress-steps';
import { createActiveUserTransaction } from '$lib/services/active-user-transactions.services';
import { trackEvent } from '$lib/services/analytics.services';
import { getOrCreateLiquidiumProfile } from '$lib/services/liquidium.services';
import { LIQUIDIUM_EXTERNAL_REF_KEYS } from '$lib/types/liquidium-active-tx';
import { consoleError } from '$lib/utils/console.utils';
import {
	liquidiumTrackingMetadata,
	toLiquidiumExternalRefs
} from '$lib/utils/liquidium-active-tx.utils';
import { assertNonNullish, nonNullish } from '@dfinity/utils';
import type { Identity } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';
import {
	SupplyAction,
	type Asset,
	type Chain,
	type NativeAddressSupplyTarget
} from '@liquidium/client';

// Liquidium's per-inflow processing fee (base units of `asset`), deducted by the
// protocol from each inflow.
export const estimateLiquidiumInflowFee = async ({
	identity,
	asset,
	chain
}: {
	identity: Identity;
	asset: string;
	chain: string;
}): Promise<bigint> => {
	const { totalFee } = await liquidiumClient({ identity }).lending.estimateInflowFee({
		asset: asset as Asset,
		chain: chain as Chain
	});

	return totalFee;
};

// Broadcasts `amount` base units (gross = supply + provider fee) to the native
// target and returns the txid the AUT poller correlates on. Implemented by the
// wizard, which owns oisy's per-chain fee/UTXO machinery.
export type LiquidiumSupplyBroadcast = (params: {
	target: NativeAddressSupplyTarget;
	amount: bigint;
}) => Promise<string>;

// Backend `TokenId` for the AUT record — the ck-asset ledger backing the asset.
const liquidiumAssetTokenId = (asset: string): TokenId => {
	const ledgerCanisterId = LIQUIDIUM_ASSET_LEDGER_CANISTER_IDS[asset];

	assertNonNullish(ledgerCanisterId, `No ICRC ledger configured for Liquidium asset ${asset}`);

	return { Icrc: Principal.fromText(ledgerCanisterId) };
};

// Supplies `amount` (base units) of `asset`: resolve/create profile → broadcast the
// transfer → record an AUT so the modal can close before settlement.
//
// The protocol deducts its inflow fee from the inflow, so we transfer
// `amount + inflowFee` to credit the user's `amount` (the recorded position stays net).
// Only the `nativeAddress` rail is supported (the only one v1 assets return via the
// SDK's `resolveSupplyTarget`); `icrcAccount` would need contract-interaction, which we don't request.
export const executeLiquidiumSupply = async ({
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
	broadcast: LiquidiumSupplyBroadcast;
	progress?: (step: ProgressStepsLiquidiumSupply) => void;
}): Promise<void> => {
	progress?.(ProgressStepsLiquidiumSupply.INITIALIZATION);

	const profileId = await getOrCreateLiquidiumProfile({ identity, ethAddress });

	const flow = await liquidiumClient({ identity }).lending.supply({
		profileId,
		poolId,
		action: SupplyAction.deposit
	});

	if (flow.target.type !== 'nativeAddress') {
		throw new Error(
			`Liquidium supply: unsupported "${flow.target.type}" target for ${asset} (only nativeAddress is supported)`
		);
	}

	progress?.(ProgressStepsLiquidiumSupply.TRANSFER);

	// Gross transfer = net supply + provider inflow fee (deducted on arrival).
	const txid = await broadcast({ target: flow.target, amount: amount + inflowFee });

	// Submitted on-chain; success/error events fire from the AUT poller once it settles.
	trackEvent({
		name: TRACK_COUNT_LIQUIDIUM_SUBMITTED,
		metadata: liquidiumTrackingMetadata({
			action: 'supply',
			token: asset,
			tokenAmount: displayAmount
		})
	});

	progress?.(ProgressStepsLiquidiumSupply.REGISTER);

	// Point of no return: submit (txid indexing hint) + AUT row are best-effort.
	// The protocol detects the inflow on-chain regardless and positions self-heal,
	// so a failure here must not fail the supply (mirrors the OneSec swap flow).
	try {
		await flow.submit({ txid });

		await createActiveUserTransaction({
			identity,
			id: crypto.randomUUID(),
			data: {
				Liquidium: {
					token: liquidiumAssetTokenId(asset),
					action: { Supply: null },
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

	progress?.(ProgressStepsLiquidiumSupply.DONE);
};
