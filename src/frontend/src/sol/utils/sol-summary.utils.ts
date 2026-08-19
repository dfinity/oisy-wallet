import { ZERO } from '$lib/constants/app.constants';
import type { Token } from '$lib/types/token';
import { formatToken, shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import {
	SOLANA_SUMMARY_MAX_LENGTH,
	SOLANA_SUMMARY_MAX_PROMPT_LENGTH
} from '$sol/constants/sol-summary.constants';
import type { SolSimulationControlField, SolSimulationPreview } from '$sol/types/sol-simulation';
import type { SolTransactionType, SolTransactionUi } from '$sol/types/sol-transaction';
import type { SolTransactionGroup } from '$sol/types/sol-transaction-group';
import type { SplCustomToken } from '$sol/types/spl-custom-token';
import { findSplToken } from '$sol/utils/spl.utils';
import { isNullish, nonNullish } from '@dfinity/utils';

interface SolSignRequestSummaryFactsParams {
	amount?: bigint;
	token: Token;
	feeToken: Token;
	source: string;
	destination: string;
	isApproval: boolean;
	unreviewed: boolean;
	networkFee: bigint;
	prioritizationFee?: bigint;
	preview?: SolSimulationPreview;
	splTokens: SplCustomToken[];
}

// The prompt speaks of the same things the review labels, but in fixed English rather than in the
// user's locale: the model answers in the language it is prompted in, and a half-translated
// sentence would read worse than an English one.
const CONTROL_FIELD_FACTS: Record<SolSimulationControlField, string> = {
	owner: 'a new account owner',
	delegate: 'a new approved spender',
	closeAuthority: 'a new close authority',
	program: 'a new owning program'
};

const formatAmount = ({ value, decimals }: { value: bigint; decimals: number }): string =>
	formatToken({ value, unitName: decimals, displayDecimals: decimals });

const formatAddress = (address: string): string => shortenWithMiddleEllipsis({ text: address });

// The sign is carried by the amount, exactly as the simulated rows render it.
const formatDelta = ({
	value,
	decimals,
	symbol
}: {
	value: bigint;
	decimals: number;
	symbol: string;
}): string =>
	`Simulated balance change: ${value > ZERO ? '+' : '-'}${formatAmount({ value: value > ZERO ? value : -value, decimals })} ${symbol}`;

/**
 * Whole facts, up to the prompt budget.
 *
 * A screen that has more to say than the budget allows is cut at a line boundary rather than
 * mid-fact, so the model never receives half a figure and phrases it as a whole one.
 */
const withinPromptBudget = (facts: (string | undefined)[]): string[] =>
	facts.reduce<string[]>((acc, fact) => {
		if (isNullish(fact)) {
			return acc;
		}

		const { length } = [...acc, fact].join('\n');

		return length > SOLANA_SUMMARY_MAX_PROMPT_LENGTH ? acc : [...acc, fact];
	}, []);

/**
 * The facts the generated sentence is allowed to phrase.
 *
 * Every line restates something the review has already derived deterministically and is already
 * rendering, in the same shortened form the user sees. Nothing else is sent: the model is never
 * given raw instruction data to interpret, so it can only ever rephrase what is on screen.
 */
export const toSolSignRequestSummaryFacts = ({
	amount,
	token,
	feeToken,
	source,
	destination,
	isApproval,
	unreviewed,
	networkFee,
	prioritizationFee,
	preview,
	splTokens
}: SolSignRequestSummaryFactsParams): string[] => {
	const {
		network: { id: networkId }
	} = feeToken;

	// A simulation that moves nothing says nothing about the outcome, and a control change carries
	// no amount, so only a balance delta counts as the simulation having described what happens.
	const simulatedBalanceChange =
		nonNullish(preview) && (nonNullish(preview.solDelta) || preview.tokenDeltas.length > 0);

	// A decoded leg speaks for the transaction only when it is the whole transaction. Where
	// instructions were left undecoded, the leg OISY can read is often internal plumbing rather
	// than the outcome: a routed swap funds a temporary wrapped-SOL account owned by the signer,
	// so quoting that leg announces a transfer to an address the user never chose and omits the
	// token they actually receive. The simulated balances are the outcome, so where they exist
	// they replace the leg instead of sitting beside it.
	//
	// An approval is exempt. It is not plumbing, it hands spending rights to someone, and the
	// simulated balances do not restate it, so dropping it would hide the fact most worth stating.
	const supersededByPreview = !isApproval && unreviewed && simulatedBalanceChange;

	// Instructions OISY cannot decode yield no amount, and the review drops the amount and
	// destination rows rather than filling them. What is not on screen is not sent either.
	const decoded = nonNullish(amount) && !supersededByPreview;

	const splSymbol = (tokenAddress: string): string =>
		findSplToken({ tokens: splTokens, tokenAddress, networkId })?.symbol ??
		formatAddress(tokenAddress);

	const solDelta = preview?.solDelta;

	const facts: (string | undefined)[] = [
		`Signer: ${formatAddress(source)}`,
		decoded
			? `Amount: ${formatAmount({ value: amount, decimals: token.decimals })} ${token.symbol}`
			: undefined,
		isApproval
			? `Approved spender: ${formatAddress(destination)}`
			: decoded
				? `Recipient: ${formatAddress(destination)}`
				: undefined,
		isApproval
			? 'Kind: an approval that lets the spender move the amount later, not a transfer'
			: undefined,
		`Network fee: ${formatAmount({ value: networkFee, decimals: feeToken.decimals })} ${feeToken.symbol}`,
		nonNullish(prioritizationFee)
			? `Priority fee: ${formatAmount({ value: prioritizationFee, decimals: feeToken.decimals })} ${feeToken.symbol}`
			: undefined,
		nonNullish(solDelta)
			? formatDelta({ value: solDelta, decimals: feeToken.decimals, symbol: feeToken.symbol })
			: undefined,
		...(preview?.tokenDeltas ?? []).map(({ tokenAddress, decimals, delta }) =>
			formatDelta({ value: delta, decimals, symbol: splSymbol(tokenAddress) })
		),
		...(preview?.controlChanges ?? []).map(
			({ account, field }) =>
				`Simulated control change: ${formatAddress(account)} gets ${CONTROL_FIELD_FACTS[field]}`
		),
		unreviewed
			? 'Caveat: OISY could not decode every instruction, so these facts may be incomplete'
			: undefined
	];

	// A message that touches enough accounts to blow the budget has more balance changes than one
	// sentence can honestly describe.
	return withinPromptBudget(facts);
};

// The direction is stated rather than left to be inferred from the addresses: the model is given
// no way to tell which of them is the user's, and guessing is exactly what it must not do.
const TRANSACTION_DIRECTION_FACTS: Record<SolTransactionType, string> = {
	send: 'Direction: sent from this wallet',
	receive: 'Direction: received by this wallet'
};

/**
 * The facts a transaction the user already made is allowed to phrase.
 *
 * The same rule as for a sign request, against a different screen: every line restates a row the
 * transaction details modal is already showing, in the same form. The fee and the block are not
 * sent because that modal does not show them, and the fee is quoted in SOL while the transaction
 * may be an SPL one, so a single token's decimals could not render both faithfully.
 */
export const toSolTransactionSummaryFacts = ({
	transaction: { type, value, from, fromOwner, to, toOwner, status },
	token
}: {
	transaction: SolTransactionUi;
	token: Token;
}): string[] => {
	// The modal shows the owner where it knows one and the token account otherwise. The sentence
	// names the same address, so the two cannot disagree about who the counterparty is.
	const counterparty = type === 'receive' ? (fromOwner ?? from) : (toOwner ?? to);

	return withinPromptBudget([
		TRANSACTION_DIRECTION_FACTS[type],
		nonNullish(value)
			? `Amount: ${formatAmount({ value, decimals: token.decimals })} ${token.symbol}`
			: undefined,
		nonNullish(counterparty)
			? `${type === 'receive' ? 'Sender' : 'Recipient'}: ${formatAddress(counterparty)}`
			: undefined,
		nonNullish(status) ? `Status: ${status}` : undefined
	]);
};

/**
 * The one counterparty of a group, or nothing.
 *
 * Every row has to agree, and every row has to have one. A bundle that touched several addresses
 * has no single counterparty, and a sentence naming one of them would be picking a winner.
 */
const groupCounterparty = ({ transactions }: SolTransactionGroup): string | undefined => {
	const counterparties = transactions.map(
		({ transaction: { type, from, fromOwner, to, toOwner } }) =>
			type === 'receive' ? (fromOwner ?? from) : (toOwner ?? to)
	);

	const [first] = counterparties;

	return nonNullish(first) && counterparties.every((address) => address === first)
		? first
		: undefined;
};

/**
 * The facts the rows of one transaction are allowed to phrase, once they are back together.
 *
 * The legs are already netted, which is the whole point: the row-level amounts are legs of one
 * movement, and only the net is a fact about the balance. The sign is spent here rather than
 * passed on, because "paid" and "received" are what the sentence needs and a bare minus is
 * something a model can drop.
 */
export const toSolTransactionGroupSummaryFacts = (group: SolTransactionGroup): string[] => {
	const { transactions, legs, isSwap, instructionsCount } = group;

	const counterparty = groupCounterparty(group);

	return withinPromptBudget([
		isSwap
			? 'Kind: one transaction that exchanged one token for another'
			: 'Kind: one transaction that moved several amounts',
		...legs.map(({ symbol, decimals, net }) =>
			net < ZERO
				? `Paid: ${formatAmount({ value: -net, decimals })} ${symbol}`
				: `Received: ${formatAmount({ value: net, decimals })} ${symbol}`
		),
		nonNullish(counterparty) ? `Counterparty: ${formatAddress(counterparty)}` : undefined,
		`Transfers: ${transactions.length}`,
		// The amounts above come from the confirmed balances and are whole, but the transfers are
		// only the instructions OISY could read. Saying so keeps the sentence from presenting a
		// partial reading as a complete one.
		nonNullish(instructionsCount) && instructionsCount > transactions.length
			? `Caveat: OISY could only read ${transactions.length} of the ${instructionsCount} instructions, so the amounts are the transaction's while the transfers are not all of it`
			: undefined
	]);
};

// Everything up to and including a reasoning block belongs to the model's scratchpad, not to its
// answer. `/no_think` should prevent it, but a model that ignores the switch must not leak it.
const THINK_REGEX = /^[\s\S]*<\/think>/;

// The answer is one sentence: a terminator followed by whitespace or the end of the string. A
// decimal point inside a figure is followed by a digit, so it does not end the sentence.
const FIRST_SENTENCE_REGEX = /^.*?[.!?](?=\s|$)/;

// Markup, code fences, tables and links have no business in a line that is interpolated as text
// next to a live approval control. Their presence means the model ignored the format it was
// given, which is reason enough to distrust the rest of the answer.
const MARKUP_REGEX = /[<>`|[\]{}*_#]|https?:/i;

const FIGURE_REGEX = /\d+(?:[.,]\d+)*/g;

/**
 * A figure reduced to the quantity it names.
 *
 * `0.10` and `0.1` are the same number, and a model writing a round amount the tidy way was having
 * its whole sentence thrown out for it: every summary of a 0.1 USD1 transfer disappeared. Trailing
 * zeros after a decimal point carry no value, so they are dropped before comparing.
 *
 * The comparison that follows is set membership rather than a substring test, which also closes
 * the other end of the same guard: `includes('1')` was satisfied by the `1` inside `0.001`, so a
 * figure the facts never stated could pass by being a fragment of one that they did.
 */
const sameFigure = (figure: string): string => {
	const plain = figure.replace(/,/g, '');

	return plain.includes('.') ? plain.replace(/0+$/, '').replace(/\.$/, '') : plain;
};

/**
 * The model's answer, or nothing at all.
 *
 * The sentence sits beside rows that are the truth, so anything that could contradict
 * them is dropped rather than repaired: a figure the facts never contained, markup, more than one
 * sentence, or a length past the bound the prompt asked for. Dropping is safe by construction,
 * since the review renders without a summary anyway.
 */
export const sanitizeSolSummary = ({
	content,
	facts
}: {
	content?: string;
	facts: string[];
}): string | undefined => {
	if (isNullish(content)) {
		return;
	}

	const answer = content.replace(THINK_REGEX, '').replace(/\s+/g, ' ').trim();

	// An answer with no terminator at all is already a single fragment, and the length bound below
	// is what keeps it short. Only a second sentence is worth cutting away.
	const sentence = answer.match(FIRST_SENTENCE_REGEX)?.[0] ?? answer;

	if (sentence.length === 0) {
		return;
	}

	if (sentence.length > SOLANA_SUMMARY_MAX_LENGTH) {
		return;
	}

	if (MARKUP_REGEX.test(sentence)) {
		return;
	}

	// The model is told to say this when the facts describe no action, and it is also what a
	// stripped-down answer collapses to.
	if (sentence.replace(/[.!?]/g, '').trim().toUpperCase() === 'UNKNOWN') {
		return;
	}

	// The one thing a summary must never do is put a number on screen that OISY did not derive.
	const stated = new Set((facts.join('\n').match(FIGURE_REGEX) ?? []).map(sameFigure));

	const invented = (sentence.match(FIGURE_REGEX) ?? []).some(
		(figure) => !stated.has(sameFigure(figure))
	);

	return invented ? undefined : sentence;
};
