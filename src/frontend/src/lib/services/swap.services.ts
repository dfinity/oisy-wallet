import type { SwapAmountsReply } from '$declarations/kong_backend/kong_backend.did';
import { setCustomToken as setCustomIcrcToken } from '$icp-eth/services/custom-token.services';
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
	SwapErrorCodes,
	SwapProvider,
	type FetchSwapAmountsParams,
	type ICPSwapResult,
	type IcpSwapManualWithdrawParams,
	type IcpSwapWithdrawParams,
	type IcpSwapWithdrawResponse,
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
import { trackEvent } from './analytics.services';
import { throwSwapError } from './swap-errors.services';
import { autoLoadSingleToken } from './token.services';

export const fetchKongSwap = async ({
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
	setFailedProgressStep,
	sourceToken,
	destinationToken,
	swapAmount,
	receiveAmount,
	slippageValue,
	sourceTokenFee,
	isSourceTokenIcrc2,
	tryToWithdraw = false,
	withdrawDestinationTokens = false
}: SwapParams): Promise<void> => {
	progress(ProgressStepsSwap.SWAP);

	const parsedSwapAmount = parseToken({
		value: `${swapAmount}`,
		unitName: sourceToken.decimals
	});

	const { ledgerCanisterId: sourceLedgerCanisterId, standard: sourceStandard } = sourceToken;
	const {
		ledgerCanisterId: destinationLedgerCanisterId,
		standard: destinationStandard,
		fee: destinationTokenFee
	} = destinationToken;

	const pool = await getPoolCanister({
		identity,
		token0: { address: sourceLedgerCanisterId, standard: sourceStandard },
		token1: { address: destinationLedgerCanisterId, standard: destinationStandard },
		nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity,
		fee: ICP_SWAP_POOL_FEE
	});

	if (isNullish(pool)) {
		throw new Error(get(i18n).swap.error.pool_not_found);
	}

	const poolCanisterId = pool.canisterId.toString();

	const slippageMinimum = calculateSlippage({
		quoteAmount: receiveAmount,
		slippagePercentage: Number(slippageValue)
	});

	const transferParams = {
		identity,
		token: sourceToken,
		amount: parsedSwapAmount,
		to: poolCanisterId,
		ledgerCanisterId: sourceLedgerCanisterId
	};

	// TODO: Revisit this logic once `tryToWithdraw` and `withdrawDestinationTokens` are provided.
	// Let's keep it like this for now and adjust it later.
	if (tryToWithdraw) {
		if (!withdrawDestinationTokens) {
			setFailedProgressStep?.(ProgressStepsSwap.SWAP);
		}

		progress(ProgressStepsSwap.WITHDRAW);

		const { code, message, variant } = await performManualWithdraw({
			withdrawDestinationTokens,
			setFailedProgressStep,
			identity,
			canisterId: poolCanisterId,
			tokenId: withdrawDestinationTokens ? destinationLedgerCanisterId : sourceLedgerCanisterId,
			amount: withdrawDestinationTokens ? receiveAmount : parsedSwapAmount,
			fee: withdrawDestinationTokens ? destinationTokenFee : sourceTokenFee,
			token: withdrawDestinationTokens ? destinationToken : sourceToken
		});

		throwSwapError({
			code,
			message,
			variant
		});
	}

	try {
		if (!isSourceTokenIcrc2) {
			await sendIcrc(transferParams);
			await deposit({
				identity,
				canisterId: poolCanisterId,
				token: sourceLedgerCanisterId,
				amount: parsedSwapAmount,
				fee: sourceTokenFee
			});
		} else {
			await approve({
				identity,
				ledgerCanisterId: sourceLedgerCanisterId,
				// for icrc2 tokens, we need to double sourceTokenFee to cover "approve" and "transfer" fees
				amount: parsedSwapAmount + sourceTokenFee * 2n,
				// Sets approve expiration to 5 minutes ahead to allow enough time for the full swap flow
				expiresAt: nowInBigIntNanoSeconds() + 5n * NANO_SECONDS_IN_MINUTE,
				spender: { owner: pool.canisterId }
			});

			await depositFrom({
				identity,
				canisterId: poolCanisterId,
				token: sourceLedgerCanisterId,
				amount: parsedSwapAmount,
				fee: sourceTokenFee
			});
		}
	} catch (err: unknown) {
		console.error(err);

		throwSwapError({
			code: SwapErrorCodes.DEPOSIT_FAILED,
			message: get(i18n).swap.error.deposit_error
		});
	}

	try {
		// Perform the actual token swap after a successful deposit
		await swapIcp({
			identity,
			canisterId: poolCanisterId,
			amountIn: parsedSwapAmount.toString(),
			zeroForOne: pool.token0.address === sourceLedgerCanisterId,
			amountOutMinimum: slippageMinimum.toString()
		});
	} catch (err: unknown) {
		console.error(err);

		try {
			// If the swap fails, attempt to refund the user's original tokens
			await withdraw({
				identity,
				canisterId: poolCanisterId,
				token: sourceLedgerCanisterId,
				amount: parsedSwapAmount,
				fee: sourceTokenFee
			});
		} catch (err: unknown) {
			console.error(err);
			// If even the refund fails, show a critical error requiring manual user action
			throwSwapError({
				code: SwapErrorCodes.WITHDRAW_FAILED,
				message: get(i18n).swap.error.withdraw_failed
			});
		}
		// Inform the user that the swap failed, but refund was successful
		throwSwapError({
			code: SwapErrorCodes.SWAP_FAILED_WITHDRAW_SUCESS,
			message: get(i18n).swap.error.swap_failed_withdraw_success
		});
	}

	try {
		// Withdraw the swapped destination tokens from the pool
		await withdraw({
			identity,
			canisterId: poolCanisterId,
			token: destinationLedgerCanisterId,
			amount: receiveAmount,
			fee: destinationTokenFee
		});
	} catch (err: unknown) {
		console.error(err);

		throwSwapError({
			code: SwapErrorCodes.WITHDRAW_FAILED,
			message: get(i18n).swap.error.withdraw_failed
		});
	}

	progress(ProgressStepsSwap.UPDATE_UI);

	if (!destinationToken.enabled) {
		await autoLoadSingleToken({
			identity,
			token: destinationToken,
			setToken: setCustomIcrcToken,
			loadTokens: loadCustomTokens,
			errorMessage: get(i18n).init.error.icrc_custom_token
		});
	}

	await waitAndTriggerWallet();
};

