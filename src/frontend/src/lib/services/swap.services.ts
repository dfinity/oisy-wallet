import { approve } from '$icp/api/icrc-ledger.api';
import { sendIcp, sendIcrc } from '$icp/services/ic-send.services';
import { loadCustomTokens } from '$icp/services/icrc.services';
import type { IcTokenToggleable } from '$icp/types/ic-token-toggleable';
import { nowInBigIntNanoSeconds } from '$icp/utils/date.utils';
import { setCustomToken } from '$lib/api/backend.api';
import { executeSwap, getPool, getQuote } from '$lib/api/icp_swap.api';
import { kongSwap, kongTokens } from '$lib/api/kong_backend.api';
import { KONG_BACKEND_CANISTER_ID, NANO_SECONDS_IN_MINUTE } from '$lib/constants/app.constants';
import { ProgressStepsSwap } from '$lib/enums/progress-steps';
import { i18n } from '$lib/stores/i18n.store';
import {
	kongSwapTokensStore,
	type KongSwapTokensStoreData
} from '$lib/stores/kong-swap-tokens.store';
import type { OptionIdentity } from '$lib/types/identity';
import type { Amount } from '$lib/types/send';
import type { Token } from '$lib/types/token';
import { toCustomToken } from '$lib/utils/custom-token.utils';
import { parseToken } from '$lib/utils/parse.utils';
import { waitAndTriggerWallet } from '$lib/utils/wallet.utils';
import type { Identity } from '@dfinity/agent';
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

const token0 = { address: 'ryjl3-tyaaa-aaaaa-aaaba-cai', standard: 'ICP' };
const token1 = { address: 'mxzaz-hqaaa-aaaar-qaada-cai', standard: 'ICRC2' };
const fee = 3000n;

export const fetchPoolData = async ({ identity }: { identity: Identity }) => {
	try {
		const poolData = await getPool({
			identity,
			token0,
			token1,
			fee
		});
		console.log(poolData);
	} catch (error) {
		console.error('Error fetching pool data:', error);
	}
};

export const getQuoteWithSlippage = async ({
	identity,
	amountIn,
	zeroForOne,
	slippagePercentage
}: {
	identity: Identity;
	amountIn: bigint;
	zeroForOne: boolean;
	slippagePercentage: number;
}) => {
	const poolData = await getPool({ identity, token0, token1, fee });

	const swapPoolCanisterId = poolData.canisterId.toString();

	const quoteAmount = await getQuote({
		identity,
		canisterId: swapPoolCanisterId,
		amountIn: amountIn.toString(),
		zeroForOne,
		amountOutMinimum: '0'
	});

	console.log('quoteAmount', quoteAmount);

	const slippageFactor = BigInt(10000 - Math.floor(slippagePercentage * 100));
	const amountOutMinimum = (quoteAmount * slippageFactor) / 10000n;

	return {
		poolCanisterId: swapPoolCanisterId,
		quoteAmount,
		amountOutMinimum
	};
};

// export const performSwap = async ({
// 	identity,
// 	poolCanisterId,
// 	amountIn,
// 	zeroForOne,
// 	slippagePercentage
// }: {
// 	identity: Identity;
// 	poolCanisterId: string;
// 	amountIn: bigint;
// 	zeroForOne: boolean;
// 	slippagePercentage: number;
// }) => {
// 	try {
// 		// 1. отримуємо quote і slippage
// 		const { amountOutMinimum } = await getQuoteWithSlippage({
// 			identity,
// 			amountIn,
// 			zeroForOne,
// 			slippagePercentage
// 		});

// 		// 2. тут маєш зробити deposit через approve/transfer токенів до пулу

// 		// 3. Викликаємо swap
// 		const swapResult = await executeSwap({
// 			identity,
// 			canisterId: poolCanisterId,
// 			amountIn: amountIn.toString(),
// 			zeroForOne,
// 			amountOutMinimum: amountOutMinimum.toString()
// 		});

// 		console.log('Swap successful:', swapResult);
// 		return swapResult;
// 	} catch (error) {
// 		console.error('Swap failed:', error);
// 		throw error;
// 	}
// };

// export const icpSwap = async ({
// 	identity,
// 	progress,
// 	sourceToken,
// 	destinationToken,
// 	swapAmount,
// 	slippageValue,
// 	sourceTokenFee,
// 	isSourceTokenIcrc2
// }: {
// 	identity: OptionIdentity;
// 	progress: (step: ProgressStepsSwap) => void;
// 	sourceToken: IcTokenToggleable;
// 	destinationToken: IcTokenToggleable;
// 	swapAmount: Amount;
// 	slippageValue: Amount;
// 	sourceTokenFee: bigint;
// 	isSourceTokenIcrc2: boolean;
// }) => {
// 	progress(ProgressStepsSwap.SWAP);

