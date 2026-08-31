import { ZERO } from '$lib/constants/app.constants';
import type { SolInstructionSummary } from '$sol/types/sol-instruction-summary';
import type { SolSimulationPreview } from '$sol/types/sol-simulation';
import type {
	SolNetBalanceChange,
	SolTransactionSummary
} from '$sol/types/sol-transaction-summary';
import type { SplTokenAddress } from '$sol/types/spl';
import {
	deriveSolTransactionSummary,
	flattenInstructions
} from '$sol/utils/sol-transaction-summary.utils';
import { isNullish, nonNullish } from '@dfinity/utils';

/**
 * What the message moves, read from the message alone.
 *
 * The activity derives this from the balances a confirmed transaction left behind. An unsigned
 * message has none, so its own transfers are the only account of what it intends to move.
 */
const netChangesOf = (instructions: SolInstructionSummary[]): SolNetBalanceChange[] =>
	flattenInstructions(instructions).reduce<SolNetBalanceChange[]>(
		(acc, { kind, amount, tokenAddress, decimals, own }) => {
			// A leg whose other side is an account of the user's own moves nothing out of the
			// wallet: it is the same holding in a different place.
			if (isNullish(amount) || own === true || (kind !== 'send' && kind !== 'receive')) {
				return acc;
			}

			const signed = kind === 'send' ? -amount : amount;
			const existing = acc.find((change) => change.tokenAddress === tokenAddress);

			if (nonNullish(existing)) {
				existing.delta += signed;
				return acc;
			}

			acc.push({ tokenAddress, decimals, delta: signed });
			return acc;
		},
		[]
	);

/**
 * What the message says it does, in the same terms the activity speaks.
 *
 * The simulation is the authority on effects, and it is also best effort: it can fail, and it
 * describes the transaction as the network would run it rather than as it was written. Reading the
 * message on its own gives a second, independent account of the same transaction, which is what
 * makes a disagreement between the two visible at all.
 */
export const deriveSolMessageSummary = ({
	instructions
}: {
	instructions: SolInstructionSummary[];
}): SolTransactionSummary =>
	deriveSolTransactionSummary({ netChanges: netChangesOf(instructions), instructions });

/**
 * What one side of a summary claims, as a signed amount per asset.
 */
const claimsOf = ({
	spent,
	received
}: SolTransactionSummary): { tokenAddress?: SplTokenAddress; delta: bigint }[] =>
	[spent, received]
		.filter(nonNullish)
		.filter(({ delta }) => delta !== ZERO)
		.map(({ tokenAddress, delta }) => ({ tokenAddress, delta }));

/**
 * What the simulated run did, as a signed amount per asset, with the accounts of one mint summed:
 * a swap that routes through two pools touches two accounts of the same mint, and it is the mint
 * the user holds, not the account, that the message speaks about.
 */
const effectsOf = ({
	solDelta,
	tokenDeltas
}: SolSimulationPreview): { tokenAddress?: SplTokenAddress; delta: bigint }[] => {
	const byMint = tokenDeltas.reduce<{ tokenAddress?: SplTokenAddress; delta: bigint }[]>(
		(acc, { tokenAddress, delta }) => {
			const existing = acc.find((effect) => effect.tokenAddress === tokenAddress);

			if (nonNullish(existing)) {
				existing.delta += delta;
				return acc;
			}

			acc.push({ tokenAddress, delta });
			return acc;
		},
		[]
	);

	return [
		...(nonNullish(solDelta) && solDelta !== ZERO ? [{ delta: solDelta }] : []),
		...byMint.filter(({ delta }) => delta !== ZERO)
	];
};

/**
 * Whether the simulated run does what the message says, and nothing else.
 *
 * A message that reduces to a plain send or swap is only worth stating as one if the run agrees:
 * the danger is a message that reads as a small transfer and drains a second asset when it runs,
 * so every mint the run moves must be one the message accounted for, not merely most of them.
 *
 * SOL is the exception, and it is compared apart from the mints. Every transaction pays a fee out
 * of it and may leave rent behind, so the run always moves SOL whether the message mentions it or
 * not: an SPL send states one movement and produces two. What the comparison asks of SOL is that
 * the run took no more of it than the message plus those costs account for.
 */
export const solMessageMatchesSimulation = ({
	summary,
	preview,
	costs
}: {
	summary: SolTransactionSummary;
	preview: SolSimulationPreview;
	costs: bigint;
}): boolean => {
	// An account handed to someone else keeps the exact balance it had, so no comparison of
	// amounts can see it happen.
	if (summary.kind === 'other' || preview.controlChanges.length > 0) {
		return false;
	}

	const claims = claimsOf(summary);
	const effects = effectsOf(preview);

	const isMint = ({ tokenAddress }: { tokenAddress?: SplTokenAddress }): boolean =>
		nonNullish(tokenAddress);

	const mintClaims = claims.filter(isMint);
	const mintEffects = effects.filter(isMint);

	// Both directions: a mint the run moved that the message never mentioned is the theft this
	// guards against, and a mint the message promised that the run never moved is a broken promise.
	if (mintClaims.length !== mintEffects.length) {
		return false;
	}

	if (
		!mintEffects.every(
			(effect) =>
				claims.find(({ tokenAddress }) => tokenAddress === effect.tokenAddress)?.delta ===
				effect.delta
		)
	) {
		return false;
	}

	const solClaimed = claims.find((claim) => !isMint(claim))?.delta ?? ZERO;
	const solMoved = effects.find((effect) => !isMint(effect))?.delta ?? ZERO;

	// What the run took beyond what the message stated. Negative means the run left the user with
	// more SOL than the message promised, which is a disagreement like any other.
	const unaccounted = solClaimed - solMoved;

	return unaccounted >= ZERO && unaccounted <= costs;
};
