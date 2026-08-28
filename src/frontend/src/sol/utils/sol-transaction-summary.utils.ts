import { ZERO } from '$lib/constants/app.constants';
import { formatToken, shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import type { SolInstructionSummary } from '$sol/types/sol-instruction-summary';
import type {
	SolNetBalanceChange,
	SolTransactionSummary
} from '$sol/types/sol-transaction-summary';
import type { SplTokenAddress } from '$sol/types/spl';
import { isSolNetBalanceChangeSol } from '$sol/utils/sol-net-changes.utils';
import { isNullish, nonNullish } from '@dfinity/utils';

const flattenInstructions = (instructions: SolInstructionSummary[]): SolInstructionSummary[] =>
	instructions.flatMap((instruction) => [
		instruction,
		...flattenInstructions(instruction.children ?? [])
	]);

/**
 * The tokens the transaction actually trades, read from its legs.
 *
 * `undefined` in the set stands for native SOL. SOL makes the set only through a transfer or a
 * wrap: an SPL send that opens the recipient an account also moves SOL, but that SOL is rent, and
 * counting it would turn every such send into a swap.
 */
const tradedTokens = (instructions: SolInstructionSummary[]): Set<SplTokenAddress | undefined> =>
	flattenInstructions(instructions).reduce<Set<SplTokenAddress | undefined>>(
		(acc, { kind, tokenAddress }) => {
			if (['send', 'receive'].includes(kind)) {
				acc.add(tokenAddress);
			}

			if (['wrap', 'unwrap'].includes(kind)) {
				acc.add(undefined);
			}

			return acc;
		},
		new Set()
	);

/**
 * The tokens that enter or leave through a route, wrap included, since wrapping is how SOL enters
 * one.
 *
 * A transaction can move an asset outside its routes too: a protocol tip in SOL beside an
 * ORCA-for-USDC swap. Both are outs, but only one of them is the trade, and the route is what
 * tells them apart.
 */
const routeTradedTokens = (
	instructions: SolInstructionSummary[]
): Set<SplTokenAddress | undefined> =>
	instructions.reduce<Set<SplTokenAddress | undefined>>((acc, { kind, children }) => {
		if (kind === 'wrap') {
			acc.add(undefined);
		}

		if (kind !== 'route') {
			return acc;
		}

		(children ?? [])
			.filter((child) => ['send', 'receive'].includes(child.kind))
			.forEach((child) => acc.add(child.tokenAddress));

		return acc;
	}, new Set());

const largest = (changes: SolNetBalanceChange[]): SolNetBalanceChange | undefined =>
	changes.reduce<SolNetBalanceChange | undefined>(
		(acc, change) =>
			isNullish(acc) ||
			(change.delta < ZERO ? -change.delta : change.delta) >
				(acc.delta < ZERO ? -acc.delta : acc.delta)
				? change
				: acc,
		undefined
	);

const counterpartyOf = ({
	instructions,
	kind,
	tokenAddress
}: {
	instructions: SolInstructionSummary[];
	kind: 'send' | 'receive';
	tokenAddress?: SplTokenAddress;
}): string | undefined =>
	flattenInstructions(instructions).find(
		(view) =>
			view.kind === kind &&
			view.tokenAddress === tokenAddress &&
			nonNullish(view.counterparty) &&
			view.own !== true
	)?.counterparty;

/**
 * One transaction reduced to the line the activity list shows.
 *
 * The kind comes from the legs and the magnitudes from the net: the legs say whether SOL was
 * traded or merely spent as rent, the net says how much actually moved once every internal hop
 * cancelled out. Three swaps of one pair net into a single swap; the accounts opened and closed
 * around them stay visible in the instruction list, not here.
 */
export const deriveSolTransactionSummary = ({
	netChanges,
	instructions
}: {
	netChanges: SolNetBalanceChange[];
	instructions: SolInstructionSummary[];
}): SolTransactionSummary => {
	const traded = tradedTokens(instructions);

	const considered = netChanges.filter(
		(change) => !isSolNetBalanceChangeSol(change) || traded.has(undefined)
	);

	const outs = considered.filter(({ delta }) => delta < ZERO);
	const ins = considered.filter(({ delta }) => delta > ZERO);

	if (outs.length === 1 && ins.length === 0) {
		const [spent] = outs;

		return {
			kind: 'send',
			spent,
			counterparty: counterpartyOf({ instructions, kind: 'send', tokenAddress: spent.tokenAddress })
		};
	}

	if (ins.length === 1 && outs.length === 0) {
		const [received] = ins;

		return {
			kind: 'receive',
			received,
			counterparty: counterpartyOf({
				instructions,
				kind: 'receive',
				tokenAddress: received.tokenAddress
			})
		};
	}

	if (outs.length > 0 && ins.length > 0) {
		const routeTraded = routeTradedTokens(instructions);

		const pick = (changes: SolNetBalanceChange[]): SolNetBalanceChange | undefined => {
			const inRoute = changes.filter(({ tokenAddress }) => routeTraded.has(tokenAddress));

			return largest(inRoute.length > 0 ? inRoute : changes);
		};

		return { kind: 'swap', spent: pick(outs), received: pick(ins) };
	}

	return { kind: 'other' };
};

/**
 * The one-line text of a summary, the same regardless of where the list is filtered: the sentence
 * says what the transaction was, the amount column beside it is what varies with the filter.
 *
 * `symbolOf` and `decimalsOf` are the caller's, since only the caller knows which tokens the
 * wallet lists; an unlisted mint is expected to come back named rather than as an address.
 */
export const formatSolTransactionSummary = ({
	summary: { kind, spent, received, counterparty },
	i18n,
	symbolOf,
	decimalsOf
}: {
	summary: SolTransactionSummary;
	i18n: I18n;
	symbolOf: (tokenAddress: SplTokenAddress | undefined) => string;
	decimalsOf: (change: SolNetBalanceChange) => number;
}): string => {
	const amount = (change: SolNetBalanceChange): string =>
		formatToken({
			value: change.delta < ZERO ? -change.delta : change.delta,
			unitName: decimalsOf(change),
			displayDecimals: decimalsOf(change)
		});

	if (kind === 'send' && nonNullish(spent)) {
		return replacePlaceholders(i18n.transaction.text.summary_send, {
			$amount: amount(spent),
			$symbol: symbolOf(spent.tokenAddress),
			$to: nonNullish(counterparty)
				? shortenWithMiddleEllipsis({ text: counterparty })
				: i18n.transaction.text.unknown_token
		});
	}

	if (kind === 'receive' && nonNullish(received)) {
		return replacePlaceholders(i18n.transaction.text.summary_receive, {
			$amount: amount(received),
			$symbol: symbolOf(received.tokenAddress),
			$from: nonNullish(counterparty)
				? shortenWithMiddleEllipsis({ text: counterparty })
				: i18n.transaction.text.unknown_token
		});
	}

	if (kind === 'swap' && nonNullish(spent) && nonNullish(received)) {
		return replacePlaceholders(i18n.transaction.text.summary_swap, {
			$spent: amount(spent),
			$spent_symbol: symbolOf(spent.tokenAddress),
			$received: amount(received),
			$received_symbol: symbolOf(received.tokenAddress)
		});
	}

	return i18n.transaction.text.summary_other;
};

/**
 * One instruction summary as a sentence with an optional detail, composed here so the component
 * stays a renderer. The children of a route are the caller's to indent, not this function's.
 */
export const formatSolInstructionSummary = ({
	instruction: {
		kind,
		amount: value,
		tokenAddress,
		decimals,
		counterparty,
		own,
		rent,
		newAuthority,
		program
	},
	i18n,
	symbolOf,
	decimalsOf
}: {
	instruction: SolInstructionSummary;
	i18n: I18n;
	symbolOf: (tokenAddress: SplTokenAddress | undefined) => string;
	decimalsOf: (tokenAddress: SplTokenAddress | undefined) => number;
}): { text: string; detail?: string } => {
	const amount = (raw: bigint): string =>
		formatToken({
			value: raw < ZERO ? -raw : raw,
			unitName: decimals ?? decimalsOf(tokenAddress),
			displayDecimals: decimals ?? decimalsOf(tokenAddress)
		});

	const shorten = (address: string): string => shortenWithMiddleEllipsis({ text: address });

	const ownDetail = own === true ? i18n.transaction.text.instruction_own_account : undefined;

	if (kind === 'send' && nonNullish(value) && nonNullish(counterparty)) {
		return {
			text: replacePlaceholders(i18n.transaction.text.instruction_send, {
				$amount: amount(value),
				$symbol: symbolOf(tokenAddress),
				$to: shorten(counterparty)
			}),
			...(nonNullish(ownDetail) && { detail: ownDetail })
		};
	}

	if (kind === 'receive' && nonNullish(value) && nonNullish(counterparty)) {
		return {
			text: replacePlaceholders(i18n.transaction.text.instruction_receive, {
				$amount: amount(value),
				$symbol: symbolOf(tokenAddress),
				$from: shorten(counterparty)
			}),
			...(nonNullish(ownDetail) && { detail: ownDetail })
		};
	}

	if (kind === 'wrap' && nonNullish(value)) {
		return {
			text: replacePlaceholders(i18n.transaction.text.instruction_wrap, {
				$amount: formatToken({ value, unitName: 9, displayDecimals: 9 })
			})
		};
	}

	if (kind === 'unwrap') {
		return {
			text: i18n.transaction.text.instruction_unwrap,
			detail: i18n.transaction.text.instruction_rent_returned
		};
	}

	if (kind === 'createTokenAccount') {
		return {
			text: replacePlaceholders(i18n.transaction.text.instruction_create_account, {
				$symbol: symbolOf(tokenAddress)
			}),
			...(nonNullish(rent) && {
				detail: replacePlaceholders(i18n.transaction.text.instruction_rent, {
					$amount: formatToken({ value: rent, unitName: 9, displayDecimals: 9 })
				})
			})
		};
	}

	if (kind === 'closeTokenAccount') {
		return {
			text: i18n.transaction.text.instruction_close_account,
			detail: i18n.transaction.text.instruction_rent_returned
		};
	}

	if (kind === 'approve' && nonNullish(counterparty)) {
		return {
			text: replacePlaceholders(i18n.transaction.text.instruction_approve, {
				$to: shorten(counterparty)
			})
		};
	}

	if (kind === 'revoke') {
		return { text: i18n.transaction.text.instruction_revoke };
	}

	if (kind === 'setAuthority') {
		return {
			text: replacePlaceholders(i18n.transaction.text.instruction_set_authority, {
				$to: nonNullish(newAuthority) ? shorten(newAuthority) : i18n.transaction.text.unknown_token
			})
		};
	}

	if (kind === 'route') {
		return {
			text: replacePlaceholders(i18n.transaction.text.instruction_route, {
				$program: nonNullish(program) ? shorten(program) : i18n.transaction.text.unknown_token
			})
		};
	}

	return { text: i18n.transaction.text.summary_other };
};
