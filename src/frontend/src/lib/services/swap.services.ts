import { sendBtc } from '$btc/services/btc-send.services';
import type { VeloraSwapMode } from '$declarations/backend/backend.did';
import type { SwapAmountsReply } from '$declarations/kong_backend/kong_backend.did';
import { approve as approveToken, erc20ContractAllowance } from '$eth/services/approve.services';
import { createPermit } from '$eth/services/eip2612-permit.services';
import { loadCustomTokens as loadCustomErc20Tokens } from '$eth/services/erc20.services';
import { send as sendEvm } from '$eth/services/send.services';
import { swap } from '$eth/services/swap.services';
import type { ErcFungibleToken } from '$eth/types/erc-fungible';
import type { Erc20Token } from '$eth/types/erc20';
import type { EthereumNetwork } from '$eth/types/network';
import { getCompactSignature, getSignParamsEIP712 } from '$eth/utils/eip712.utils';
import { isTokenErc } from '$eth/utils/erc.utils';
import { isDefaultEthereumToken, isNotDefaultEthereumToken } from '$eth/utils/eth.utils';
import { setCustomToken as setCustomIcrcToken } from '$icp-eth/services/icrc-token.services';
import { approve } from '$icp/api/icrc-ledger.api';
import { sendIcp, sendIcrc } from '$icp/services/ic-send.services';
import { hasSufficientIcrcAllowance, loadCustomTokens } from '$icp/services/icrc.services';
import type { LedgerCanisterIdText } from '$icp/types/canister';
import type { IcToken } from '$icp/types/ic-token';
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
	NANO_SECONDS_IN_HALF_MINUTE,
	NANO_SECONDS_IN_MINUTE,
	ZERO
} from '$lib/constants/app.constants';
import { OISY_URL_HOSTNAME } from '$lib/constants/oisy.constants';
import { ICP_SWAP_POOL_FEE, SWAP_SIDE } from '$lib/constants/swap.constants';
import { exchanges } from '$lib/derived/exchange.derived';
import { PLAUSIBLE_EVENTS, PLAUSIBLE_EVENT_CONTEXTS } from '$lib/enums/plausible';
import { ProgressStepsSwap } from '$lib/enums/progress-steps';
import { btcSwapProviders } from '$lib/providers/btc-swap.providers';
import { evmSwapProviders } from '$lib/providers/evm-swap.providers';
import { icpBridgeProviders } from '$lib/providers/icp-bridge-swap.providers';
import { solSwapProviders } from '$lib/providers/sol-swap.providers';
import { swapProviders } from '$lib/providers/swap.providers';
import { createActiveUserTransaction } from '$lib/services/active-user-transactions.services';
import { trackEvent } from '$lib/services/analytics.services';
import { submitNearIntentsDepositTx } from '$lib/services/near-intents.services';
import {
	executeOneSecEvmToIcpBridge,
	executeOneSecIcpToEvmBridge
} from '$lib/services/onesec-swap.services';
import { retryWithDelay } from '$lib/services/rest.services';
import { throwSwapError } from '$lib/services/swap-errors.services';
import { autoLoadSingleToken } from '$lib/services/token.services';
import { i18n } from '$lib/stores/i18n.store';
import {
	kongSwapTokensStore,
	type KongSwapTokensStoreData
} from '$lib/stores/kong-swap-tokens.store';
import type { SaveCustomTokenWithKey } from '$lib/types/custom-token';
import {
	NEAR_INTENTS_EXTERNAL_REF_KEYS,
	type NearIntentsQuoteResponse
} from '$lib/types/near-intents';
import type { Amount } from '$lib/types/send';
import {
	SwapErrorCodes,
	SwapProvider,
	type BtcQuoteParams,
	type EvmQuoteParams,
	type FetchSwapAmountsParams,
	type ICPSwapResult,
	type IcpBridgeQuoteParams,
	type IcpSwapManualWithdrawParams,
	type IcpSwapWithdrawParams,
	type IcpSwapWithdrawResponse,
	type NearIntentsQuoteParams,
	type OneSecEvmToIcpParams,
	type OneSecIcpToEvmParams,
	type SwapMappedResult,
	type SwapNearIntentsBtcParams,
	type SwapNearIntentsEvmParams,
	type SwapNearIntentsSolParams,
	type SwapParams,
	type SwapVeloraDeltaParams,
	type SwapVeloraMarketParams
} from '$lib/types/swap';
import type { Token } from '$lib/types/token';
import { VELORA_EXTERNAL_REF_KEYS, type VeloraExternalRefKey } from '$lib/types/velora-swap';
import { consoleError } from '$lib/utils/console.utils';
import { toCustomToken } from '$lib/utils/custom-token.utils';
import { formatToken } from '$lib/utils/format.utils';
import {
	toNearIntentsData,
	toNearIntentsDisplayRefs,
	toNearIntentsExternalRefs
} from '$lib/utils/near-intents-active-tx.utils';
import {
	isNearIntentsQuoteExpired,
	verifyNearIntentsQuoteSignature
} from '$lib/utils/near-intents-quote.utils';
import {
	isNetworkIdBTCMainnet,
	isNetworkIdBitcoin,
	isNetworkIdEthereum,
	isNetworkIdEvm,
	isNetworkIdICP,
	isNetworkIdSOLDevnet,
	isNetworkIdSolana
} from '$lib/utils/network.utils';
import { parseToken } from '$lib/utils/parse.utils';
import {
	calculateSlippage,
	geSwapEthTokenAddress,
	getWithdrawableToken,
	isKongSupportedIcToken,
	slippagePercentToBasisPoints
} from '$lib/utils/swap.utils';
import { isTokenToggleable } from '$lib/utils/token-toggleable.utils';
import {
	toVeloraData,
	toVeloraDisplayRefs,
	toVeloraExternalRefs
} from '$lib/utils/velora-active-tx.utils';
import { waitAndTriggerWallet } from '$lib/utils/wallet.utils';
import { sendSol } from '$sol/services/sol-send.services';
import { loadCustomTokens as loadCustomSplTokens } from '$sol/services/spl.services';
import { isTokenSpl } from '$sol/utils/spl.utils';
import { isNullish, nonNullish, nowInBigIntNanoSeconds } from '@dfinity/utils';
import type { Identity } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';
import { constructSimpleSDK, type BuildDeltaOrderParams } from '@velora-dex/sdk';
import { get } from 'svelte/store';

