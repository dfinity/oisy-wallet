import type { SwapAmountsReply } from '$declarations/kong_backend/kong_backend.did';
import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import { approve as approveToken } from '$eth/services/send.services';
import { setCustomToken as setCustomIcrcToken } from '$icp-eth/services/custom-token.services';
import { approve } from '$icp/api/icrc-ledger.api';
import { sendIcp, sendIcrc } from '$icp/services/ic-send.services';
import { loadCustomTokens } from '$icp/services/icrc.services';
import type { IcToken } from '$icp/types/ic-token';
import { nowInBigIntNanoSeconds } from '$icp/utils/date.utils';
import { isTokenIcrc } from '$icp/utils/icrc.utils';
import { setCustomToken } from '$lib/api/backend.api';
import { getPoolCanister } from '$lib/api/icp-swap-factory.api';
import { deposit, depositFrom, swap as swapIcp, withdraw } from '$lib/api/icp-swap-pool.api';
import { kongSwap, kongTokens } from '$lib/api/kong_backend.api';
import { KONG_BACKEND_CANISTER_ID, NANO_SECONDS_IN_MINUTE } from '$lib/constants/app.constants';
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

import { swap } from '$eth/services/swap.services';
import type { Erc20Token } from '$eth/types/erc20';
import { isDefaultEthereumToken } from '$eth/utils/eth.utils';
import { getCompactSignature, getSignParamsEIP712 } from '$eth/utils/swap.utils';
import { signPrehash } from '$lib/api/signer.api';
import {
	kongSwapTokensStore,
	type KongSwapTokensStoreData
} from '$lib/stores/kong-swap-tokens.store';
import type { OptionEthAddress } from '$lib/types/address';
import {
	SwapProvider,
	type CheckDeltaOrderStatusParams,
	type FetchSwapAmountsParams,
	type GetQuoteParams,
	type ICPSwapResult,
	type SwapMappedResult,
	type SwapParams,
	type SwapVeloraParams,
	type VeloraQuoteParams
} from '$lib/types/swap';
import { toCustomToken } from '$lib/utils/custom-token.utils';
import { parseToken } from '$lib/utils/parse.utils';
import {
	calculateSlippage,
	getTokenAddress,
	mapVeloraMarketSwapResult,
	mapVeloraSwapResult
} from '$lib/utils/swap.utils';
import { waitAndTriggerWallet } from '$lib/utils/wallet.utils';
import type { Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { isNullish, nonNullish } from '@dfinity/utils';
import {
	constructSimpleSDK,
	type BridgePrice,
	type DeltaAuction,
	type DeltaPrice,
	type OptimalRate
} from '@velora-dex/sdk';
import { get } from 'svelte/store';
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
	slippage,
	userAddress
}: FetchSwapAmountsParams & { userAddress: OptionEthAddress }): Promise<SwapMappedResult[]> => {
	const sourceAmount: bigint = parseToken({
		value: `${amount}`,
		unitName: sourceToken.decimals
	});

	return sourceToken.network.id === ICP_NETWORK_ID
		? await fetchSwapAmountsICP({
				identity,
				sourceToken,
				destinationToken,
				amount: sourceAmount,
				tokens,
				slippage
			})
		: await fetchSwapAmountsEVM({
				sourceToken: sourceToken as Erc20Token,
				destinationToken: destinationToken as Erc20Token,
				amount: `${sourceAmount}`,
				userAddress
			});
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
		throw new Error(get(i18n).swap.error.deposit_error);
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
			throw new Error(get(i18n).swap.error.withdraw_failed);
		}
		// Inform the user that the swap failed, but refund was successful
		throw new Error(get(i18n).swap.error.swap_failed_withdraw_success);
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

		throw new Error(get(i18n).swap.error.withdraw_failed);
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
	[SwapProvider.KONG_SWAP]: fetchKongSwap
};

const fetchSwapAmountsICP = async ({
	identity,
	sourceToken,
	destinationToken,
	amount,
	tokens,
	slippage
}: FetchSwapAmountsParams): Promise<SwapMappedResult[]> => {
	const enabledProviders = swapProviders.filter(({ isEnabled }) => isEnabled);

	const settledResults = await Promise.allSettled(
		enabledProviders.map(({ getQuote }) =>
			getQuote({
				identity,
				sourceToken: sourceToken as IcToken,
				destinationToken: destinationToken as IcToken,
				sourceAmount: amount as bigint
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

const fetchSwapAmountsEVM = async ({
	sourceToken,
	destinationToken,
	amount,
	userAddress
}: VeloraQuoteParams): Promise<SwapMappedResult[]> => {
	if (isNullish(userAddress)) {
		return [];
	}
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
		amount,
		srcToken: getTokenAddress(sourceToken),
		destToken: getTokenAddress(destinationToken),
		srcDecimals: sourceToken.decimals,
		destDecimals: destinationToken.decimals,
		mode: SWAP_MODE,
		side: SWAP_SIDE,
		userAddress
	};

	const data = await sdk.quote.getQuote(
		srcChainId !== destChainId ? { ...baseParams, destChainId: Number(destChainId) } : baseParams
	);

	if ('delta' in data) {
		return [mapVeloraSwapResult(data.delta)];
	}

	if ('market' in data) {
		return [mapVeloraMarketSwapResult(data.market)];
	}

	return [];
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
	// progress(ProgressStepsSwap.SWAP);

	const parsedSwapAmount = parseToken({
		value: `${swapAmount}`,
		unitName: sourceToken.decimals
	});

	const sdk = constructSimpleSDK({
		chainId: Number(sourceNetwork?.chainId),
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
		approveNeeded: true,
		maxPriorityFeePerGas,
		progress
	});

	const signableOrderData = await sdk.delta.buildDeltaOrder({
		deltaPrice: swapDetails as DeltaPrice | BridgePrice,
		owner: userAddress,
		srcToken: sourceToken?.address,
		destToken: destinationToken?.address,
		srcAmount: `${parsedSwapAmount}`,
		destAmount: `${slippageMinimum}`,
		destChainId: Number(destinationNetwork?.chainId)
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
	// progress(ProgressStepsSwap.SWAP);

	const parsedSwapAmount = parseToken({
		value: `${swapAmount}`,
		unitName: sourceToken.decimals
	});

	const sdk = constructSimpleSDK({
		chainId: Number(sourceNetwork?.chainId),
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
			approveNeeded: true,
			progress
		});
	}

	const txParams = await sdk.swap.buildTx({
		srcToken: getTokenAddress(sourceToken),
		destToken: getTokenAddress(destinationToken),
		srcAmount: swapDetails.srcAmount,
		slippage: Number(slippageValue) * 100,
		priceRoute: swapDetails as OptimalRate,
		userAddress
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

export const checkDeltaOrderStatus = async ({
	sdk,
	auctionId,
	timeoutMs = SWAP_DELTA_TIMEOUT_MS,
	intervalMs = SWAP_DELTA_INTERVAL_MS
}: CheckDeltaOrderStatusParams): Promise<void> => {
	const deadline = Date.now() + timeoutMs;

	while (Date.now() < deadline) {
		try {
			const auction = await sdk.delta.getDeltaOrderById(auctionId);

			if (isExecutedDeltaAuction({ auction })) {
				return;
			}
		} catch (error) {
			console.error('Failed to fetch delta order status:', error);
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
