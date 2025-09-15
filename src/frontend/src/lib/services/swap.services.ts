import type { SwapAmountsReply } from '$declarations/kong_backend/kong_backend.did';
import { approve as approveToken, erc20ContractAllowance } from '$eth/services/send.services';
import { swap } from '$eth/services/swap.services';
import type { Erc20Token } from '$eth/types/erc20';
import { getCompactSignature, getSignParamsEIP712 } from '$eth/utils/eip712.utils';
import { isDefaultEthereumToken } from '$eth/utils/eth.utils';
import { setCustomToken as setCustomIcrcToken } from '$icp-eth/services/custom-token.services';
import { approve } from '$icp/api/icrc-ledger.api';
import { sendIcp, sendIcrc } from '$icp/services/ic-send.services';
import { loadCustomTokens } from '$icp/services/icrc.services';
import type { IcToken } from '$icp/types/ic-token';
import { nowInBigIntNanoSeconds } from '$icp/utils/date.utils';
import { isTokenIcrc } from '$icp/utils/icrc.utils';
import { setCustomToken } from '$lib/api/backend.api';
import { getPoolCanister } from '$lib/api/icp-swap-factory.api';
import {
	deposit,
	depositFrom,
	getPoolMetadata,
	getUserUnusedBalance,
	swap as swapIcp,
	withdraw
} from '$lib/api/icp-swap-pool.api';
import { kongSwap, kongTokens } from '$lib/api/kong_backend.api';
import { signPrehash } from '$lib/api/signer.api';
import {
	KONG_BACKEND_CANISTER_ID,
	NANO_SECONDS_IN_MINUTE,
	ZERO
} from '$lib/constants/app.constants';
import {
	ICP_SWAP_POOL_FEE,
	SWAP_DELTA_INTERVAL_MS,
	SWAP_DELTA_TIMEOUT_MS,
	SWAP_MODE,
	SWAP_SIDE
} from '$lib/constants/swap.constants';
import { ProgressStepsSwap } from '$lib/enums/progress-steps';
import { swapProviders } from '$lib/providers/swap.providers';
import { i18n } from '$lib/stores/i18n.store';
import {
	kongSwapTokensStore,
	type KongSwapTokensStoreData
} from '$lib/stores/kong-swap-tokens.store';
import type { EthAddress } from '$lib/types/address';
import {
	SwapErrorCodes,
	SwapProvider,
	type CheckDeltaOrderStatusParams,
	type FetchSwapAmountsParams,
	type GetQuoteParams,
	type ICPSwapResult,
	type IcpSwapManualWithdrawParams,
	type IcpSwapWithdrawParams,
	type IcpSwapWithdrawResponse,
	type SwapMappedResult,
	type SwapParams,
	type SwapVeloraParams,
	type VeloraQuoteParams
} from '$lib/types/swap';
import { toCustomToken } from '$lib/utils/custom-token.utils';
import { isNetworkIdICP } from '$lib/utils/network.utils';
import { parseToken } from '$lib/utils/parse.utils';
import {
	calculateSlippage,
	geSwapEthTokenAddress,
	getWithdrawableToken,
	mapVeloraMarketSwapResult,
	mapVeloraSwapResult
} from '$lib/utils/swap.utils';
import { waitAndTriggerWallet } from '$lib/utils/wallet.utils';
import type { Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { isNullish, nonNullish } from '@dfinity/utils';
import {
	constructSimpleSDK,
	type DeltaAuction,
	type DeltaPrice,
	type OptimalRate
} from '@velora-dex/sdk';
import { get } from 'svelte/store';
import { trackEvent } from './analytics.services';
import { retryWithDelay } from './rest.services';
import { throwSwapError } from './swap-errors.services';
import { autoLoadSingleToken } from './token.services';
import { OISY_URL_HOSTNAME } from '$lib/constants/oisy.constants';

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
			: await sendIcp({
					...transferParams,
					ledgerCanisterId
				})
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
	slippage,
	isSourceTokenIcrc2,
	userEthAddress
}: FetchSwapAmountsParams): Promise<SwapMappedResult[]> => {
	const sourceAmount = parseToken({
		value: `${amount}`,
		unitName: sourceToken.decimals
	});

	return isNetworkIdICP(sourceToken.network.id)
		? await fetchSwapAmountsICP({
				identity,
				sourceToken,
				destinationToken,
				amount: sourceAmount,
				tokens,
				slippage,
				isSourceTokenIcrc2
			})
		: await fetchSwapAmountsEVM({
				sourceToken: sourceToken as Erc20Token,
				destinationToken: destinationToken as Erc20Token,
				amount: sourceAmount,
				userEthAddress
			});
};

