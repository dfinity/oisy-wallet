/* eslint-disable @typescript-eslint/ban-ts-comment */
import { approve } from '$icp/api/icrc-ledger.api';
import { sendIcp, sendIcrc } from '$icp/services/ic-send.services';
import { loadCustomTokens } from '$icp/services/icrc.services';
import type { IcTokenToggleable } from '$icp/types/ic-token-toggleable';
import { nowInBigIntNanoSeconds } from '$icp/utils/date.utils';
import { setCustomToken } from '$lib/api/backend.api';
import {
	deposit,
	depositFrom,
	getPool,
	getQuote,
	getUserUnusedBalance,
	swapTokens,
	withdraw
} from '$lib/api/icp_swap.api';
import { kongSwap, kongTokens } from '$lib/api/kong_backend.api';
import { swapProviders } from '$lib/config/swapProviders.config';
import { KONG_BACKEND_CANISTER_ID, NANO_SECONDS_IN_MINUTE } from '$lib/constants/app.constants';
import { ICP_SWAP_PROVIDER, KONG_SWAP_PROVIDER } from '$lib/constants/swap.constants';
import { ProgressStepsSwap } from '$lib/enums/progress-steps';
import { i18n } from '$lib/stores/i18n.store';
import {
	kongSwapTokensStore,
	type KongSwapTokensStoreData
} from '$lib/stores/kong-swap-tokens.store';
import type { SwapProviderResult } from '$lib/stores/swap-amounts.store';
import type { OptionIdentity } from '$lib/types/identity';
import type { Amount } from '$lib/types/send';
import type {
	FetchSwapOptionsParams,
	ICPSwapRawResult,
	SwapQuoteParams,
	SwapWithIcpSwapParams
} from '$lib/types/swap';
import { toCustomToken } from '$lib/utils/custom-token.utils';
import { parseToken } from '$lib/utils/parse.utils';
import { calculateSlippage, getSwapSubaccount } from '$lib/utils/swap.utils';
import { waitAndTriggerWallet } from '$lib/utils/wallet.utils';
import type { Identity } from '@dfinity/agent';
import { encodeIcrcAccount } from '@dfinity/ledger-icrc';
import { Principal } from '@dfinity/principal';
import { nonNullish } from '@dfinity/utils';
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
}: {
	identity: OptionIdentity;
	progress: (step: ProgressStepsSwap) => void;
	sourceToken: IcTokenToggleable;
	destinationToken: IcTokenToggleable;
	swapAmount: Amount;
	receiveAmount: bigint;
	slippageValue: Amount;
	sourceTokenFee: bigint;
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

export const swapWithIcpSwap = async ({
	identity,
	progress,
	sourceToken,
	destinationToken,
	swapAmount,
	receiveAmount,
	slippageValue,
	sourceTokenFee,
	isSourceTokenIcrc2,
	fee
}: SwapWithIcpSwapParams): Promise<void> => {
	progress(ProgressStepsSwap.SWAP);

	const parsedSwapAmount = parseToken({
		value: `${swapAmount}`,
		unitName: sourceToken.decimals
	});

	const pool = await getPool({
		identity,
		token0: { address: sourceToken.ledgerCanisterId, standard: sourceToken.standard },
		token1: { address: destinationToken.ledgerCanisterId, standard: destinationToken.standard },
	});

	if (!pool) {
		throw new Error('Pool not found');
	}

	const subaccount = getSwapSubaccount(identity.getPrincipal());

	const toAddress = encodeIcrcAccount({
		owner: Principal.fromText(pool.canisterId.toString()),
		subaccount
	});

	const slippageMinimum = calculateSlippage({
		quoteAmount: receiveAmount,
		slippagePercentage: Number(slippageValue)
	});

	const transferParams = {
		identity,
		token: sourceToken,
		amount: parsedSwapAmount,
		to: toAddress,
		ledgerCanisterId: sourceToken.ledgerCanisterId
	};

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

	try {
		await swapTokens({
			identity,
			canisterId: pool.canisterId.toString(),
			amountIn: parsedSwapAmount.toString(),
			zeroForOne: pool.token0.address === sourceToken.ledgerCanisterId,
			amountOutMinimum: slippageMinimum.toString()
		});
		console.log('✅ Swap successful');
	} catch (error) {
		console.error('⚠️ Swap failed:', error);

		const unused = await getUserUnusedBalance({
			identity,
			canisterId: pool.canisterId.toString(),
			principal: identity.getPrincipal()
		});
		console.warn('🧾 Unused balance in pool:', unused);

		throw new Error('Swap failed, but token is deposited in pool');
	}

	try {
		await withdraw({
			identity,
			canisterId: pool.canisterId.toString(),
			token: destinationToken.ledgerCanisterId,
			amount: receiveAmount,
			fee: fee ?? destinationToken.fee
		});
		console.log('✅ Withdraw successful');
	} catch (error) {
		console.error('⚠️ Withdraw failed:', error);
		const balance = await getUserUnusedBalance({
			identity,
			canisterId: pool.canisterId.toString(),
			principal: identity.getPrincipal()
		});
		console.warn('🧾 Unused withdrawable balance:', balance);
		throw new Error('Withdraw failed, check unused balance');
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

export const fetchSwapAmounts = async ({
	identity,
	sourceToken,
	destinationToken,
	amount,
	tokens
}: FetchSwapOptionsParams): Promise<SwapProviderResult[]> => {
	const sourceAmount = parseToken({
		value: `${amount}`,
		unitName: sourceToken.decimals
	});

	const params = { identity, sourceToken, destinationToken, sourceAmount };

	const [kongResult, icpResult] = await Promise.allSettled([
		swapProviders[KONG_SWAP_PROVIDER].getQuote(params),
		swapProviders[ICP_SWAP_PROVIDER].getQuote(params)
	]);

	const results: SwapProviderResult[] = [];

	if (kongResult.status === 'fulfilled') {
		results.push(
			swapProviders[KONG_SWAP_PROVIDER].mapQuoteResult({ swap: kongResult.value, tokens })
		);
	}

	if (icpResult.status === 'fulfilled') {
		results.push(swapProviders[ICP_SWAP_PROVIDER].mapQuoteResult({ swap: icpResult.value }));
	}

	return results;
};
