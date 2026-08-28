import { ZERO } from '$lib/constants/app.constants';
import type { SolAddress } from '$sol/types/address';
import type { SolNetBalanceChange } from '$sol/types/sol-transaction-summary';
import { isNullish, nonNullish } from '@dfinity/utils';

interface SolTokenBalanceEntry {
	accountIndex: number;
	mint: string;
	owner?: string;
	uiTokenAmount: { amount: string; decimals: number };
}

/**
 * The net effect of an executed transaction on the user's assets, from the balances the network
 * reports around it.
 *
 * Netting is the point: three swaps of the same pair inside one transaction are one movement to
 * the user, and the pre/post balances already say so without any instruction being read.
 *
 * The fee is excluded from the SOL delta when the user paid it. A fee is a fee: folded in, every
 * transaction would read as if it also moved funds.
 *
 * Only the wallet's own lamports count as SOL. Rent parked in a token account the transaction
 * opens has left the wallet, which is exactly how the user experiences it.
 */
export const mapSolNetBalanceChanges = ({
	address,
	fee,
	feePayer,
	accountKeys,
	preBalances,
	postBalances,
	preTokenBalances,
	postTokenBalances
}: {
	address: SolAddress;
	fee?: bigint;
	feePayer?: SolAddress;
	accountKeys: { pubkey: string }[];
	preBalances: bigint[];
	postBalances: bigint[];
	preTokenBalances: SolTokenBalanceEntry[];
	postTokenBalances: SolTokenBalanceEntry[];
}): SolNetBalanceChange[] => {
	const index = accountKeys.findIndex(({ pubkey }) => pubkey === address);

	const rawSolDelta =
		index >= 0 && index < preBalances.length && index < postBalances.length
			? postBalances[index] - preBalances[index]
			: ZERO;

	const solDelta = feePayer === address ? rawSolDelta + (fee ?? ZERO) : rawSolDelta;

	const sum = (entries: SolTokenBalanceEntry[]): Record<string, bigint> =>
		entries.reduce<Record<string, bigint>>(
			(acc, { mint, owner, uiTokenAmount: { amount } }) =>
				owner === address ? { ...acc, [mint]: (acc[mint] ?? ZERO) + BigInt(amount) } : acc,
			{}
		);

	const pre = sum(preTokenBalances);
	const post = sum(postTokenBalances);

	const decimalsOf = (mint: string): number | undefined =>
		[...postTokenBalances, ...preTokenBalances].find((entry) => entry.mint === mint)?.uiTokenAmount
			.decimals;

	const tokenChanges = [...new Set([...Object.keys(pre), ...Object.keys(post)])].reduce<
		SolNetBalanceChange[]
	>((acc, mint) => {
		const delta = (post[mint] ?? ZERO) - (pre[mint] ?? ZERO);

		if (delta === ZERO) {
			return acc;
		}

		const decimals = decimalsOf(mint);

		return [...acc, { tokenAddress: mint, delta, ...(nonNullish(decimals) && { decimals }) }];
	}, []);

	return [...(solDelta === ZERO ? [] : [{ delta: solDelta }]), ...tokenChanges];
};

export const isSolNetBalanceChangeSol = ({ tokenAddress }: SolNetBalanceChange): boolean =>
	isNullish(tokenAddress);
