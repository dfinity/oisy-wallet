import { ZERO } from '$lib/constants/app.constants';
import type { SolAddress } from '$sol/types/address';
import type { ParsedAccount, SolRpcTransaction } from '$sol/types/sol-transaction';
import type {
	SolTransactionEffect,
	SolTransactionEffectLeg
} from '$sol/types/sol-transaction-effect';
import { isNullish, nonNullish } from '@dfinity/utils';

type SolTokenBalance = NonNullable<
	NonNullable<SolRpcTransaction['meta']>['preTokenBalances']
>[number];

/**
 * The SOL a transaction moved for this wallet, fee included.
 *
 * The fee belongs in it: it is lamports that left the account, and the figure is meant to answer
 * "what happened to my balance" rather than "what did the transfers add up to". The simulated
 * preview on the signing review states it the same way, so the two agree.
 */
const solLeg = ({
	address,
	accountKeys,
	preBalances,
	postBalances
}: {
	address: SolAddress;
	accountKeys: ParsedAccount[];
	preBalances: readonly bigint[];
	postBalances: readonly bigint[];
}): SolTransactionEffectLeg | undefined => {
	const accountIndex = accountKeys.findIndex(({ pubkey }) => pubkey === address);

	if (accountIndex < 0) {
		return;
	}

	const net =
		BigInt(postBalances[accountIndex] ?? ZERO) - BigInt(preBalances[accountIndex] ?? ZERO);

	return net === ZERO ? undefined : { decimals: SOL_DECIMALS, net };
};

// Lamports per SOL, as the balances state them.
const SOL_DECIMALS = 9;

/**
 * What each mint did for this wallet, netted across every token account it owns.
 *
 * Matching on `owner` rather than on the account address is what makes this work for SPL: a
 * transfer names token accounts, and a rule written against the wallet address alone would see
 * none of them. A mint that ends where it started is dropped, since it did nothing.
 */
const tokenLegs = ({
	address,
	preTokenBalances,
	postTokenBalances
}: {
	address: SolAddress;
	preTokenBalances: readonly SolTokenBalance[];
	postTokenBalances: readonly SolTokenBalance[];
}): SolTransactionEffectLeg[] => {
	const amountsOf = (balances: readonly SolTokenBalance[]) =>
		balances.reduce<Record<string, { amount: bigint; decimals: number }>>((acc, balance) => {
			const { mint, owner, uiTokenAmount } = balance;

			if (owner !== address || isNullish(uiTokenAmount)) {
				return acc;
			}

			const { amount, decimals } = uiTokenAmount;

			return {
				...acc,
				[mint]: { amount: (acc[mint]?.amount ?? ZERO) + BigInt(amount), decimals }
			};
		}, {});

	const pre = amountsOf(preTokenBalances);
	const post = amountsOf(postTokenBalances);

	// A mint present on one side only still moved: an account this transaction created has no
	// pre-balance, and one it closed has no post-balance.
	const mints = [...new Set([...Object.keys(pre), ...Object.keys(post)])];

	return mints.reduce<SolTransactionEffectLeg[]>((acc, mint) => {
		const net = (post[mint]?.amount ?? ZERO) - (pre[mint]?.amount ?? ZERO);

		return net === ZERO
			? acc
			: [
					...acc,
					{
						tokenAddress: mint,
						decimals: post[mint]?.decimals ?? pre[mint]?.decimals ?? 0,
						net
					}
				];
	}, []);
};

/**
 * What a confirmed transaction did to this wallet, and how much of it there was.
 *
 * Derived from the balances the network recorded, so it is complete by construction: an
 * instruction OISY cannot decode still moved value, and still shows up here. What is paid reads
 * before what is received, the way the movement is spoken.
 *
 * Returns `undefined` when the transaction carries no `meta`, which is the only case where nothing
 * can be said with certainty. The caller then falls back to what the decoded rows say.
 */
export const mapSolTransactionEffect = ({
	transaction,
	address,
	instructionsCount
}: {
	transaction: SolRpcTransaction;
	address: SolAddress;
	instructionsCount: number;
}): SolTransactionEffect | undefined => {
	const {
		meta,
		transaction: {
			message: { accountKeys }
		}
	} = transaction;

	if (isNullish(meta)) {
		return;
	}

	const { preBalances, postBalances, preTokenBalances, postTokenBalances } = meta;

	const sol = solLeg({
		address,
		accountKeys: [...(accountKeys ?? [])],
		preBalances: [...(preBalances ?? [])].map((value) => BigInt(value)),
		postBalances: [...(postBalances ?? [])].map((value) => BigInt(value))
	});

	const tokens = tokenLegs({
		address,
		preTokenBalances: [...(preTokenBalances ?? [])],
		postTokenBalances: [...(postTokenBalances ?? [])]
	});

	const legs = [...(nonNullish(sol) ? [sol] : []), ...tokens].sort(
		({ net: a }, { net: b }) => (a < ZERO ? 0 : 1) - (b < ZERO ? 0 : 1)
	);

	return { legs, instructionsCount };
};
