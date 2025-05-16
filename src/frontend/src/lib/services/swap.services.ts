import type { SwapAmountsReply } from '$declarations/kong_backend/kong_backend.did';
import { approve } from '$icp/api/icrc-ledger.api';
import { sendIcp, sendIcrc } from '$icp/services/ic-send.services';
import { loadCustomTokens } from '$icp/services/icrc.services';
import { nowInBigIntNanoSeconds } from '$icp/utils/date.utils';
import { isTokenIcrc } from '$icp/utils/icrc.utils';
import { setCustomToken } from '$lib/api/backend.api';
import { getPoolCanister } from '$lib/api/icp-swap-factory.api';
import { deposit, depositFrom, swap as swapIcp, withdraw } from '$lib/api/icp-swap-pool.api';
import { kongSwap, kongTokens } from '$lib/api/kong_backend.api';
import { KONG_BACKEND_CANISTER_ID, NANO_SECONDS_IN_MINUTE } from '$lib/constants/app.constants';
import { ICP_SWAP_POOL_FEE } from '$lib/constants/swap.constants';
import { ProgressStepsSwap } from '$lib/enums/progress-steps';
import { swapProviders } from '$lib/providers/swap.providers';
import { i18n } from '$lib/stores/i18n.store';
import {
	kongSwapTokensStore,
	type KongSwapTokensStoreData
} from '$lib/stores/kong-swap-tokens.store';
import {
	SwapProvider,
	type FetchSwapAmountsParams,
	type ICPSwapResult,
	type SwapMappedResult,
	type SwapParams
} from '$lib/types/swap';
import { toCustomToken } from '$lib/utils/custom-token.utils';
import { parseToken } from '$lib/utils/parse.utils';
import { calculateSlippage } from '$lib/utils/swap.utils';
import { waitAndTriggerWallet } from '$lib/utils/wallet.utils';
import type { Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { isNullish, nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export const swap = async ({
	identity,
	progress,
	sourceToken,
	destinationToken,
	swapAmount,
	receiveAmount,
	slippageValue,
	sourceTokenFee,
	isSourceTokenIcrc2
}: SwapParams) => {
	progress(ProgressStepsSwap.SWAP);

	const parsedSwapAmount = parseToken({
		value: `${swapAmount}`,
		unitName: sourceToken.decimals
	});
	const { ledgerCanisterId } = sourceToken;
	const transferParams = {
		identity,
		token: sourceToken,
		amount: parsedSwapAmount,
		to: Principal.fromText(KONG_BACKEND_CANISTER_ID).toString()
	};

	const txBlockIndex = !isSourceTokenIcrc2
		? isTokenIcrc(sourceToken)
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
			// for icrc2 tokens, we need to double sourceTokenFee to cover "approve" and "transfer" fees
			amount: parsedSwapAmount + sourceTokenFee * 2n,
			expiresAt: nowInBigIntNanoSeconds() + 5n * NANO_SECONDS_IN_MINUTE,
			spender: {
				owner: Principal.from(KONG_BACKEND_CANISTER_ID)
			}
		}));

	await kongSwap({
		identity,
		sourceToken,
		destinationToken,
		sendAmount: parsedSwapAmount,
		receiveAmount,
		maxSlippage: Number(slippageValue),
		...(nonNullish(txBlockIndex) ? { payTransactionId: { BlockIndex: txBlockIndex } } : {})
	});

	progress(ProgressStepsSwap.UPDATE_UI);

	if (!destinationToken.enabled) {
		await setCustomToken({
			token: toCustomToken({ ...destinationToken, enabled: true, networkKey: 'Icrc' }),
			identity,
			nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
		});
		await loadCustomTokens({ identity });
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

export const fetchSwapAmounts = async ({
	identity,
	sourceToken,
	destinationToken,
	amount,
	tokens,
	slippage
}: FetchSwapAmountsParams): Promise<SwapMappedResult[]> => {
	const sourceAmount = parseToken({
		value: `${amount}`,
		unitName: sourceToken.decimals
	});
	const enabledProviders = swapProviders.filter(({ isEnabled }) => isEnabled);

	const settledResults = await Promise.allSettled(
		enabledProviders.map(({ getQuote }) =>
			getQuote({ identity, sourceToken, destinationToken, sourceAmount })
		)
	);

	const mappedProvidersResults = enabledProviders.reduce<SwapMappedResult[]>(
		(acc, provider, index) => {
			const result = settledResults[index];
			if (result.status !== 'fulfilled') {
				return acc;
			}

			let mapped: SwapMappedResult | undefined;

			if (provider.key === SwapProvider.KONG_SWAP) {
				const swap = result.value as SwapAmountsReply;
				mapped = provider.mapQuoteResult({ swap, tokens });
			} else if (provider.key === SwapProvider.ICP_SWAP) {
				const swap = result.value as ICPSwapResult;
				mapped = provider.mapQuoteResult({ swap, slippage });
			}

			if (mapped && Number(mapped.receiveAmount) > 0) {
				acc.push(mapped);
			}

			return acc;
		},
		[]
	);

	return mappedProvidersResults.sort((a, b) => Number(b.receiveAmount) - Number(a.receiveAmount));
};

export const fetchIcpSwap = async ({
	identity,
	progress,
	sourceToken,
	destinationToken,
	swapAmount,
	receiveAmount,
	slippageValue,
	sourceTokenFee,
	isSourceTokenIcrc2
}: SwapParams): Promise<void> => {
	progress(ProgressStepsSwap.SWAP);

	const parsedSwapAmount = parseToken({
		value: `${swapAmount}`,
		unitName: sourceToken.decimals
	});

	const pool = await getPoolCanister({
		identity,
		token0: { address: sourceToken.ledgerCanisterId, standard: sourceToken.standard },
		token1: { address: destinationToken.ledgerCanisterId, standard: destinationToken.standard },
		nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity,
		fee: ICP_SWAP_POOL_FEE
	});

	if (isNullish(pool)) {
		throw new Error(get(i18n).swap.error.pool_not_found);
	}

	const slippageMinimum = calculateSlippage({
		quoteAmount: receiveAmount,
		slippagePercentage: Number(slippageValue)
	});

	const transferParams = {
		identity,
		token: sourceToken,
		amount: parsedSwapAmount,
		to: pool.canisterId.toString(),
		ledgerCanisterId: sourceToken.ledgerCanisterId
	};

	try {
		if (!isSourceTokenIcrc2) {
			await sendIcrc(transferParams);
			await deposit({
				identity,
				canisterId: pool.canisterId.toString(),
				token: sourceToken.ledgerCanisterId,
				amount: parsedSwapAmount,
				fee: sourceTokenFee
			});
		} else {
			await approve({
				identity,
				ledgerCanisterId: sourceToken.ledgerCanisterId,
				amount: parsedSwapAmount + sourceTokenFee * 2n,
				expiresAt: nowInBigIntNanoSeconds() + 5n * NANO_SECONDS_IN_MINUTE,
				spender: { owner: pool.canisterId }
			});

			await depositFrom({
				identity,
				canisterId: pool.canisterId.toString(),
				token: sourceToken.ledgerCanisterId,
				amount: parsedSwapAmount,
				fee: sourceTokenFee
			});
		}
	} catch (_: unknown) {
		throw new Error(get(i18n).swap.error.deposit_error);
	}

	try {
		await swapIcp({
			identity,
			canisterId: pool.canisterId.toString(),
			amountIn: parsedSwapAmount.toString(),
			zeroForOne: pool.token0.address === sourceToken.ledgerCanisterId,
			amountOutMinimum: slippageMinimum.toString()
		});
	} catch (_: unknown) {
		try {
			await withdraw({
				identity,
				canisterId: pool.canisterId.toString(),
				token: sourceToken.ledgerCanisterId,
				amount: parsedSwapAmount,
				fee: sourceTokenFee
			});
		} catch (_: unknown) {
			throw new Error(get(i18n).swap.error.withdraw_failed);
		}

		throw new Error(get(i18n).swap.error.swap_failed_withdraw_success);
	}

	try {
		await withdraw({
			identity,
			canisterId: pool.canisterId.toString(),
			token: destinationToken.ledgerCanisterId,
			amount: receiveAmount,
			fee: destinationToken.fee
		});
	} catch (_: unknown) {
		throw new Error(get(i18n).swap.error.withdraw_failed);
	}

	progress(ProgressStepsSwap.UPDATE_UI);

	if (!destinationToken.enabled) {
		await setCustomToken({
			token: toCustomToken({ ...destinationToken, enabled: true, networkKey: 'Icrc' }),
			identity,
			nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
		});
		await loadCustomTokens({ identity });
	}

	await waitAndTriggerWallet();
};