const checkNeedsApproval = async ({
	identity,
	ledgerCanisterId,
	amount,
	spender
}: {
	identity: Identity;
	ledgerCanisterId: LedgerCanisterIdText;
	amount: bigint;
	spender: Principal;
}): Promise<boolean> => {
	try {
		const isAllowanceSufficient = await hasSufficientIcrcAllowance({
			identity,
			ledgerCanisterId,
			owner: identity.getPrincipal(),
			spender,
			amount,
			allowanceBuffer: NANO_SECONDS_IN_HALF_MINUTE
		});

		return !isAllowanceSufficient;
	} catch (_: unknown) {
		return true;
	}
};

export const enableSwapDestinationToken = async ({
	destinationToken,
	identity
}: {
	destinationToken: Token;
	identity: Identity;
}): Promise<void> => {
	if (!isTokenToggleable(destinationToken) || destinationToken.enabled) {
		return;
	}

	try {
		// A Chain Fusion mint or a 1Sec bridge lands on an ICRC (ck) token, which neither
		// the ERC nor the SPL branch below can persist — the swap used to complete with the
		// destination still hidden and its new balance invisible. Enabled through the same
		// `autoLoadSingleToken` trio the ICPSwap flow uses for its own destination.
		if (isTokenIcrc(destinationToken)) {
			await autoLoadSingleToken({
				identity,
				token: destinationToken,
				setToken: setCustomIcrcToken,
				loadTokens: loadCustomTokens,
				errorMessage: get(i18n).init.error.icrc_custom_token
			});

			return;
		}

		if (isTokenErc(destinationToken)) {
			await setCustomToken({
				token: toCustomToken({
					...destinationToken,
					enabled: true,
					chainId: destinationToken.network.chainId,
					networkKey: 'Erc20'
				} as SaveCustomTokenWithKey),
				identity,
				nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
			});

			await loadCustomErc20Tokens({ identity });

			return;
		}

		if (isTokenSpl(destinationToken)) {
			await setCustomToken({
				token: toCustomToken({
					...destinationToken,
					enabled: true,
					networkKey: isNetworkIdSOLDevnet(destinationToken.network.id) ? 'SplDevnet' : 'SplMainnet'
				} as SaveCustomTokenWithKey),
				identity,
				nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
			});

			await loadCustomSplTokens({ identity });
		}
	} catch (_: unknown) {
		// Auto-enabling the token is just a good-to-have extra, not necessary for the continuity of the user flow
	}
};

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
	const parsedSlippageValue = Number(slippageValue);

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

	if (isSourceTokenIcrc2) {
		// for icrc2 tokens, we need to double sourceTokenFee to cover "approve" and "transfer" fees
		const amountWithFees = parsedSwapAmount + sourceTokenFee * 2n;

		const isApprovalNeeded = await checkNeedsApproval({
			identity,
			ledgerCanisterId,
			amount: amountWithFees,
			spender: Principal.from(KONG_BACKEND_CANISTER_ID)
		});

		if (isApprovalNeeded) {
			await approve({
				identity,
				ledgerCanisterId,
				amount: amountWithFees,
				// Sets approve expiration to 5 minutes ahead to allow enough time for the full swap flow
				expiresAt: nowInBigIntNanoSeconds() + 5n * NANO_SECONDS_IN_MINUTE,
				spender: {
					owner: Principal.from(KONG_BACKEND_CANISTER_ID)
				}
			});
		}
	}

	await kongSwap({
		identity,
		sourceToken,
		destinationToken,
		sendAmount: parsedSwapAmount,
		maxSlippage: parsedSlippageValue,
		receiveAmount: calculateSlippage({
			quoteAmount: receiveAmount,
			slippagePercentage: parsedSlippageValue
		}),
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

export const loadKongSwapTokens = async ({
	identity,
	allIcrcTokens
}: {
	identity: Identity;
	allIcrcTokens: IcToken[];
}): Promise<void> => {
	const kongSwapTokens = await Promise.allSettled(
		allIcrcTokens.map(({ ledgerCanisterId: tokenLedgerCanisterId }: IcToken) =>
			kongTokens({
				identity,
				tokenLedgerCanisterId
			})
		)
	);

	const supportedTokens = kongSwapTokens.reduce<KongSwapTokensStoreData>((acc, result) => {
		if (result.status === 'fulfilled') {
			return result.value.reduce<KongSwapTokensStoreData>(
				(innerAcc, kongToken) =>
					isKongSupportedIcToken(kongToken)
						? { ...innerAcc, [kongToken.IC.symbol]: kongToken.IC }
						: innerAcc,
				acc
			);
		}
		return acc;
	}, {});

	kongSwapTokensStore.setKongSwapTokens(supportedTokens);
};

type SwapRecipientResolution =
	// The destination network has no cross-chain payout address (e.g. ICP, where
	// providers credit the user's principal); quotes proceed without a recipient.
	| { type: 'not-required' }
	// The user's destination-chain address is known and becomes the quote's recipient.
	| { type: 'resolved'; recipientAddress: string }
	// The destination needs a payout address the user does not have (yet). Such a pair
	// must not be quoted at all: a cross-chain quote request falls back to the
	// source-chain user address as recipient, which would pay out to a wrong-chain
	// address.
	| { type: 'missing' };

/**
 * A cross-chain swap pays out on the destination chain, so the quote's recipient is the
 * user's address for the destination token's network, never the source-chain address.
 */
const resolveSwapRecipientAddress = ({
	destinationToken,
	userEthAddress,
	userSolAddress,
	userBtcAddress
}: Pick<
	FetchSwapAmountsParams,
	'destinationToken' | 'userEthAddress' | 'userSolAddress' | 'userBtcAddress'
>): SwapRecipientResolution => {
	const {
		network: { id: networkId }
	} = destinationToken;

	if (isNetworkIdSolana(networkId)) {
		return nonNullish(userSolAddress)
			? { type: 'resolved', recipientAddress: userSolAddress }
			: { type: 'missing' };
	}

	// Mainnet only: the address at hand is the user's mainnet address, and cross-chain
	// providers do not serve BTC testnets.
	if (isNetworkIdBTCMainnet(networkId)) {
		return nonNullish(userBtcAddress)
			? { type: 'resolved', recipientAddress: userBtcAddress }
			: { type: 'missing' };
	}

	if (isNetworkIdEthereum(networkId) || isNetworkIdEvm(networkId)) {
		return nonNullish(userEthAddress)
			? { type: 'resolved', recipientAddress: userEthAddress }
			: { type: 'missing' };
	}

	return { type: 'not-required' };
};

export const fetchSwapAmounts = async ({
	identity,
	sourceToken,
	destinationToken,
	amount,
	tokens,
	slippage,
	isSourceTokenIcrc2,
	userEthAddress,
	userSolAddress,
	userBtcAddress
}: FetchSwapAmountsParams): Promise<SwapMappedResult[]> => {
	const sourceAmount = parseToken({
		value: `${amount}`,
		unitName: sourceToken.decimals
	});

	if (isNetworkIdICP(sourceToken.network.id)) {
		if (!isNetworkIdICP(destinationToken.network.id)) {
			return await fetchSwapAmountsICPBridge({
				sourceToken,
				destinationToken,
				amount: sourceAmount,
				userEthAddress,
				slippage
			});
		}

		return await fetchSwapAmountsICP({
			identity,
			sourceToken,
			destinationToken,
			amount: sourceAmount,
			tokens,
			slippage,
			isSourceTokenIcrc2
		});
	}

	const recipientResolution = resolveSwapRecipientAddress({
		destinationToken,
		userEthAddress,
		userSolAddress,
		userBtcAddress
	});

	if (recipientResolution.type === 'missing') {
		return [];
	}

	const recipientAddress =
		recipientResolution.type === 'resolved' ? recipientResolution.recipientAddress : undefined;

	// Ahead of the EVM fall-through, which would otherwise cast a Bitcoin token to
	// `Erc20Token` and hand it to providers that cannot quote it.
	if (isNetworkIdBitcoin(sourceToken.network.id)) {
		if (isNullish(userBtcAddress)) {
			return [];
		}

		return await fetchSwapAmountsBTC({
			sourceToken,
			destinationToken,
			amount: sourceAmount,
			userBtcAddress,
			recipientAddress,
			slippage
		});
	}

	const isSourceSolana = isNetworkIdSolana(sourceToken.network.id);
	const isDestSolana = isNetworkIdSolana(destinationToken.network.id);

	if (isSourceSolana || isDestSolana) {
		const sourceAddress = isSourceSolana ? userSolAddress : userEthAddress;

		if (isNullish(sourceAddress)) {
			return [];
		}

		return await fetchSwapAmountsSOL({
			sourceToken,
			destinationToken,
			amount: sourceAmount,
			userAddress: sourceAddress,
			recipientAddress,
			slippage
		});
	}

	return await fetchSwapAmountsEVM({
		sourceToken: sourceToken as Erc20Token,
		destinationToken: destinationToken as Erc20Token,
		amount: sourceAmount,
		userAddress: userEthAddress,
		recipientAddress,
		slippage
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
}: Omit<
	FetchSwapAmountsParams,
	'userEthAddress' | 'userSolAddress' | 'userBtcAddress' | 'amount'
> & {
	amount: bigint;
}): Promise<SwapMappedResult[]> => {
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

	const destinationUsdValue = get(exchanges)?.[destinationToken.id]?.usd;
	const sourceTokenUsdValue = get(exchanges)?.[sourceToken.id]?.usd;
	const sourceTokenToDecimals = formatToken({
		value: amount,
		unitName: sourceToken.decimals
	});

	const trackEventBaseParams = {
		event_context: PLAUSIBLE_EVENT_CONTEXTS.TOKENS,
		token_symbol: sourceToken.symbol,
		token_network: sourceToken.network.name,
		token_address: (sourceToken as IcToken).ledgerCanisterId,
		token_name: sourceToken.name,
		token_standard: sourceToken.standard.code,
		token_id: String(sourceToken.id),
		token2_symbol: destinationToken.symbol,
		token2_network: destinationToken.network.name,
		token2_address: (destinationToken as IcToken).ledgerCanisterId,
		token2_name: destinationToken.name,
		token2_standard: destinationToken.standard.code,
		token2_id: String(destinationToken.id),
		...(nonNullish(sourceTokenUsdValue) && {
			token_usd_value: `${sourceTokenUsdValue * Number(sourceTokenToDecimals)}`
		})
	};

	const mappedProvidersResults = enabledProviders.reduce<SwapMappedResult[]>(
		(acc, provider, index) => {
			const result = settledResults[index];
			if (result.status !== 'fulfilled') {
				trackEvent({
					name: PLAUSIBLE_EVENTS.SWAP_OFFER,
					metadata: {
						...trackEventBaseParams,
						event_subcontext: provider.key,
						result_status: 'error',
						result_error: result.reason.message
					}
				});

				return acc;
			}

			let mapped: SwapMappedResult | undefined;

			if (provider.key === SwapProvider.KONG_SWAP) {
				const swap = result.value as SwapAmountsReply;
				mapped = provider.mapQuoteResult({ swap, tokens });
			} else if (provider.key === SwapProvider.ICP_SWAP && isSourceTokenIcrc2) {
				const swap = result.value as ICPSwapResult;
				mapped = provider.mapQuoteResult({
					swap,
					slippage,
					destToken: destinationToken as IcToken
				});
			}

			if (nonNullish(mapped)) {
				const destinationTokenToDecimals = formatToken({
					value: mapped.receiveAmount,
					unitName: destinationToken.decimals
				});

				trackEvent({
					name: PLAUSIBLE_EVENTS.SWAP_OFFER,
					metadata: {
						...trackEventBaseParams,
						event_subcontext: provider.key,
						result_status: 'success',
						...(nonNullish(destinationUsdValue) && {
							token2_usd_value: `${destinationUsdValue * Number(destinationTokenToDecimals)}`
						})
					}
				});
			}

			if (mapped && Number(mapped.receiveAmount) > 0) {
				acc.push(mapped);
			}

			return acc;
		},
		[]
	);

	return mappedProvidersResults.sort((a, b) =>
		a.receiveAmount === b.receiveAmount ? 0 : a.receiveAmount > b.receiveAmount ? -1 : 1
	);
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
		token0: { address: sourceLedgerCanisterId, standard: sourceStandard.code },
		token1: { address: destinationLedgerCanisterId, standard: destinationStandard.code },
		nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity,
		fee: ICP_SWAP_POOL_FEE
	});

	if (isNullish(pool)) {
		throw new Error(get(i18n).swap.error.pool_not_found);
	}

	const poolCanisterId = pool.canisterId.toString();

	const slippageMinimum = calculateSlippage({
		quoteAmount: receiveAmount + destinationTokenFee,
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
			// for icrc2 tokens, we need to double sourceTokenFee to cover "approve" and "transfer"
			const amountWithFees = parsedSwapAmount + sourceTokenFee * 2n;

			const isApprovalNeeded = await checkNeedsApproval({
				identity,
				ledgerCanisterId: sourceLedgerCanisterId,
				amount: amountWithFees,
				spender: pool.canisterId
			});

			if (isApprovalNeeded) {
				await approve({
					identity,
					ledgerCanisterId: sourceLedgerCanisterId,
					// for icrc2 tokens, we need to double sourceTokenFee to cover "approve" and "transfer" fees
					amount: parsedSwapAmount + sourceTokenFee * 2n,
					// Sets approve expiration to 5 minutes ahead to allow enough time for the full swap flow
					expiresAt: nowInBigIntNanoSeconds() + 5n * NANO_SECONDS_IN_MINUTE,
					spender: { owner: pool.canisterId }
				});
			}

			await depositFrom({
				identity,
				canisterId: poolCanisterId,
				token: sourceLedgerCanisterId,
				amount: parsedSwapAmount,
				fee: sourceTokenFee
			});
		}
	} catch (err: unknown) {
		consoleError(err);

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
			amount: receiveAmount + destinationTokenFee,
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

// Foreground resolves once the deposit is submitted (point of no return); the
// swap then settles in the background, tracked by the AUT poller
// (`pollNearIntentsActiveUserTransactions`) which drives the row to a terminal
// state from 1Click's `/status`. The success wallet refresh is wired off the AUT
// terminal side-effect in `LoaderActiveUserTransactions`, not from here.
const executeNearIntentsSwap = async ({
	identity,
	progress,
	sourceToken,
	destinationToken,
	swapAmount,
	swapDetails,
	sendTransaction,
	enableDestinationToken
}: {
	identity: Identity;
	progress: (step: ProgressStepsSwap) => void;
	sourceToken: Token;
	destinationToken: Token;
	swapAmount: Amount;
	swapDetails: NearIntentsQuoteResponse;
	// `registerSwap` creates the swap's AUT row. A transport whose send is irreversible
	// the moment it is broadcast (BTC) must invoke it from its broadcast callback, so the
	// row exists even if any later step of the send throws (the `fetchChainFusionBtcSwap`
	// guarantee). A transport that ignores it keeps the default ordering below, where the
	// row is created only after the send has resolved and the deposit been submitted.
	sendTransaction: (params: {
		amount: bigint;
		depositAddress: string;
		registerSwap: () => Promise<void>;
	}) => Promise<string>;
	enableDestinationToken?: () => Promise<void>;
}): Promise<void> => {
	const parsedSwapAmount = parseToken({
		value: `${swapAmount}`,
		unitName: sourceToken.decimals
	});

	// Last gate before the funds leave the wallet. The quote reached here through the
	// provider fan-out, so it was already verified once at quote time; re-checking binds
	// the signature to the exact response this send reads its deposit address from, and
	// covers any caller that assembles a quote by another route.
	if (!(await verifyNearIntentsQuoteSignature(swapDetails))) {
		throwSwapError({
			code: SwapErrorCodes.NEAR_INTENTS_QUOTE_UNVERIFIED,
			message: get(i18n).swap.error.near_intents_quote_unverified
		});
	}

	// Re-checked here rather than only at quote time: the review screen can sit open long
	// enough for the window the service signed to lapse before the user confirms.
	if (isNearIntentsQuoteExpired(swapDetails)) {
		throwSwapError({
			code: SwapErrorCodes.NEAR_INTENTS_QUOTE_EXPIRED,
			message: get(i18n).swap.error.near_intents_quote_expired
		});
	}

	const { depositAddress, depositMemo } = swapDetails.quote;

	// Registers the swap as an Active User Transaction so settlement is tracked by
	// the global poller (survives modal close, tab close, refresh, logout).
	// Best-effort, single attempt: it only ever runs once funds have left the wallet
	// (point of no return), so a failed create must NOT surface as a swap failure;
	// mirrors OneSec's `createAutAndDetachCloser`.
	let swapRegistered = false;
	const registerSwap = async (): Promise<void> => {
		swapRegistered = true;

		try {
			const data = toNearIntentsData({
				sourceToken,
				destinationToken,
				amount: parsedSwapAmount
			});

			if (nonNullish(data)) {
				await createActiveUserTransaction({
					identity,
					id: crypto.randomUUID(),
					data,
					externalRefs: toNearIntentsExternalRefs({
						...toNearIntentsDisplayRefs({ sourceToken, destinationToken, amount: `${swapAmount}` }),
						[NEAR_INTENTS_EXTERNAL_REF_KEYS.DEPOSIT_ADDRESS]: depositAddress,
						// 1Click documents the signature as the client's receipt for disputing a
						// deposit, so it is kept next to the address it authenticates.
						[NEAR_INTENTS_EXTERNAL_REF_KEYS.SIGNATURE]: swapDetails.signature,
						...(nonNullish(depositMemo)
							? { [NEAR_INTENTS_EXTERNAL_REF_KEYS.DEPOSIT_MEMO]: depositMemo }
							: {})
					})
				});
			}
		} catch (err: unknown) {
			consoleError(err);
		}
	};

	progress(ProgressStepsSwap.SIGN_TRANSFER);

	const txHash = await sendTransaction({ amount: parsedSwapAmount, depositAddress, registerSwap });

	progress(ProgressStepsSwap.SWAP);

	// Optional SDK call: notifies the 1Click service that a deposit has been sent
	// to the specified address, using the blockchain transaction hash. This step can
	// speed up swap processing by allowing the system to preemptively verify the deposit.
	try {
		await submitNearIntentsDepositTx({
			depositAddress,
			txHash,
			depositMemo: depositMemo ?? undefined
		});
	} catch (err: unknown) {
		consoleError(err);
	}

	if (!swapRegistered) {
		await registerSwap();
	}

	progress(ProgressStepsSwap.UPDATE_UI);

	// Keep the destination token visible while the swap settles in the background.
	await enableDestinationToken?.();
};

export const fetchNearIntentsEvmSwap = async ({
	identity,
	progress,
	sourceToken,
	destinationToken,
	swapAmount,
	sourceNetwork,
	userAddress,
	gas,
	maxFeePerGas,
	maxPriorityFeePerGas,
	swapDetails
}: SwapNearIntentsEvmParams): Promise<void> => {
	await executeNearIntentsSwap({
		identity,
		progress,
		sourceToken,
		destinationToken,
		swapAmount,
		swapDetails,
		sendTransaction: async ({ amount, depositAddress }) => {
			const { hash } = await sendEvm({
				from: userAddress,
				to: depositAddress,
				amount,
				token: sourceToken,
				sourceNetwork,
				identity,
				gas,
				maxFeePerGas,
				maxPriorityFeePerGas
			});
			return hash;
		},
		enableDestinationToken: () => enableSwapDestinationToken({ destinationToken, identity })
	});
};

export const fetchNearIntentsSolSwap = async ({
	identity,
	progress,
	sourceToken,
	destinationToken,
	swapAmount,
	userAddress,
	swapDetails
}: SwapNearIntentsSolParams): Promise<void> => {
	await executeNearIntentsSwap({
		identity,
		progress,
		sourceToken,
		destinationToken,
		swapAmount,
		swapDetails,
		sendTransaction: async ({ amount, depositAddress }) =>
			await sendSol({
				identity,
				token: sourceToken,
				amount,
				destination: depositAddress,
				source: userAddress,
				prioritizationFee: ZERO
			}),
		enableDestinationToken: () => enableSwapDestinationToken({ destinationToken, identity })
	});
};

export const fetchNearIntentsBtcSwap = async ({
	identity,
	progress,
	sourceToken,
	destinationToken,
	swapAmount,
	swapDetails,
	userAddress,
	network,
	utxosFee
}: SwapNearIntentsBtcParams): Promise<void> => {
	await executeNearIntentsSwap({
		identity,
		progress,
		sourceToken,
		destinationToken,
		swapAmount,
		swapDetails,
		// `sendBtc` converts the display amount to satoshis itself, so it takes the raw
		// `swapAmount` rather than the parsed base-unit amount the core hands over.
		sendTransaction: async ({ depositAddress, registerSwap }) => {
			let broadcastTxid: string | undefined;

			try {
				return await sendBtc({
					identity,
					network,
					utxosFee,
					source: userAddress,
					destination: depositAddress,
					amount: swapAmount,
					// A BTC deposit is irreversible the moment it is broadcast, so the AUT row is
					// registered right there, before the pending-transaction bookkeeping and before
					// the send resolves; mirrors the ordering of `fetchChainFusionBtcSwap`.
					onBroadcast: async ({ txid }) => {
						broadcastTxid = txid;
						await registerSwap();
					}
				});
			} catch (err: unknown) {
				if (isNullish(broadcastTxid)) {
					throw err;
				}

				// `sendBtc` can still throw after the broadcast, in its best-effort bookkeeping
				// (pending-transaction registration, wallet refresh). The deposit is real by
				// then and the AUT row exists, so the swap must not read as failed; the flow
				// carries on with the broadcast txid.
				consoleError(err);

				return broadcastTxid;
			}
		},
		enableDestinationToken: () => enableSwapDestinationToken({ destinationToken, identity })
	});
};

/**
 * Auto-enables the destination token once the bridge foreground has resolved
 * (i.e. funds have left the user's wallet and an AUT row exists). Running
 * this AFTER the bridge — not before — avoids enabling a token for a swap
 * the user ended up cancelling on the Review step or that failed in the
 * foreground. The post-success wallet balance refresh is wired off the AUT
 * store, not from here, so this only takes care of visibility.
 */
const enableOneSecDestinationToken = async (
	params: OneSecEvmToIcpParams | OneSecIcpToEvmParams
): Promise<void> => {
	try {
		await enableSwapDestinationToken({
			destinationToken: params.destinationToken,
			identity: params.identity
		});
	} catch (err: unknown) {
		consoleError(err);
	}
};

export const fetchOneSecEvmToIcpSwap = async (params: OneSecEvmToIcpParams): Promise<void> => {
	await executeOneSecEvmToIcpBridge(params);
	await enableOneSecDestinationToken(params);
};

export const fetchOneSecIcpToEvmSwap = async (params: OneSecIcpToEvmParams): Promise<void> => {
	await executeOneSecIcpToEvmBridge(params);
	await enableOneSecDestinationToken(params);
};

// `satisfies` keeps the map total: `SwapIcpWizard` indexes it with a provider key, so
// a missing member would be a runtime `undefined(…)` call rather than a type error.
export const swapService = {
	[SwapProvider.ICP_SWAP]: fetchIcpSwap,
	[SwapProvider.KONG_SWAP]: fetchKongSwap,
	//TODO: Will be fixed and updated in the next PRs
	[SwapProvider.VELORA]: () => {
		throw new Error(get(i18n).swap.error.unexpected);
	},
	[SwapProvider.NEAR_INTENTS]: () => {
		throw new Error(get(i18n).swap.error.unexpected);
	},
	[SwapProvider.ONE_SEC]: () => {
		throw new Error(get(i18n).swap.error.unexpected);
	},
	// Chain Fusion needs the user's own Ethereum address to withdraw to, which
	// `SwapParams` cannot carry, so `SwapIcpWizard` dispatches it explicitly through
	// `fetchChainFusionIcpSwap` and never reaches this entry — exactly as it does for
	// 1Sec above.
	[SwapProvider.CHAIN_FUSION]: () => {
		throw new Error(get(i18n).swap.error.unexpected);
	}
} satisfies Record<SwapProvider, (params: SwapParams) => Promise<void>>;

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

const fetchSwapAmountsICPBridge = async ({
	sourceToken,
	destinationToken,
	amount,
	userEthAddress,
	slippage
}: IcpBridgeQuoteParams): Promise<SwapMappedResult[]> => {
	const enabledProviders = icpBridgeProviders.filter(({ isEnabled }) => isEnabled);

	const settledResults = await Promise.allSettled(
		enabledProviders.map(({ getQuote }) =>
			getQuote({ sourceToken, destinationToken, amount, userEthAddress, slippage })
		)
	);

	const results = settledResults.reduce<SwapMappedResult[]>((acc, result) => {
		if (result.status === 'fulfilled' && nonNullish(result.value)) {
			acc.push(result.value);
		}

		return acc;
	}, []);

	return results.sort((a, b) =>
		a.receiveAmount === b.receiveAmount ? 0 : a.receiveAmount > b.receiveAmount ? -1 : 1
	);
};

// This wrapper keeps the return type uniform (array of SwapMappedResult),
// so we can plug in more DEX quote providers later without changing callers.
// Each provider can push its mapped result into the array, easy extendability.
export const fetchSwapAmountsEVM = async ({
	sourceToken,
	destinationToken,
	amount,
	userAddress,
	recipientAddress,
	slippage
}: EvmQuoteParams): Promise<SwapMappedResult[]> => {
	if (isNullish(userAddress)) {
		return [];
	}

	const enabledProviders = evmSwapProviders.filter(({ isEnabled }) => isEnabled);

	const settledResults = await Promise.allSettled(
		enabledProviders.map(({ getQuote }) =>
			getQuote({ sourceToken, destinationToken, amount, userAddress, recipientAddress, slippage })
		)
	);

	const results = settledResults.reduce<SwapMappedResult[]>((acc, result) => {
		if (result.status === 'fulfilled' && nonNullish(result.value)) {
			acc.push(result.value);
		}

		return acc;
	}, []);

	return results.sort((a, b) =>
		a.receiveAmount === b.receiveAmount ? 0 : a.receiveAmount > b.receiveAmount ? -1 : 1
	);
};

// Fan-out for a Bitcoin source; Chain Fusion and NEAR Intents register here. The shape
// matches its three siblings so further `btc`-source providers need no change.
export const fetchSwapAmountsBTC = async ({
	sourceToken,
	destinationToken,
	amount,
	userBtcAddress,
	recipientAddress,
	slippage
}: BtcQuoteParams): Promise<SwapMappedResult[]> => {
	const enabledProviders = btcSwapProviders.filter(({ isEnabled }) => isEnabled);

	const settledResults = await Promise.allSettled(
		enabledProviders.map(({ getQuote }) =>
			getQuote({
				sourceToken,
				destinationToken,
				amount,
				userBtcAddress,
				recipientAddress,
				slippage
			})
		)
	);

	const results = settledResults.reduce<SwapMappedResult[]>((acc, result) => {
		if (result.status === 'fulfilled' && nonNullish(result.value)) {
			acc.push(result.value);
		}

		return acc;
	}, []);

	return results.sort((a, b) =>
		a.receiveAmount === b.receiveAmount ? 0 : a.receiveAmount > b.receiveAmount ? -1 : 1
	);
};

// This wrapper keeps the return type uniform (array of SwapMappedResult),
// so we can plug in more DEX quote providers later without changing callers.
// Each provider can push its mapped result into the array, easy extendability.
export const fetchSwapAmountsSOL = async ({
	sourceToken,
	destinationToken,
	amount,
	userAddress,
	recipientAddress,
	slippage
}: NearIntentsQuoteParams): Promise<SwapMappedResult[]> => {
	if (isNullish(userAddress)) {
		return [];
	}

	const enabledProviders = solSwapProviders.filter(({ isEnabled }) => isEnabled);

	const settledResults = await Promise.allSettled(
		enabledProviders.map(({ getQuote }) =>
			getQuote({ sourceToken, destinationToken, amount, userAddress, recipientAddress, slippage })
		)
	);

	const results = settledResults.reduce<SwapMappedResult[]>((acc, result) => {
		if (result.status === 'fulfilled' && nonNullish(result.value)) {
			acc.push(result.value);
		}

		return acc;
	}, []);

	return results.sort((a, b) =>
		a.receiveAmount === b.receiveAmount ? 0 : a.receiveAmount > b.receiveAmount ? -1 : 1
	);
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

/**
 * Registers the Active User Transaction that carries a committed Velora swap to
 * its terminal state, so the modal can close while settlement continues in the
 * background.
 *
 * Best-effort, mirroring the other AUT providers: by the time this runs the
 * order is live in the auction (Delta) or the transaction is broadcast
 * (Market), so a failure here costs tracking, never funds.
 */
const createVeloraActiveUserTransaction = async ({
	identity,
	mode,
	sourceToken,
	destinationToken,
	swapAmount,
	parsedSwapAmount,
	sourceNetwork,
	pollRefs
}: {
	identity: Identity;
	mode: VeloraSwapMode;
	sourceToken: ErcFungibleToken;
	destinationToken: ErcFungibleToken;
	swapAmount: Amount;
	parsedSwapAmount: bigint;
	sourceNetwork: EthereumNetwork;
	pollRefs: Partial<Record<VeloraExternalRefKey, string>>;
}): Promise<void> => {
	try {
		const data = toVeloraData({
			mode,
			sourceToken,
			destinationToken,
			amount: parsedSwapAmount
		});

		if (isNullish(data)) {
			return;
		}

		// Snapshotted rather than derived at settlement: the row's terminal
		// analytics must report the value the user swapped at, and this is the same
		// rate the wizard used for the `swap_submitted` event of this swap.
		const sourceTokenExchangeRate = get(exchanges)?.[sourceToken.id]?.usd;

		await createActiveUserTransaction({
			identity,
			id: crypto.randomUUID(),
			data,
			externalRefs: toVeloraExternalRefs({
				...toVeloraDisplayRefs({
					sourceToken,
					destinationToken,
					amount: `${swapAmount}`,
					usdSourceValue: nonNullish(sourceTokenExchangeRate)
						? `${Number(swapAmount) * sourceTokenExchangeRate}`
						: undefined
				}),
				[VELORA_EXTERNAL_REF_KEYS.CHAIN_ID]: `${sourceNetwork.chainId}`,
				...pollRefs
			})
		});
	} catch (err: unknown) {
		consoleError(err);
	}
};

export const fetchVeloraDeltaSwap = async ({
	identity,
	progress,
	sourceToken,
	destinationToken,
	swapAmount,
	sourceNetwork,
	slippageValue,
	userAddress,
	gas,
	isGasless,
	maxFeePerGas,
	maxPriorityFeePerGas,
	swapDetails
}: SwapVeloraDeltaParams): Promise<void> => {
	// Velora Delta settles by pulling the source token via allowance/permit, which a native coin
	// (no contract address) can't satisfy without the unimplemented DepositNativeAndPreSign flow.
	// Native sources are routed to the Market quote upstream (fetchVeloraSwapAmount); fail fast
	// here so a routing regression surfaces clearly instead of crashing on an undefined address.
	if (isDefaultEthereumToken(sourceToken)) {
		throw new Error('Velora Delta swaps do not support native source tokens.');
	}

	const parsedSwapAmount = parseToken({
		value: `${swapAmount}`,
		unitName: sourceToken.decimals
	});

	const sdk = constructSimpleSDK({
		chainId: Number(sourceNetwork.chainId),
		fetch: window.fetch
	});

	const deltaContract = await sdk.delta.getDeltaContract();

	if (isNullish(deltaContract)) {
		return;
	}

	let builtOrder;

	const slippageBasisPoints = slippagePercentToBasisPoints(slippageValue);

	// The quoted route carries the tokens, the amounts and the destination chain, so the order is
	// built server-side from it.
	const deltaOrderBaseParams: BuildDeltaOrderParams = {
		route: swapDetails.route,
		side: SWAP_SIDE,
		slippage: slippageBasisPoints,
		owner: userAddress,
		partner: OISY_URL_HOSTNAME
	};

	if (isGasless) {
		progress(ProgressStepsSwap.APPROVE);

		const { deadline, encodedPermit } = await createPermit({
			token: sourceToken,
			userAddress,
			spender: deltaContract,
			value: parsedSwapAmount.toString(),
			identity
		});

		progress(ProgressStepsSwap.SWAP);

		// The order nonce is deliberately not set: the permit nonce is already embedded in the
		// signature inside `encodedPermit`, while the order nonce is a separate per-address replay
		// guard that the server randomizes when omitted. Reusing the per-token, counter-based
		// permit nonce here collides on /v2/delta/orders ("Nonce has already been used").
		builtOrder = await sdk.delta.buildDeltaOrder({
			...deltaOrderBaseParams,
			deadline,
			permit: encodedPermit
		});
	} else {
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

		builtOrder = await sdk.delta.buildDeltaOrder(deltaOrderBaseParams);
	}

	// The server derives the signed on-chain minimum (`destAmount`) from the route and the
	// slippage; re-derive it from the quoted origin output (the leg the on-chain order settles)
	// and refuse to sign an order that guarantees less than the user accepted.
	const minDestAmount = calculateSlippage({
		quoteAmount: BigInt(swapDetails.route.origin.output.amount),
		slippagePercentage: slippageBasisPoints / 100
	});

	if (BigInt(builtOrder.toSign.value.destAmount) < minDestAmount) {
		throw new Error(
			`Slippage exceeded. Velora returned ${builtOrder.toSign.value.destAmount}, expected at least ${minDestAmount}.`
		);
	}

	const hash = getSignParamsEIP712(builtOrder.toSign);

	const signature = await signPrehash({
		hash,
		identity
	});

	const compactSignature = getCompactSignature(signature);

	// The order is live in the auction from here on — the point of no return.
	const deltaAuction = await sdk.delta.postDeltaOrder({
		order: builtOrder.toSign.value,
		signature: compactSignature
	});

	await createVeloraActiveUserTransaction({
		identity,
		mode: { Delta: null },
		sourceToken,
		destinationToken,
		swapAmount,
		parsedSwapAmount,
		sourceNetwork,
		pollRefs: {
			[VELORA_EXTERNAL_REF_KEYS.AUCTION_ID]: deltaAuction.id,
			[VELORA_EXTERNAL_REF_KEYS.ORDER_HASH]: builtOrder.orderHash
		}
	});

	progress(ProgressStepsSwap.UPDATE_UI);

	// The destination token is enabled so it stays visible while the order
	// settles; the balance refresh happens once the AUT row terminalizes.
	await enableSwapDestinationToken({ destinationToken, identity });
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
}: SwapVeloraMarketParams): Promise<void> => {
	const parsedSwapAmount = parseToken({
		value: `${swapAmount}`,
		unitName: sourceToken.decimals
	});

	const sdk = constructSimpleSDK({
		chainId: Number(sourceNetwork.chainId),
		fetch: window.fetch
	});

	const TokenTransferProxy = await sdk.swap.getSpender();

	if (isNotDefaultEthereumToken(sourceToken)) {
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
		slippage: slippagePercentToBasisPoints(slippageValue),
		priceRoute: swapDetails,
		userAddress,
		partner: OISY_URL_HOSTNAME
	});

	// The transaction is broadcast from here on — the point of no return. `swap`
	// also kicks off `processTransactionSent`, which populates the pending row in
	// the token's transaction list; the AUT row adds the durable, cross-session
	// settlement record on top of it.
	const { hash, nonce } = await swap({
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

	await createVeloraActiveUserTransaction({
		identity,
		mode: { Market: null },
		sourceToken,
		destinationToken,
		swapAmount,
		parsedSwapAmount,
		sourceNetwork,
		pollRefs: {
			[VELORA_EXTERNAL_REF_KEYS.TX_HASH]: hash,
			[VELORA_EXTERNAL_REF_KEYS.TX_NONCE]: `${nonce}`
		}
	});

	progress(ProgressStepsSwap.UPDATE_UI);

	// The destination token is enabled so it stays visible while the transaction
	// confirms; the balance refresh happens once the AUT row terminalizes.
	await enableSwapDestinationToken({ destinationToken, identity });
};