// 	const parsedSwapAmount = parseToken({
// 		value: `${swapAmount}`,
// 		unitName: sourceToken.decimals
// 	});

// 	const token0 = {
// 		address: sourceToken.ledgerCanisterId,
// 		standard: sourceToken.standard,
// 		decimals: sourceToken.decimals
// 	};

// 	const token1 = {
// 		address: destinationToken.ledgerCanisterId,
// 		standard: destinationToken.standard,
// 		decimals: destinationToken.decimals
// 	};

// 	const fee = 3000n;

// 	const poolData = await getPool({ identity, token0, token1, fee });
// 	if (!poolData) {
// 		throw new Error('Could not fetch pool data.');
// 	}

// 	const swapPoolCanisterId = poolData.canisterId.toString();

// 	const quoteAmount = await getQuote({
// 		identity,
// 		canisterId: swapPoolCanisterId,
// 		amountIn: parsedSwapAmount.toString(),
// 		zeroForOne: true,
// 		amountOutMinimum: '0'
// 	});

// 	const slippageFactor = BigInt(10000 - Math.floor(Number(slippageValue) * 100));
// 	const amountOutMinimum = (quoteAmount * slippageFactor) / 10000n;

// 	let txBlockIndex: bigint | undefined = undefined;

// 	if (!isSourceTokenIcrc2) {
// 		if (sourceToken.standard === 'icrc') {
// 			txBlockIndex = await sendIcrc({
// 				identity,
// 				token: sourceToken,
// 				amount: parsedSwapAmount,
// 				to: swapPoolCanisterId,
// 				ledgerCanisterId: sourceToken.ledgerCanisterId
// 			});
// 		} else if (sourceToken.standard === 'ICP') {
// 			txBlockIndex = await sendIcp({
// 				identity,
// 				token: sourceToken,
// 				amount: parsedSwapAmount,
// 				to: swapPoolCanisterId
// 			});
// 		}
// 	} else {
// 		await approve({
// 			identity,
// 			ledgerCanisterId: sourceToken.ledgerCanisterId,
// 			amount: parsedSwapAmount + sourceTokenFee * 2n,
// 			expiresAt: nowInBigIntNanoSeconds() + 5n * NANO_SECONDS_IN_MINUTE,
// 			spender: { owner: Principal.fromText(swapPoolCanisterId) }
// 		});
// 	}

// 	await executeSwap({
// 		identity,
// 		canisterId: swapPoolCanisterId,
// 		amountIn: parsedSwapAmount.toString(),
// 		zeroForOne: true,
// 		amountOutMinimum: amountOutMinimum.toString()
// 	});

// 	progress(ProgressStepsSwap.UPDATE_UI);

// 	if (!destinationToken.enabled) {
// 		await setCustomToken({
// 			token: toCustomToken({ ...destinationToken, enabled: true, networkKey: 'Icrc' }),
// 			identity,
// 			nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
// 		});
// 		await loadCustomTokens({ identity });
// 	}

// 	await waitAndTriggerWallet();
// };
export const getIcpSwapAmounts = async ({
	identity,
	amountIn,
	slippage,
	sourceToken,
	destinationToken
}: {
	identity: Identity;
	amountIn: bigint;
	slippage: number;
	sourceToken: any;
	destinationToken: any;
}) => {
	const fee = 3000n;	


	console.log(sourceToken, destinationToken);
	

	const pool = await getPool({
		identity,
		token0: {address: sourceToken.ledgerCanisterId, standard: sourceToken.standard},
		token1: {address: destinationToken.ledgerCanisterId, standard: destinationToken.standard},
		fee
	});

	if (!pool) {
		throw new Error('Pool not found');
	}

	const canisterId = pool.canisterId.toString();


	console.log('Pool data:', pool);
	

	const quote = await getQuote({
		identity,
		canisterId,
		amountIn: BigInt(100000000n).toString(),
		zeroForOne: pool.token0.address === sourceToken.ledgerCanisterId,
		amountOutMinimum: '0'
	});

	const slippageFactor = BigInt(10000 - Math.floor(slippage * 100));
	const amountOutMinimum = (quote * slippageFactor) / 10000n;

	console.log({quote});
	

	return {
		poolCanisterId: canisterId,
		swapAmounts: {
			slippage,
			receiveAmount: amountOutMinimum,
			route: `${sourceToken.symbol} → ${destinationToken.symbol}`,
			liquidityFees: fee,
			networkFee: 10_000n
		},
		amountForSwap: amountIn.toString()
	};
};