import { ZERO } from '$lib/constants/app.constants';
import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import { SOLANA_PLUMBING_PROGRAMS, SOLANA_PROGRAM_NAMES } from '$sol/constants/sol.constants';
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

// The instructions as the RPC hands them over, before the mapper decorates them.
type SolInstruction = SolRpcTransaction['transaction']['message']['instructions'][number];

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

// Enough of the shape to classify by, and no more: a transaction with hundreds of inner
// instructions says what it is in its first dozen, and the rest is routing.
const MAX_STEPS = 12;

// A transaction that touched more protocols than this is not going to be named by one of them.
const MAX_PROGRAMS = 3;

/**
 * What the transaction is made of, in the order it ran.
 *
 * The RPC parses the instructions it knows, and their names are already the vocabulary a block
 * explorer titles transactions with: `createAccount`, `transfer`, `closeAccount`, `syncNative`.
 * Anything it cannot parse keeps its program instead, which is itself informative: a step through
 * a swap program is how a routed swap announces itself.
 */
const toSteps = (instructions: readonly SolInstruction[]): string[] =>
	instructions
		.slice(0, MAX_STEPS)
		.map((instruction) =>
			'parsed' in instruction && nonNullish(instruction.parsed?.type)
				? `${instruction.parsed.type}`
				: `unparsed program ${shortenWithMiddleEllipsis({ text: String(instruction.programId) })}`
		);

/**
 * The programs a transaction went through, named where the name is not in doubt.
 *
 * The plumbing every Solana transaction is made of says nothing about what happened, so it is left
 * out: a list ending in "the System program" would have the sentence naming the machinery instead
 * of the app. What remains is the protocol the user actually dealt with, which is what a block
 * explorer puts in its title when the transfers do not reduce to one line.
 */
const toPrograms = (instructions: readonly SolInstruction[]): string[] => {
	const named = instructions
		.map(({ programId }) => String(programId))
		.filter((programId) => !SOLANA_PLUMBING_PROGRAMS.includes(programId))
		.map(
			(programId) =>
				SOLANA_PROGRAM_NAMES[programId] ?? shortenWithMiddleEllipsis({ text: programId })
		);

	return named.filter((name, index) => named.indexOf(name) === index).slice(0, MAX_PROGRAMS);
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
	instructions
}: {
	transaction: SolRpcTransaction;
	address: SolAddress;
	instructions: readonly SolInstruction[];
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

	return {
		legs,
		instructionsCount: instructions.length,
		steps: toSteps(instructions),
		programs: toPrograms(instructions)
	};
};
