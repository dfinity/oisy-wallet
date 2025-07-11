import type { SwapAmountsReply } from '$declarations/kong_backend/kong_backend.did';
import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import { approve as approveToken } from '$eth/services/swap.services';
import { VeloraSwapService } from '$eth/services/velora-swap.services';
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
import { ICP_SWAP_POOL_FEE } from '$lib/constants/swap.constants';
import { ProgressStepsSwap, type ProgressStepsSend } from '$lib/enums/progress-steps';
import { swapProviders } from '$lib/providers/swap.providers';
import { i18n } from '$lib/stores/i18n.store';

import { signPrehash } from '$lib/api/signer.api';
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
import type { Token } from '$lib/types/token';
import { toCustomToken } from '$lib/utils/custom-token.utils';
import { parseToken } from '$lib/utils/parse.utils';
import {
	calculateSlippage,
	mapVeloraMarketSwapResult,
	mapVeloraSwapResult
} from '$lib/utils/swap.utils';
import { waitAndTriggerWallet } from '$lib/utils/wallet.utils';
import type { Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { isNullish, nonNullish } from '@dfinity/utils';
import { constructSimpleSDK } from '@velora-dex/sdk';
import { Signature, TypedDataEncoder, parseUnits } from 'ethers';
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
}: FetchSwapAmountsParams & { userAddress: any }): Promise<SwapMappedResult[]> => {
	const sourceAmount: bigint = parseToken({
		value: `${amount}`,
		unitName: sourceToken.decimals
	});

	const data =
		sourceToken.network.id === ICP_NETWORK_ID
			? await fetchSwapAmountsICP({
					identity,
					sourceToken,
					destinationToken,
					amount: sourceAmount,
					tokens,
					slippage
				})
			: await fetchSwapAmountsEVM({
					sourceToken: sourceToken as Token & { address?: string } & {
						network: { chainId: string };
					},
					destinationToken: destinationToken as Token & { address?: string } & {
						network: { chainId: string };
					},
					amount: `${sourceAmount}`,
					slippage,
					userAddress
				});

	return data;
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
	[SwapProvider.KONG_SWAP]: fetchKongSwap,
	[SwapProvider.VELORA]: fetchIcpSwap
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

	console.log({ mappedProvidersResults });

	return mappedProvidersResults.sort((a, b) => Number(b.receiveAmount) - Number(a.receiveAmount));
};

