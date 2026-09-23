import { WSOL_TOKEN } from '$env/tokens/tokens-spl/tokens.wsol.env';
import { ZERO } from '$lib/constants/app.constants';
import { maxBigInt } from '$lib/utils/bigint.utils';
import { COMPUTE_BUDGET_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { OptionSolAddress, SolAddress } from '$sol/types/address';
import type {
	SolInstructionSummary,
	SolInstructionSummaryKind
} from '$sol/types/sol-instruction-summary';
import type { SolParsedRpcInstruction } from '$sol/types/sol-instructions';
import type { SplTokenAddress } from '$sol/types/spl';
import { isNullish, nonNullish } from '@dfinity/utils';

export interface SolInstructionGroup {
	index: number;
	instructions: readonly unknown[];
}

const isParsed = (instruction: unknown): instruction is SolParsedRpcInstruction =>
	nonNullish(instruction) &&
	typeof instruction === 'object' &&
	'programId' in instruction &&
	typeof instruction.programId === 'string' &&
	'parsed' in instruction &&
	nonNullish(instruction.parsed) &&
	typeof instruction.parsed === 'object' &&
	'type' in instruction.parsed &&
	typeof instruction.parsed.type === 'string' &&
	'info' in instruction.parsed &&
	nonNullish(instruction.parsed.info) &&
	typeof instruction.parsed.info === 'object';

const field = ({ info, key }: { info: object; key: string }): unknown =>
	(info as Record<string, unknown>)[key];

const address = ({ info, key }: { info: object; key: string }): SolAddress | undefined => {
	const value = field({ info, key });

	return typeof value === 'string' ? value : undefined;
};

const amount = ({ info, key }: { info: object; key: string }): bigint | undefined => {
	const value = field({ info, key });

	// The RPC client hands lamports over as bigint; JSON fixtures carry strings and numbers.
	return typeof value === 'bigint'
		? value
		: typeof value === 'string' || typeof value === 'number'
			? BigInt(value)
			: undefined;
};

/**
 * The amount of a `transferChecked`, which nests it with the decimals the mint uses.
 */
const tokenAmount = (info: object): { amount?: bigint; decimals?: number } => {
	const value = field({ info, key: 'tokenAmount' });

	if (isNullish(value) || typeof value !== 'object') {
		return {};
	}

	const decimals = field({ info: value, key: 'decimals' });

	return {
		amount: amount({ info: value, key: 'amount' }),
		...(typeof decimals === 'number' && { decimals })
	};
};

const TOKEN_PROGRAMS = ['spl-token', 'spl-token-2022'];

/**
 * Instructions that exist only to make another one work. None of them changes what the user holds
 * or controls, and every one of them appears several times in a single routed swap.
 */
const PLUMBING_TYPES = [
	'getAccountDataSize',
	'initializeImmutableOwner',
	'initializeAccount',
	'initializeAccount2',
	'initializeAccount3',
	'syncNative'
];

interface Effect extends SolInstructionSummary {
	parentIndex: number;
}

/**
 * Every instruction of a transaction, top level and inner, each tagged with the top-level
 * instruction it belongs to.
 *
 * A routed swap states none of its transfers at top level and makes all of them as cross-program
 * invocations, so a list built from either half alone describes a different transaction.
 */
const programAddressOf = (instruction: unknown): SolAddress | undefined => {
	if (isNullish(instruction) || typeof instruction !== 'object') {
		return;
	}

	if ('programId' in instruction && typeof instruction.programId === 'string') {
		return instruction.programId;
	}

	if ('programAddress' in instruction && typeof instruction.programAddress === 'string') {
		return instruction.programAddress;
	}
};

const flatten = ({
	instructions,
	innerInstructions
}: {
	instructions: readonly unknown[];
	innerInstructions: readonly SolInstructionGroup[];
}): { parentIndex: number; topLevel: boolean; instruction: SolParsedRpcInstruction }[] =>
	instructions.flatMap((instruction, parentIndex) => {
		const inner = innerInstructions.find(({ index }) => index === parentIndex)?.instructions ?? [];

		// Which of the two an instruction is has to survive the flattening: an account the message
		// itself opens is one the user is paying for, while the same call made inside a program is
		// that program's own plumbing and is already described by the instruction that caused it.
		// Marked before the parse filter, so an unreadable top-level call does not promote its first
		// inner one.
		return [
			{ instruction, topLevel: true },
			...inner.map((nested) => ({ instruction: nested, topLevel: false }))
		]
			.filter(({ instruction: candidate }) => isParsed(candidate))
			.map(({ instruction: parsed, topLevel }) => ({
				parentIndex,
				topLevel,
				instruction: parsed as SolParsedRpcInstruction
			}));
	});

/**
 * The mint each token account holds, from the accounts this transaction itself creates.
 *
 * An account opened and closed inside one message never existed before it, so no caller can have
 * been told about it. Without this a wrapped SOL account closed at the end of a swap reads as an
 * ordinary token account rather than as the unwrap it is.
 */
const collectAccountMints = ({
	flattened,
	addressToToken
}: {
	flattened: { instruction: SolParsedRpcInstruction }[];
	addressToToken: Record<SolAddress, SplTokenAddress>;
}): Record<SolAddress, SplTokenAddress> =>
	flattened.reduce<Record<SolAddress, SplTokenAddress>>((acc, { instruction }) => {
		const {
			parsed: { type, info }
		} = instruction;

		if (!['create', 'createIdempotent', ...PLUMBING_TYPES].includes(type)) {
			return acc;
		}

		const account = address({ info, key: 'account' });
		const mint = address({ info, key: 'mint' });

		return nonNullish(account) && nonNullish(mint) ? { ...acc, [account]: mint } : acc;
	}, addressToToken);

/**
 * The accounts this transaction opens for the user, added to the ones the caller knew about.
 *
 * A token account created and closed inside a single message never appears in any balance, so no
 * caller can name it, yet a wrapped SOL account is exactly that and every routed swap uses one.
 * Without this the wrapping, the legs paid from it and the unwrapping all read as somebody else's.
 */
const expandOwnedAccounts = ({
	flattened,
	ownedAddresses
}: {
	flattened: { instruction: SolParsedRpcInstruction }[];
	ownedAddresses: SolAddress[];
}): Set<SolAddress> =>
	flattened.reduce<Set<SolAddress>>(
		(
			owned,
			{
				instruction: {
					parsed: { type, info }
				}
			}
		) => {
			if (!['create', 'createIdempotent', ...PLUMBING_TYPES].includes(type)) {
				return owned;
			}

			const account = address({ info, key: 'account' });
			const holder = address({ info, key: 'owner' }) ?? address({ info, key: 'wallet' });

			return nonNullish(account) && nonNullish(holder) && owned.has(holder)
				? new Set([...owned, account])
				: owned;
		},
		new Set(ownedAddresses)
	);

const transferEffect = ({
	info,
	owned,
	accountMints
}: {
	info: object;
	owned: Set<SolAddress>;
	accountMints: Record<SolAddress, SplTokenAddress>;
}): Omit<Effect, 'parentIndex'> | undefined => {
	const source = address({ info, key: 'source' });
	const destination = address({ info, key: 'destination' });
	const authority =
		address({ info, key: 'authority' }) ?? address({ info, key: 'multisigAuthority' });

	const { amount: checked, decimals } = tokenAmount(info);
	const value = checked ?? amount({ info, key: 'amount' });

	const tokenAddress =
		address({ info, key: 'mint' }) ??
		(nonNullish(source) ? accountMints[source] : undefined) ??
		(nonNullish(destination) ? accountMints[destination] : undefined);

	// The authority is what makes a transfer the user's own: an SPL transfer names token accounts,
	// and the user's account is the one their wallet signs for, not one whose address they know.
	const outgoing =
		(nonNullish(authority) && owned.has(authority)) || (nonNullish(source) && owned.has(source));
	const incoming = nonNullish(destination) && owned.has(destination);

	if (!outgoing && !incoming) {
		return undefined;
	}

	const kind: SolInstructionSummaryKind = outgoing ? 'send' : 'receive';
	const counterparty = outgoing ? destination : source;

	return {
		kind,
		...(nonNullish(value) && { amount: value }),
		...(nonNullish(tokenAddress) && { tokenAddress }),
		...(nonNullish(decimals) && { decimals }),
		...(nonNullish(counterparty) && { counterparty, own: owned.has(counterparty) })
	};
};

/**
 * One instruction reduced to the effect it has on the user, or nothing when it has none.
 *
 * `rent` is not read here: the lamports an associated token account costs are stated by the System
 * `createAccount` that follows, which is a separate instruction.
 */
const toEffect = ({
	instruction: {
		program,
		parsed: { type, info }
	},
	topLevel,
	position,
	owned,
	userAddress,
	accountMints,
	accountLamports,
	accountTokenAmounts,
	flattened
}: {
	instruction: SolParsedRpcInstruction;
	// Whether the message states this instruction itself, rather than a program having made it.
	topLevel: boolean;
	// Where this instruction sits in the flattened order, so a balance can be taken as it stood
	// here rather than after a later instruction moved it on.
	position: number;
	owned: Set<SolAddress>;
	// The wallet itself, which is the only account of the user's that a close can pay into as a
	// balance. Separate from the set above, which is every account of theirs the run named.
	userAddress: OptionSolAddress;
	accountMints: Record<SolAddress, SplTokenAddress>;
	// What each account held going in, so a close can say what it hands back.
	accountLamports: Partial<Record<SolAddress, bigint>>;
	// What each token account held going in, so a close of an empty wrapped SOL account is not
	// described as unwrapping something.
	accountTokenAmounts: Partial<Record<SolAddress, bigint>>;
	flattened: { instruction: SolParsedRpcInstruction }[];
}): Omit<Effect, 'parentIndex'> | undefined => {
	if (PLUMBING_TYPES.includes(type)) {
		return undefined;
	}

	if (program === 'spl-associated-token-account' && ['create', 'createIdempotent'].includes(type)) {
		const account = address({ info, key: 'account' });
		// `wallet` owns the new account, `source` funds it. They differ on the common case of
		// sending an SPL token to someone who has never held it: the account is theirs, the rent
		// is the sender's, and it is the rent that makes it worth showing.
		const wallet = address({ info, key: 'wallet' });
		const source = address({ info, key: 'source' });
		const mint = address({ info, key: 'mint' });

		const concerns = [account, wallet, source].some(
			(candidate) => nonNullish(candidate) && owned.has(candidate)
		);

		if (isNullish(account) || !concerns) {
			return undefined;
		}

		return { kind: 'createTokenAccount', account, ...(nonNullish(mint) && { tokenAddress: mint }) };
	}

	// An account the message opens for the token program, read as the token account it is about to
	// become: the mint comes from the initialisation that follows, which states it. Without this the
	// list called a creation the wallet had decoded "unrecognised", and named the System program as
	// the whole of what it knew.
	//
	// Top level only. The associated token account program opens its accounts with the same call
	// made inside itself, and that creation is already the line the program's own instruction
	// produces - counting both would open one account twice.
	if (program === 'system' && type === 'createAccount' && topLevel) {
		const account = address({ info, key: 'newAccount' });
		const tokenAddress = nonNullish(account) ? accountMints[account] : undefined;

		// Only an account of the user's. This list is what a transaction does to what they hold, and
		// a counterparty opening its own account is the transaction's business, not theirs.
		return nonNullish(account) && nonNullish(tokenAddress) && owned.has(account)
			? { kind: 'createTokenAccount', account, tokenAddress }
			: undefined;
	}

	if (program === 'system' && type === 'transfer') {
		const source = address({ info, key: 'source' });
		const destination = address({ info, key: 'destination' });

		const outgoing = nonNullish(source) && owned.has(source);
		const incoming = nonNullish(destination) && owned.has(destination);

		if (!outgoing && !incoming) {
			return undefined;
		}

		const counterparty = outgoing ? destination : source;

		return {
			kind: outgoing ? 'send' : 'receive',
			...(nonNullish(amount({ info, key: 'lamports' })) && {
				amount: amount({ info, key: 'lamports' })
			}),
			...(nonNullish(counterparty) && { counterparty, own: owned.has(counterparty) })
		};
	}

	if (nonNullish(program) && TOKEN_PROGRAMS.includes(program)) {
		if (['transfer', 'transferChecked'].includes(type)) {
			return transferEffect({ info, owned, accountMints });
		}

		if (type === 'closeAccount') {
			const account = address({ info, key: 'account' });
			const owner = address({ info, key: 'owner' });
			const destination = address({ info, key: 'destination' });

			const ownAccount = nonNullish(account)
				? owned.has(account) || (nonNullish(owner) && owned.has(owner))
				: false;

			// A close of somebody else's account can still pay the user, and the lamports arrive in
			// their wallet whether or not the account was ever theirs. Left out, the balance changes
			// carry an inflow that no line in the list accounts for. Only when the wallet itself is
			// named: lamports paid into an account of theirs that they did not own to begin with is
			// not an arrival they can spend, and none of it is theirs to be told about.
			const paysUser = nonNullish(destination) && destination === userAddress;

			if (isNullish(account) || !(ownAccount || paysUser)) {
				return undefined;
			}

			const mint = accountMints[account];

			// What it hands back is everything it holds by the time it closes: whatever it already
			// held, the rent it was funded with moments earlier, and anything an earlier close in
			// the same message paid into it.
			const returned = fundedInTransaction({
				account,
				flattened,
				accountLamports,
				accountMints,
				until: position
			});

			// Closing pays the account's whole balance to whoever the instruction names, which need
			// not be the user: read as a close alone, a hand-over of a funded wrapped SOL account
			// reads as money coming back. The destination is carried so the line can say where it
			// went, and marked when it is the user's own.

			// Unwrapping is what closing a wrapped SOL account does with the SOL inside it. An
			// account holding none is just being closed, and saying it unwrapped something states
			// an amount that was never there. An amount nobody read leaves it as an unwrap, which
			// is the reading that does not understate.
			//
			// What it held when it closed, not before the transaction ran: an account this message
			// opened has no state to read beforehand, and the swaps that open one wrap into it and
			// unwrap out of it within the same message. Taken as what it hands back less the rent
			// it was opened with, which is what is left once the account itself is paid for.
			const openedWith = openedWithRent({ account, flattened, until: position });

			const wrapped =
				nonNullish(openedWith) && nonNullish(returned)
					? maxBigInt(returned - openedWith, ZERO)
					: accountTokenAmounts[account];

			return {
				kind: mint === WSOL_TOKEN.address ? 'unwrap' : 'closeTokenAccount',
				account,
				...(nonNullish(mint) && { tokenAddress: mint }),
				...(nonNullish(returned) && { returned }),
				...(nonNullish(wrapped) && { wrapped }),
				...(!ownAccount && { ownAccount }),
				...(nonNullish(destination) && { counterparty: destination, own: owned.has(destination) })
			};
		}

		if (['approve', 'approveChecked', 'revoke'].includes(type)) {
			const source = address({ info, key: 'source' });
			const owner = address({ info, key: 'owner' });

			if (isNullish(source) || !(owned.has(source) || (nonNullish(owner) && owned.has(owner)))) {
				return undefined;
			}

			const { amount: checked } = tokenAmount(info);
			const delegate = address({ info, key: 'delegate' });

			return {
				kind: type === 'revoke' ? 'revoke' : 'approve',
				account: source,
				...(nonNullish(checked ?? amount({ info, key: 'amount' })) && {
					amount: checked ?? amount({ info, key: 'amount' })
				}),
				...(nonNullish(delegate) && { counterparty: delegate, own: owned.has(delegate) }),
				...(nonNullish(accountMints[source]) && { tokenAddress: accountMints[source] })
			};
		}

		// Burning destroys what the account held, and minting creates into it. Neither is a
		// transfer, so no counterparty names either, and the balance is the whole of what changed.
		if (['burn', 'burnChecked', 'mintTo', 'mintToChecked'].includes(type)) {
			const account = address({ info, key: 'account' });
			const authority =
				address({ info, key: 'authority' }) ?? address({ info, key: 'mintAuthority' });

			if (
				isNullish(account) ||
				!(owned.has(account) || (nonNullish(authority) && owned.has(authority)))
			) {
				return undefined;
			}

			const { amount: checked, decimals } = tokenAmount(info);
			const value = checked ?? amount({ info, key: 'amount' });
			const mint = address({ info, key: 'mint' }) ?? accountMints[account];

			return {
				kind: type.startsWith('burn') ? 'burn' : 'mint',
				account,
				...(nonNullish(value) && { amount: value }),
				...(nonNullish(decimals) && { decimals }),
				...(nonNullish(mint) && { tokenAddress: mint })
			};
		}

		// A frozen account holds exactly what it held and can do nothing with it, so no balance
		// anywhere reports this happening.
		if (['freezeAccount', 'thawAccount'].includes(type)) {
			const account = address({ info, key: 'account' });

			if (isNullish(account) || !owned.has(account)) {
				return undefined;
			}

			const mint = address({ info, key: 'mint' }) ?? accountMints[account];

			return {
				kind: type === 'freezeAccount' ? 'freeze' : 'thaw',
				account,
				...(nonNullish(mint) && { tokenAddress: mint })
			};
		}

		if (type === 'setAuthority') {
			const account = address({ info, key: 'account' });

			if (isNullish(account) || !owned.has(account)) {
				return undefined;
			}

			const newAuthority = address({ info, key: 'newAuthority' });

			return {
				kind: 'setAuthority',
				account,
				...(nonNullish(newAuthority) && { newAuthority })
			};
		}
	}

	return undefined;
};

/**
 * What an account holds by the time it is closed, when the same transaction put it there.
 *
 * The System `createAccount` that opens it states the rent, and any System `transfer` into it adds
 * to that: wrapping SOL is exactly such a transfer, so a wrapped account closed at the end of a
 * swap hands back the rent and the wrapped SOL together. No instruction states that total.
 */
/**
 * The rent an account was opened with, when this transaction opened it.
 *
 * Read from the System `createAccount` that states it, which is the only instruction that says
 * what an account costs. Absent for an account the message did not open: nothing in it says what
 * some earlier transaction paid.
 */
const openedWithRent = ({
	account,
	flattened,
	until
}: {
	account: SolAddress;
	flattened: { instruction: SolParsedRpcInstruction }[];
	until?: number;
}): bigint | undefined =>
	flattened.slice(0, until).reduce<bigint | undefined>(
		(
			acc,
			{
				instruction: {
					program,
					parsed: { type, info }
				}
			}
		) =>
			program === 'system' &&
			type === 'createAccount' &&
			address({ info, key: 'newAccount' }) === account
				? amount({ info, key: 'lamports' })
				: acc,
		undefined
	);

const fundedInTransaction = ({
	account,
	flattened,
	accountLamports = {},
	accountMints = {},
	until
}: {
	account: SolAddress;
	flattened: { instruction: SolParsedRpcInstruction }[];
	// What each account held going in, so a chain can start from an account that already existed.
	accountLamports?: Partial<Record<SolAddress, bigint>>;
	// Which mint each account holds. A wrapped SOL account's token balance is its lamports, so a
	// token transfer in or out of one moves lamports; of any other mint, none.
	accountMints?: Record<SolAddress, SplTokenAddress>;
	// Only what arrived before the instruction being described. A close later in the message hands
	// its balance on afterwards, and is no part of what the one being described paid out.
	until?: number;
}): bigint | undefined =>
	// Both sources can apply at once: an account can pre-date the message and still be paid into
	// during it, which is exactly the funded account a hand-over is worth making. Taking one or the
	// other dropped whichever it did not pick.
	flattened.slice(0, until).reduce<bigint | undefined>(
		(
			acc,
			{
				instruction: {
					program,
					parsed: { type, info }
				}
			},
			index
		) => {
			// A close hands its account's whole balance to the account it names, so a chain of them
			// carries the first account's lamports through to the last. Counting System funding alone
			// stops at the first link and reports the tail of a chain as though it began there.
			if (type === 'closeAccount' && address({ info, key: 'destination' }) === account) {
				const closed = address({ info, key: 'account' });

				const inflow = nonNullish(closed)
					? fundedInTransaction({
							account: closed,
							flattened,
							accountLamports,
							accountMints,
							until: index
						})
					: undefined;

				return nonNullish(inflow) ? (acc ?? ZERO) + inflow : acc;
			}

			// A wrapped SOL account holds its token balance as lamports, so a token transfer in or
			// out of one moves them: an account that receives wrapped SOL and still holds it hands
			// over that much more, and one that passes it on hands over that much less. True of no
			// other mint, whose balance is a number in the account rather than the lamports under
			// it.
			if (
				TOKEN_PROGRAMS.includes(program ?? '') &&
				['transfer', 'transferChecked'].includes(type) &&
				accountMints[account] === WSOL_TOKEN.address
			) {
				const moved =
					type === 'transferChecked' ? tokenAmount(info).amount : amount({ info, key: 'amount' });

				if (isNullish(moved)) {
					return acc;
				}

				if (address({ info, key: 'destination' }) === account) {
					return (acc ?? ZERO) + moved;
				}

				if (address({ info, key: 'source' }) === account) {
					return maxBigInt((acc ?? ZERO) - moved, ZERO);
				}

				return acc;
			}

			if (program !== 'system') {
				return acc;
			}

			const funds =
				(type === 'createAccount' && address({ info, key: 'newAccount' }) === account) ||
				(type === 'transfer' && address({ info, key: 'destination' }) === account);

			if (!funds) {
				return acc;
			}

			const lamports = amount({ info, key: 'lamports' });

			return nonNullish(lamports) ? (acc ?? ZERO) + lamports : acc;
		},
		accountLamports[account]
	);

/**
 * The rent an account creation costs, from the System `createAccount` that funds it.
 */
const rentOf = ({
	account,
	flattened
}: {
	account: SolAddress;
	flattened: { instruction: SolParsedRpcInstruction }[];
}): bigint | undefined =>
	flattened.reduce<bigint | undefined>(
		(
			acc,
			{
				instruction: {
					program,
					parsed: { type, info }
				}
			}
		) => {
			if (nonNullish(acc) || program !== 'system' || type !== 'createAccount') {
				return acc;
			}

			return address({ info, key: 'newAccount' }) === account
				? amount({ info, key: 'lamports' })
				: acc;
		},
		undefined
	);

/**
 * Wrapping is a System transfer into a wrapped SOL account the user owns. Nothing in the
 * instruction says so, which is why it is recognised by its destination rather than by its name.
 */
const asWrap = ({
	effect,
	accountMints
}: {
	effect: Omit<Effect, 'parentIndex'>;
	accountMints: Record<SolAddress, SplTokenAddress>;
}): Omit<Effect, 'parentIndex'> =>
	effect.kind === 'send' &&
	isNullish(effect.tokenAddress) &&
	nonNullish(effect.counterparty) &&
	(effect.own ?? false) &&
	accountMints[effect.counterparty] === WSOL_TOKEN.address
		? {
				kind: 'wrap',
				...(nonNullish(effect.amount) && { amount: effect.amount }),
				account: effect.counterparty
			}
		: effect;

/**
 * Consecutive legs of one top-level instruction, gathered under the route that produced them.
 *
 * A route is only a route when it has more than one leg: a plain send performs a single transfer
 * and would otherwise be indented under a heading that describes nothing. Runs are consecutive so
 * that an account closed midway through a swap breaks the route rather than disappearing into it.
 */
const isLeg = ({ kind }: { kind: SolInstructionSummaryKind }): boolean =>
	kind === 'send' || kind === 'receive';

const strip = ({ parentIndex: _parentIndex, ...view }: Effect): SolInstructionSummary => view;

const groupRoutes = ({
	effects,
	programs
}: {
	effects: Effect[];
	programs: Record<number, SolAddress>;
}): SolInstructionSummary[] =>
	effects
		.reduce<Effect[][]>((runs, effect) => {
			const run = runs[runs.length - 1];

			const continues =
				nonNullish(run) &&
				run[0].parentIndex === effect.parentIndex &&
				isLeg(run[0]) === isLeg(effect);

			return continues ? [...runs.slice(0, -1), [...run, effect]] : [...runs, [effect]];
		}, [])
		.flatMap((run) => {
			const [first] = run;

			if (run.length < 2 || !isLeg(first)) {
				return run.map(strip);
			}

			const program = programs[first.parentIndex];

			return [
				{
					kind: 'route' as const,
					...(nonNullish(program) && { program }),
					children: run.map(strip)
				}
			];
		});

/**
 * The instruction list the review shows, from a transaction's own instructions and the ones a
 * simulation says it would make inside them.
 *
 * Pure, and deliberately free of copy: it says what each instruction does to the user, and the
 * component says it in their language.
 *
 * Everything that does not change what the user holds or controls is dropped. That is most of a
 * routed swap: a four-leg route carries around thirty instructions, of which a dozen concern the
 * signer at all, and the rest is account plumbing and transfers between accounts that are not
 * theirs.
 */
export const mapSolInstructionSummaries = ({
	instructions,
	innerInstructions = [],
	ownedAddresses,
	userAddress,
	addressToToken = {},
	accountLamports = {},
	accountTokenAmounts = {},
	includeUnrecognised = false
}: {
	instructions: readonly unknown[];
	innerInstructions?: readonly SolInstructionGroup[];
	ownedAddresses: SolAddress[];
	// The wallet itself, which is the only account of the user's a close can pay into as a balance.
	userAddress: OptionSolAddress;
	addressToToken?: Record<SolAddress, SplTokenAddress>;
	// Lamports per account before the transaction ran, from its balance metadata. A close hands
	// the destination the whole balance, which no instruction states.
	accountLamports?: Partial<Record<SolAddress, bigint>>;
	// What each token account held before the transaction ran. A wrapped SOL account holding
	// nothing is closed rather than unwrapped, and the line says so.
	accountTokenAmounts?: Partial<Record<SolAddress, bigint>>;
	// Whether to keep a line for each top-level instruction that produced no effect of its own.
	// Off where the list stands beside the balance changes that vouch for it, on where it is the
	// only account of the transaction there is.
	includeUnrecognised?: boolean;
}): SolInstructionSummary[] => {
	const flattened = flatten({ instructions, innerInstructions });

	const accountMints = collectAccountMints({ flattened, addressToToken });

	const owned = expandOwnedAccounts({ flattened, ownedAddresses });

	// Read from the top-level instructions themselves: a router's own instruction is precisely the
	// one the RPC cannot parse, so taking it from the flattened list would name the first inner
	// program instead, which is always the token program and says nothing.
	//
	// Both spellings are read because both kinds of instruction arrive here: a confirmed
	// transaction comes back from the RPC naming it `programId`, and an unsigned message carries
	// kit instructions, which name it `programAddress`.
	const programs = instructions.reduce<Record<number, SolAddress>>((acc, instruction, index) => {
		const program = programAddressOf(instruction);

		return nonNullish(program) ? { ...acc, [index]: program } : acc;
	}, {});

	// Plumbing the wallet read and chose not to state: initialising an account it just opened,
	// syncing a wrapped balance, sizing a lookup. `toEffect` returns nothing for these on purpose,
	// which leaves their index uncovered - and listing an instruction that was decoded as one
	// nothing could read is untrue, the same objection the compute budget is excluded on.
	const plumbing = new Set(
		instructions.reduce<number[]>((acc, instruction, index) => {
			if (!isParsed(instruction)) {
				return acc;
			}

			const {
				parsed: { type }
			} = instruction;

			return PLUMBING_TYPES.includes(type) ? [...acc, index] : acc;
		}, [])
	);

	const effects = flattened.reduce<Effect[]>(
		(acc, { parentIndex, topLevel, instruction }, position) => {
			const effect = toEffect({
				instruction,
				topLevel,
				position,
				owned,
				userAddress,
				accountMints,
				accountLamports,
				accountTokenAmounts,
				flattened
			});

			if (isNullish(effect)) {
				return acc;
			}

			const wrapped = asWrap({ effect, accountMints });

			const rent =
				wrapped.kind === 'createTokenAccount' && nonNullish(wrapped.account)
					? rentOf({ account: wrapped.account, flattened })
					: undefined;

			return [...acc, { ...wrapped, ...(nonNullish(rent) && { rent }), parentIndex }];
		},
		[]
	);

	// A top-level instruction none of the effects came from is one the wallet could not read: a
	// program it does not know, or a message whose instructions carry raw bytes rather than the
	// parsed form. Kept in the position it holds in the transaction, so the list reads in the
	// order the run would take rather than as the recognised instructions with the gaps closed up.
	const covered = new Set(effects.map(({ parentIndex }) => parentIndex));

	const listed = includeUnrecognised
		? [
				...effects,
				...instructions.reduce<Effect[]>((acc, _, index) => {
					if (covered.has(index)) {
						return acc;
					}

					const program = programs[index];

					// The review already states what these do, as the priority fee it charges for.
					// Listing them here as instructions nothing could read would be noise on every
					// transaction that sets a compute budget, and untrue besides.
					if (program === COMPUTE_BUDGET_PROGRAM_ADDRESS || plumbing.has(index)) {
						return acc;
					}

					return [
						...acc,
						{
							kind: 'unknown' as const,
							...(nonNullish(program) && { program }),
							parentIndex: index
						}
					];
				}, [])
			].sort(({ parentIndex: first }, { parentIndex: second }) => first - second)
		: effects;

	return groupRoutes({ effects: listed, programs });
};
