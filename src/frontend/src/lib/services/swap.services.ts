import { approve } from '$icp/api/icrc-ledger.api';
import { sendIcp, sendIcrc } from '$icp/services/ic-send.services';
import type { IcToken } from '$icp/types/ic-token';
import { nowInBigIntNanoSeconds } from '$icp/utils/date.utils';
import { kongSwap, kongTokens } from '$lib/api/kong_backend.api';
import { KONG_BACKEND_CANISTER_ID, NANO_SECONDS_IN_MINUTE } from '$lib/constants/app.constants';
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
import { nonNullish } from '@dfinity/utils';
import { type SaveCustomToken } from '$icp/services/ic-custom-tokens.services';
import { setCustomToken } from '$lib/api/backend.api';
import { toCustomToken } from '$icp-eth/services/custom-token.services';
import { get } from 'svelte/store';
import { i18n } from '$lib/stores/i18n.store';
import { loadCustomTokens } from '$icp/services/icrc.services';

export const swap = async ({
	identity,
	progress,
	sourceToken,
	destinationToken,
	swapAmount,
	receiveAmount,
	slippageValue,
	isSourceTokenIcrc2
}: {
	identity: OptionIdentity;
	progress: (step: ProgressStepsSwap) => void;
	sourceToken: IcToken;
	destinationToken: IcToken;
	swapAmount: Amount;
	receiveAmount: bigint;
	slippageValue: Amount;
	isSourceTokenIcrc2: boolean;
}) => {
	progress(ProgressStepsSwap.SWAP);

	const parsedSwapAmount = parseToken({
		value: `${swapAmount}`,
		unitName: sourceToken.decimals
	});
	const { standard, ledgerCanisterId } = sourceToken;
	const transferParams = {
		identity,
		token: sourceToken,
		amount: parsedSwapAmount,
		to: Principal.fromText(KONG_BACKEND_CANISTER_ID).toString()
	};

	const txBlockIndex = !isSourceTokenIcrc2
		? standard === 'icrc'
			? await sendIcrc({
					...transferParams,
					ledgerCanisterId
				})
			: await sendIcp(transferParams)
		: undefined;

	isSourceTokenIcrc2 &&
		(await approve({
			identity,
			ledgerCanisterId,
			amount: parsedSwapAmount.toBigInt() + (sourceToken.fee ?? 0n),
			expiresAt: nowInBigIntNanoSeconds() + 5n * NANO_SECONDS_IN_MINUTE,
			spender: {
				owner: Principal.from(KONG_BACKEND_CANISTER_ID)
			}
		}));

	await kongSwap({
		identity,
		sourceToken: sourceToken,
		destinationToken: destinationToken,
		sendAmount: parsedSwapAmount.toBigInt(),
		receiveAmount,
		maxSlippage: Number(slippageValue),
		...(nonNullish(txBlockIndex) ? { payTransactionId: { BlockIndex: txBlockIndex } } : {})
	});

	progress(ProgressStepsSwap.UPDATE_UI);

	const customTokenToSave: SaveCustomToken = destinationToken as unknown as SaveCustomToken;
	if (!customTokenToSave.enabled) {
		customTokenToSave.enabled = true;
		await setCustomToken({
			token: toCustomToken(customTokenToSave),
			identity,
			nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
		});

		await loadCustomTokens({identity});
	}

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