const fetchSwapAmountsEVM = async ({
	sourceToken,
	destinationToken,
	amount,
	slippage,
	userAddress
}: {
	sourceToken: Token & { address?: string } & { network: { chainId: string } };
	destinationToken: Token & { address?: string } & { network: { chainId: string } };
	amount: string;
	userAddress?: string;
	destTokenChainId?: number;
	srcTokenChainId?: number;
	slippage: any;
}): Promise<any> => {
	const service = VeloraSwapService.create({ chainId: Number(sourceToken?.network.chainId) });

	const data = await service.getQuote({
		amount,
		srcToken: sourceToken.address ?? '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
		destToken: destinationToken?.address ?? '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
		srcDecimals: sourceToken.decimals,
		destDecimals: destinationToken.decimals,
		destChainId:
			sourceToken.network.chainId !== destinationToken?.network.chainId ||
			nonNullish(sourceToken.address) ||
			// Add considiton to check is it ETH native token as well
			Number(sourceToken.network.chainId) === 1 ||
			Number(sourceToken.network.chainId) === 8453
				? Number(destinationToken?.network.chainId)
				: undefined,
		mode: 'all',
		side: 'SELL',
		// network: Number(sourceToken?.network.chainId),
		// chainId: Number(sourceToken?.network.chainId),
		userAddress
		// slippage: Number(slippage) * 100,
	});

	if ('delta' in data) {
		console.log('here', data);

		return [mapVeloraSwapResult(data.delta)];
	}

	if ('market' in data) {
		return [mapVeloraMarketSwapResult(data.market)];
	}

	// console.log({ data }, 'VeloraSwapService.getDeltaPrice result');

	// console.log('Mapping Velora swap result...', [data]);

	// console.log({ data: [mapVeloraSwapResult(data)] });

	// return [mapVeloraSwapResult(data)];
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
}: any): Promise<void> => {
	progress(ProgressStepsSwap.SWAP);

	const sdk = constructSimpleSDK({
		chainId: Number(sourceNetwork?.chainId),
		fetch: window.fetch
	});

	const deltaContract = await sdk.delta.getDeltaContract();

	const slippageMinimum = calculateSlippage({
		quoteAmount: receiveAmount,
		slippagePercentage: Number(slippageValue)
	});

	const approve = await approveToken({
		token: { ...sourceToken, address: '0x4200000000000000000000000000000000000006' },
		from: userAddress,
		to: deltaContract ?? '0x0000000000bbf5c5fd284e657f01bd000933c96d',
		amount: parseToken({ value: swapAmount, unitName: sourceToken.decimals }),
		sourceNetwork,
		identity,
		gas,
		maxFeePerGas,
		maxPriorityFeePerGas,
		progress: (step: ProgressStepsSend) => {
			console.log('🌀 Approve step:', step);
		}
	});

	// const WETH_ADDRESSES: Record<number, string> = {
	// 	10: '0x4200000000000000000000000000000000000006', // Optimism
	// 	8453: '0x4200000000000000000000000000000000000006', // Base
	// 	42161: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1', // Arbitrum
	// 	137: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', // Polygon
	// 	1: '0xC02aaA39b223FE8D0A0E5C4F27eAD9083C756Cc2' // Mainnet
	// };

	// // eslint-disable-next-line local-rules/prefer-object-params
	// const getMulticallHandler = async (
	// 	destTokenDestChain: string,
	// 	beneficiaryType: BeneficiaryType
	// ) => {
	// 	const shouldReturnMulticall =
	// 		(beneficiaryType === 'EOA' &&
	// 			destTokenDestChain === WETH_ADDRESSES[Number(destTokenDestChain)]) ||
	// 		(beneficiaryType === 'SmartContract' &&
	// 			destTokenDestChain === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee');

	// 	if (!shouldReturnMulticall) {
	// 		return ethers.ZeroAddress;
	// 	}

	// 	const multicallHandlers = await sdk.delta.getMulticallHandlers();

	// 	return multicallHandlers[Number(destTokenDestChain)];
	// };

	const signableOrderData = await sdk.delta.buildDeltaOrder({
		deltaPrice: swapDetails,
		owner: userAddress,
		srcToken: sourceToken?.address,
		destToken: destinationToken?.address,
		srcAmount: parseUnits(swapAmount, sourceToken.decimals).toString(),
		destAmount: slippageMinimum.toString(10),
		destChainId: Number(destinationNetwork?.chainId)
		// bridge: {
		// 	maxRelayerFee, destinationChainId: Number(destinationNetwork?.chainId), outputToken: destinationToken?.address, multiCallHandler:getMulticallHandler()
		// }
	});

	const { domain: orderDomain, types: orderTypes, data } = signableOrderData;
	const eip712OrderHash = TypedDataEncoder.hash(orderDomain, orderTypes, data);
	const orderSignature = await signPrehash({
		hash: eip712OrderHash,
		identity
	});
	const compactOrderSig = Signature.from(orderSignature).compactSerialized;

	const deltaAuction = await sdk.delta.postDeltaOrder({
		order: signableOrderData.data,
		signature: compactOrderSig
	});

	// eslint-disable-next-line local-rules/prefer-object-params
	const isExecutedDeltaAuction = (
		auction: Omit<any, 'signature'>,
		waitForCrosschain = true // only consider executed when destChain work is done
	) => {
		if (auction.status !== 'EXECUTED') {
			return false;
		}

		// crosschain Order is executed on destChain if bridgeStatus is filled
		if (waitForCrosschain && auction.order.bridge.destinationChainId !== 0) {
			return auction.bridgeStatus === 'filled';
		}

		return true;
	};

	const fetchOrderPeriodically = (auctionId: string) => {
		const intervalId = setInterval(async () => {
			const auction = await sdk.delta.getDeltaOrderById(auctionId);
			console.log('checks: ', auction); // Handle or log the fetched auction as needed

			if (isExecutedDeltaAuction(auction)) {
				clearInterval(intervalId); // Stop interval if completed
				console.log('Order completed');
			}
		}, 3000);
		console.log('Order Pending');
		return intervalId;
	};

	const startStatusCheck = (auctionId: string) => {
		const intervalId = fetchOrderPeriodically(auctionId);
		setTimeout(() => clearInterval(intervalId), 60000 * 5); // Stop after 5 minutes
	};

	startStatusCheck(deltaAuction.id);

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
	receiveAmount,
	slippageValue,
	destinationNetwork,
	userAddress,
	gas,
	maxFeePerGas,
	maxPriorityFeePerGas,
	swapDetails
}: any): Promise<void> => {
	progress(ProgressStepsSwap.SWAP);

	// 	  const priceRoute = quote.market;

	const sdk = constructSimpleSDK({
		chainId: Number(sourceNetwork?.chainId),
		fetch: window.fetch
	});

	// const TokenTransferProxy = await sdk.swap.getSpender();

	// console.log({ TokenTransferProxy });

	// const approve = await approveToken({
	// 	token: sourceToken,
	// 	from: userAddress,
	// 	to: TokenTransferProxy,
	// 	amount: parseToken({ value: swapAmount, unitName: sourceToken.decimals }),
	// 	sourceNetwork,
	// 	identity,
	// 	gas,
	// 	maxFeePerGas,
	// 	maxPriorityFeePerGas,
	// 	progress: (step: ProgressStepsSend) => {
	// 		console.log('🌀 Approve step:', step);
	// 	}
	// });

	console.log('approve', { approve });

	const txParams = await sdk.swap.buildTx({
		srcToken: sourceToken?.address,
		destToken: destinationToken?.address,
		srcAmount: parseUnits(swapAmount, sourceToken.decimals).toString(),
		slippage: slippageValue * 100,
		priceRoute: swapDetails,
		userAddress
	});

	console.log(txParams, 'txParams');

	console.log({
		from: userAddress,
		identity,
		to: txParams.to,
		token: sourceToken,
		amount: parseToken({
			value: `${txParams.value}`,
			unitName: sourceToken.decimals
		}),
		data: txParams.data,
		gas,
		sourceNetwork,
		maxFeePerGas,
		maxPriorityFeePerGas,
		progress: (step: ProgressStepsSend) => {
			console.log('🌀 Approve step:', step);
		}
	});

	// from: $ethAddress,
	// 			to: isErc20Icp($sendToken) ? destination : mapAddressStartsWith0x(destination),
	// 			progress: (step: ProgressStepsSend) => (sendProgressStep = step),
	// 			token: $sendToken,
	// 			amount: parseToken({
	// 				value: `${amount}`,
	// 				unitName: $sendTokenDecimals
	// 			}),

	// await executeSend({
	// 			from: $ethAddress,
	// 			to: isErc20Icp($sendToken) ? destination : mapAddressStartsWith0x(destination),
	// 			progress: (step: ProgressStepsSend) => (sendProgressStep = step),
	// 			token: $sendToken,
	// 			amount: parseToken({
	// 				value: `${amount}`,
	// 				unitName: $sendTokenDecimals
	// 			}),
	// 			maxFeePerGas,
	// 			maxPriorityFeePerGas,
	// 			gas,
	// 			sourceNetwork,
	// 			identity: $authIdentity,
	// 			minterInfo: $ckEthMinterInfoStore?.[nativeEthereumToken.id]
	// 		});

	// const swap = await send({
	// 	from: userAddress,
	// 	identity,
	// 	to: txParams.to,
	// 	token: sourceToken,
	// 	amount: parseToken({
	// 		value: `${txParams.value}`,
	// 		unitName: sourceToken.decimals
	// 	}),
	// 	data: txParams.data,
	// 	gas,
	// 	sourceNetwork,
	// 	maxFeePerGas,
	// 	maxPriorityFeePerGas,
	// 	progress: (step: ProgressStepsSend) => {
	// 		console.log('🌀 Approve step:', step);
	// 	}
	// });

	// 	  to: string;
	//   from: string;
	//   value: string;
	//   data: string;
	//   gas?: string;
	//   chainId: number;
	//   // either gasPrice or maxFeePerGas & maxPriorityFeePerGas will be present
	//   gasPrice?: string;
	//   maxFeePerGas?: string;
	//   maxPriorityFeePerGas?: string;

	//   const swapTx = await signer.sendTransaction(txParams);
	// }

	progress(ProgressStepsSwap.UPDATE_UI);

	await waitAndTriggerWallet();
};
