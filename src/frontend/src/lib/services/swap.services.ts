import { sendIcp, sendIcrc } from '$icp/services/ic-send.services';
import type { IcToken } from '$icp/types/ic-token';
import { kongSwap, kongTokens } from '$lib/api/kong_backend.api';
import { KONG_BACKEND_CANISTER_ID } from '$lib/constants/app.constants';
import { ProgressStepsSwap } from '$lib/enums/progress-steps';
import {
	kongSwapTokensStore,
	type KongSwapTokensStoreData
} from '$lib/stores/kong-swap-tokens.store';
import type { OptionIdentity } from '$lib/types/identity';
import type { Amount } from '$lib/types/send';
import { parseToken } from '$lib/utils/parse.utils';
import { waitAndTriggerWallet } from '$lib/utils/wallet.utils';
import type { Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';

export const swap = async ({
	identity,
	progress,
	sourceToken,
	destinationToken,
	swapAmount,
	receiveAmount,
	slippageValue
}: {
	identity: OptionIdentity;
	progress: (step: ProgressStepsSwap) => void;
	sourceToken: IcToken;
	destinationToken: IcToken;
	swapAmount: Amount;
	receiveAmount: bigint;
	slippageValue: Amount;
}) => {
	progress(ProgressStepsSwap.SWAP);

	const parsedSwapAmount = parseToken({
		value: `${swapAmount}`,
		unitName: sourceToken.decimals
	});
	const transferParams = {
		identity,
		token: sourceToken,
		amount: parsedSwapAmount,
		to: Principal.fromText(KONG_BACKEND_CANISTER_ID).toString()
	};
	const { standard, ledgerCanisterId } = sourceToken;

	const txBlockIndex =
		standard === 'icrc'
			? await sendIcrc({
					...transferParams,
					ledgerCanisterId
				})
			: await sendIcp(transferParams);

	await kongSwap({
		identity,
		sourceToken: sourceToken,
		destinationToken: destinationToken,
		sendAmount: parsedSwapAmount.toBigInt(),
		receiveAmount,
		maxSlippage: Number(slippageValue),
		payTransactionId: { BlockIndex: txBlockIndex }
	});

	progress(ProgressStepsSwap.UPDATE_UI);

	await waitAndTriggerWallet();
};

export const loadKongSwapTokens = async ({ identity }: { identity: Identity }): Promise<void> => {
	const kongSwapTokens = await kongTokens({
		identity
	});

	kongSwapTokensStore.setKongSwapTokens(
		kongSwapTokens.reduce<KongSwapTokensStoreData>(
			(acc, kongToken) =>
				'IC' in kongToken && !kongToken.IC.is_removed && kongToken.IC.chain === 'IC'
					? { ...acc, [kongToken.IC.symbol]: kongToken.IC }
					: acc,
			{}
		)
	);
};