export const swapService = {
	[SwapProvider.ICP_SWAP]: fetchIcpSwap,
	[SwapProvider.KONG_SWAP]: fetchKongSwap,
	//TODO: Will be fixed and updated in the next PRs
	[SwapProvider.VELORA]: () => {
		throw new Error(get(i18n).swap.error.unexpected);
	}
};

export const withdrawICPSwapAfterFailedSwap = async ({
	identity,
	canisterId,
	tokenId,
	amount,
	fee,
	setFailedProgressStep
}: IcpSwapWithdrawParams): Promise<IcpSwapWithdrawResponse> => {
	const baseParams = {
		identity,
		canisterId,
		token: tokenId,
		amount,
		fee
	};
	try {
		await withdraw(baseParams);

		return {
			code: SwapErrorCodes.SWAP_FAILED_WITHDRAW_SUCESS,
			message: get(i18n).swap.error.swap_failed_withdraw_success
		};
	} catch (_: unknown) {
		try {
			// Second withdrawal attempt
			await withdraw(baseParams);

			return {
				code: SwapErrorCodes.SWAP_FAILED_2ND_WITHDRAW_SUCCESS,
				message: get(i18n).swap.error.swap_failed_withdraw_success
			};
		} catch (_: unknown) {
			setFailedProgressStep?.(ProgressStepsSwap.WITHDRAW);

			return { code: SwapErrorCodes.SWAP_FAILED_WITHDRAW_FAILED, variant: 'error' };
		}
	}
};

export const performManualWithdraw = async ({
	withdrawDestinationTokens,
	identity,
	canisterId,
	tokenId,
	amount,
	fee,
	token,
	setFailedProgressStep
}: IcpSwapManualWithdrawParams): Promise<IcpSwapWithdrawResponse> => {
	try {
		await withdraw({
			identity,
			canisterId,
			token: tokenId,
			amount,
			fee
		});

		trackEvent({
			name: SwapErrorCodes.ICP_SWAP_WITHDRAW_SUCCESS,
			metadata: {
				token: token.symbol,
				tokenDirection: withdrawDestinationTokens ? 'receive' : 'pay'
			}
		});

		return {
			code: SwapErrorCodes.ICP_SWAP_WITHDRAW_SUCCESS,
			message: withdrawDestinationTokens
				? get(i18n).swap.error.swap_sucess_manually_withdraw_success
				: get(i18n).swap.error.manually_withdraw_success
		};
	} catch (_: unknown) {
		trackEvent({
			name: SwapErrorCodes.ICP_SWAP_WITHDRAW_FAILED,
			metadata: {
				token: token.symbol,
				tokenOrigin: withdrawDestinationTokens ? 'receive' : 'pay'
			}
		});

		setFailedProgressStep?.(ProgressStepsSwap.WITHDRAW);

		return {
			code: SwapErrorCodes.ICP_SWAP_WITHDRAW_FAILED,
			variant: 'error'
		};
	}
};