const fetchSwapAmountsICP = async ({
	identity,
	sourceToken,
	destinationToken,
	amount,
	tokens,
	slippage,
	isSourceTokenIcrc2
}: Omit<FetchSwapAmountsParams, 'userEthAddress' | 'amount'> & { amount: bigint }): Promise<
	SwapMappedResult[]
> => {
	const enabledProviders = swapProviders.filter(({ isEnabled }) => isEnabled);

	const settledResults = await Promise.allSettled(
		enabledProviders.map(({ getQuote }) =>
			getQuote({
				identity,
				sourceToken: sourceToken as IcToken,
				destinationToken: destinationToken as IcToken,
				sourceAmount: amount
			})
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
			} else if (provider.key === SwapProvider.ICP_SWAP && isSourceTokenIcrc2) {
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

		const { code, message, variant, swapSucceded } = await performManualWithdraw({
			withdrawDestinationTokens,
			setFailedProgressStep,
			identity,
			canisterId: poolCanisterId,
			sourceToken,
			destinationToken
		});

		throwSwapError({
			code,
			message,
			variant,
			swapSucceded
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

		setFailedProgressStep?.(ProgressStepsSwap.SWAP);

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
	} catch (_: unknown) {
		setFailedProgressStep?.(ProgressStepsSwap.SWAP);
		progress(ProgressStepsSwap.WITHDRAW);

		// Swap failed, try to withdraw the source tokens
		const { code, message, variant } = await withdrawICPSwapAfterFailedSwap({
			identity,
			canisterId: poolCanisterId,
			tokenId: sourceLedgerCanisterId,
			amount: parsedSwapAmount,
			fee: sourceTokenFee,
			setFailedProgressStep,
			sourceToken,
			destinationToken
		});

		progress(ProgressStepsSwap.UPDATE_UI);

		throwSwapError({
			code,
			message,
			variant
		});
	}

	try {
		progress(ProgressStepsSwap.WITHDRAW);
		// Swap succeeded, now withdraw the destination tokens
		await withdraw({
			identity,
			canisterId: poolCanisterId,
			token: destinationLedgerCanisterId,
			amount: receiveAmount,
			fee: destinationTokenFee
		});
	} catch (_: unknown) {
		try {
			await withdrawUserUnusedBalance({
				identity,
				canisterId: poolCanisterId,
				sourceToken,
				destinationToken
			});

			progress(ProgressStepsSwap.UPDATE_UI);
		} catch (_: unknown) {
			setFailedProgressStep?.(ProgressStepsSwap.WITHDRAW);

			throwSwapError({
				code: SwapErrorCodes.SWAP_SUCCESS_WITHDRAW_FAILED,
				variant: 'error',
				swapSucceded: true
			});
		}
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
	setFailedProgressStep,
	sourceToken,
	destinationToken
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
			code: SwapErrorCodes.SWAP_FAILED_WITHDRAW_SUCCESS,
			message: get(i18n).swap.error.swap_failed_withdraw_success
		};
	} catch (_: unknown) {
		try {
			// Second withdrawal attempt
			await withdrawUserUnusedBalance({
				identity,
				canisterId,
				sourceToken,
				destinationToken
			});

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
	setFailedProgressStep,
	sourceToken,
	destinationToken
}: IcpSwapManualWithdrawParams): Promise<IcpSwapWithdrawResponse> => {
	try {
		await withdrawUserUnusedBalance({ identity, canisterId, sourceToken, destinationToken });

		trackEvent({
			name: SwapErrorCodes.ICP_SWAP_WITHDRAW_SUCCESS,
			metadata: {
				dApp: SwapProvider.ICP_SWAP,
				token: withdrawDestinationTokens ? destinationToken.symbol : sourceToken.symbol,
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
				dApp: SwapProvider.ICP_SWAP,
				token: withdrawDestinationTokens ? destinationToken.symbol : sourceToken.symbol,
				tokenDirection: withdrawDestinationTokens ? 'receive' : 'pay'
			}
		});

		setFailedProgressStep?.(ProgressStepsSwap.WITHDRAW);

		return {
			code: SwapErrorCodes.ICP_SWAP_WITHDRAW_FAILED,
			variant: 'error',
			swapSucceded: withdrawDestinationTokens
		};
	}
};

// This wrapper keeps the return type uniform (array of SwapMappedResult),
// so we can plug in more DEX quote providers later without changing callers.
// Each provider can push its mapped result into the array, easy extendability.
export const fetchSwapAmountsEVM = async ({
	sourceToken,
	destinationToken,
	amount,
	userEthAddress
}: VeloraQuoteParams): Promise<SwapMappedResult[]> => {
	if (isNullish(userEthAddress)) {
		return [];
	}
	const swapAmountsResults = await fetchVeloraSwapAmount({
		sourceToken,
		destinationToken,
		amount,
		userEthAddress
	});

	if (isNullish(swapAmountsResults)) {
		return [];
	}

	return [swapAmountsResults];
};

const fetchVeloraSwapAmount = async ({
	sourceToken,
	destinationToken,
	amount,
	userEthAddress
}: VeloraQuoteParams & { userEthAddress: EthAddress }): Promise<SwapMappedResult | null> => {
	const {
		network: { chainId: destChainId }
	} = destinationToken;

	const {
		network: { chainId: srcChainId }
	} = sourceToken;

	const sdk = constructSimpleSDK({
		chainId: Number(srcChainId),
		fetch: window.fetch
	});

	const baseParams: GetQuoteParams = {
		amount: `${amount}`,
		srcToken: geSwapEthTokenAddress(sourceToken),
		destToken: geSwapEthTokenAddress(destinationToken),
		srcDecimals: sourceToken.decimals,
		destDecimals: destinationToken.decimals,
		mode: SWAP_MODE,
		side: SWAP_SIDE,
		userAddress: userEthAddress,
		partner: OISY_URL_HOSTNAME
	};

	const data = await sdk.quote.getQuote(
		srcChainId !== destChainId ? { ...baseParams, destChainId: Number(destChainId) } : baseParams
	);

	if ('delta' in data) {
		return mapVeloraSwapResult(data.delta);
	}

	if ('market' in data) {
		return mapVeloraMarketSwapResult(data.market);
	}

	return null;
};

export const withdrawUserUnusedBalance = async ({
	identity,
	canisterId,
	sourceToken,
	destinationToken
}: Omit<
	IcpSwapManualWithdrawParams,
	'setFailedProgressStep' | 'withdrawDestinationTokens'
>): Promise<void> => {
	const { token0, token1 } = await getPoolMetadata({ identity, canisterId });
	const { balance0, balance1 } = await getUserUnusedBalance({
		identity,
		canisterId,
		principal: identity.getPrincipal()
	});

	if (balance0 === ZERO && balance1 === ZERO) {
		throw new Error('No unused balance to withdraw');
	}

	if (balance0 !== ZERO) {
		const token = getWithdrawableToken({
			tokenAddress: token0.address,
			sourceToken,
			destinationToken
		});
		await withdraw({
			identity,
			canisterId,
			token: token.ledgerCanisterId,
			amount: balance0,
			fee: token.fee
		});
	}

	if (balance1 !== ZERO) {
		const token = getWithdrawableToken({
			tokenAddress: token1.address,
			sourceToken,
			destinationToken
		});
		await withdraw({
			identity,
			canisterId,
			token: token.ledgerCanisterId,
			amount: balance1,
			fee: token.fee
		});
	}
};

export const fetchVeloraDeltaSwap = async ({
	identity,
	progress,
	sourceToken,
	destinationToken,
	swapAmount,
	sourceNetwork,
	receiveAmount,
	slippageValue,
	destinationNetwork,
	userAddress,
	gas,
	maxFeePerGas,
	maxPriorityFeePerGas,
	swapDetails
}: SwapVeloraParams): Promise<void> => {
	const parsedSwapAmount = parseToken({
		value: `${swapAmount}`,
		unitName: sourceToken.decimals
	});

	const sdk = constructSimpleSDK({
		chainId: Number(sourceNetwork.chainId),
		fetch: window.fetch
	});

	const deltaContract = await sdk.delta.getDeltaContract();

	const slippageMinimum = calculateSlippage({
		quoteAmount: receiveAmount,
		slippagePercentage: Number(slippageValue)
	});

	if (isNullish(deltaContract)) {
		return;
	}

	await approveToken({
		token: sourceToken,
		from: userAddress,
		to: deltaContract,
		amount: parsedSwapAmount,
		sourceNetwork,
		identity,
		gas,
		maxFeePerGas,
		shouldSwapWithApproval: true,
		maxPriorityFeePerGas,
		progress,
		progressSteps: ProgressStepsSwap
	});

	progress(ProgressStepsSwap.SWAP);

	const signableOrderData = await sdk.delta.buildDeltaOrder({
		deltaPrice: swapDetails as DeltaPrice,
		owner: userAddress,
		srcToken: sourceToken.address,
		destToken: destinationToken.address,
		srcAmount: `${parsedSwapAmount}`,
		destAmount: `${slippageMinimum}`,
		destChainId: Number(destinationNetwork.chainId),
		partner: OISY_URL_HOSTNAME
	});

	const hash = getSignParamsEIP712(signableOrderData);

	const signature = await signPrehash({
		hash,
		identity
	});

	const compactSignature = getCompactSignature(signature);

	const deltaAuction = await sdk.delta.postDeltaOrder({
		order: signableOrderData.data,
		signature: compactSignature
	});

	await checkDeltaOrderStatus({
		sdk,
		auctionId: deltaAuction.id
	});

	progress(ProgressStepsSwap.UPDATE_UI);

	await waitAndTriggerWallet();
};

const checkDeltaOrderStatus = async ({
	sdk,
	auctionId,
	timeoutMs = SWAP_DELTA_TIMEOUT_MS,
	intervalMs = SWAP_DELTA_INTERVAL_MS
}: CheckDeltaOrderStatusParams): Promise<void> => {
	const deadline = Date.now() + timeoutMs;

	while (Date.now() < deadline) {
		const auction = await sdk.delta.getDeltaOrderById(auctionId);

		if (isExecutedDeltaAuction({ auction })) {
			return;
		}

		await new Promise((r) => setTimeout(r, intervalMs));
	}
};

const isExecutedDeltaAuction = ({
	auction,
	waitForCrosschain = true
}: {
	auction: Omit<DeltaAuction, 'signature'>;
	waitForCrosschain?: boolean;
}): boolean => {
	if (auction.status !== 'EXECUTED') {
		return false;
	}

	if (waitForCrosschain && auction.order.bridge.destinationChainId !== 0) {
		return auction.bridgeStatus === 'filled';
	}

	return true;
};

export const fetchVeloraMarketSwap = async ({
	identity,
	progress,
	sourceToken,
	destinationToken,
	swapAmount,
	sourceNetwork,
	slippageValue,
	userAddress,
	gas,
	maxFeePerGas,
	maxPriorityFeePerGas,
	swapDetails
}: SwapVeloraParams): Promise<void> => {
	const parsedSwapAmount = parseToken({
		value: `${swapAmount}`,
		unitName: sourceToken.decimals
	});

	const sdk = constructSimpleSDK({
		chainId: Number(sourceNetwork.chainId),
		fetch: window.fetch
	});

	const TokenTransferProxy = await sdk.swap.getSpender();

	if (!isDefaultEthereumToken(sourceToken)) {
		await approveToken({
			token: sourceToken,
			from: userAddress,
			to: TokenTransferProxy,
			amount: parsedSwapAmount,
			sourceNetwork,
			identity,
			gas,
			maxFeePerGas,
			maxPriorityFeePerGas,
			shouldSwapWithApproval: true,
			progress,
			progressSteps: ProgressStepsSwap
		});

		await retryWithDelay({
			maxRetries: 10,
			request: async () => {
				const currentAllowance = await erc20ContractAllowance({
					token: sourceToken,
					owner: userAddress,
					spender: TokenTransferProxy,
					networkId: sourceNetwork.id
				});
				if (currentAllowance < parsedSwapAmount) {
					throw new Error(get(i18n).swap.error.unexpected);
				}
			}
		});
	}

	progress(ProgressStepsSwap.SWAP);

	const txParams = await sdk.swap.buildTx({
		srcToken: geSwapEthTokenAddress(sourceToken),
		destToken: geSwapEthTokenAddress(destinationToken),
		srcAmount: swapDetails.srcAmount,
		slippage: Number(slippageValue) * 100,
		priceRoute: swapDetails as OptimalRate,
		userAddress,
		partner: OISY_URL_HOSTNAME
	});

	await swap({
		from: userAddress,
		to: txParams.to,
		transaction: txParams,
		identity,
		token: sourceToken,
		sourceNetwork,
		maxFeePerGas,
		maxPriorityFeePerGas,
		progress
	});

	progress(ProgressStepsSwap.UPDATE_UI);

	await waitAndTriggerWallet();
};
