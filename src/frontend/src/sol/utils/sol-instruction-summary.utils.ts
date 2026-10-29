import { WSOL_DECIMALS, WSOL_TOKEN } from '$env/tokens/tokens-spl/tokens.wsol.env';
import { ZERO } from '$lib/constants/app.constants';
import { maxBigInt } from '$lib/utils/bigint.utils';
import { ATA_SIZE } from '$sol/constants/ata.constants';
import {
	SOLANA_KNOWN_PROGRAM_ADDRESSES,
	SOLANA_ROUTER_PROGRAM_ADDRESSES
} from '$sol/constants/sol-known-programs.constants';
import {
	COMPUTE_BUDGET_PROGRAM_ADDRESS,
	SYSTEM_PROGRAM_ADDRESS,
	TOKEN_2022_NATIVE_MINT_ADDRESS,
	TOKEN_2022_PROGRAM_ADDRESS,
	TOKEN_PROGRAM_ADDRESS
} from '$sol/constants/sol.constants';
import type { OptionSolAddress, SolAddress } from '$sol/types/address';
import type {
	SolInstructionSummary,
	SolInstructionSummaryKind
} from '$sol/types/sol-instruction-summary';
import type { SolParsedRpcInstruction } from '$sol/types/sol-instructions';
import type { SolClosedAccount } from '$sol/types/sol-simulation';
import type { SplTokenAddress } from '$sol/types/spl';
import { rentExemptMinimumFor } from '$sol/utils/sol-rent.utils';
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
 * Who funds a System `createAccount`: `source` as the RPC parses the call, `payer` as the wallet
 * decodes it.
 */
const funderOf = ({ info }: { info: object }): SolAddress | undefined =>
	address({ info, key: 'source' }) ?? address({ info, key: 'payer' });

/**
 * The amount of a `transferChecked`, which nests it with the decimals the mint uses. A
 * `transferCheckedWithFee` nests the fee it holds back the same way, under `feeAmount`.
 */
const tokenAmount = ({
	info,
	key = 'tokenAmount'
}: {
	info: object;
	key?: string;
}): { amount?: bigint; decimals?: number } => {
	const value = field({ info, key });

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

// Both token programs wrap SOL, each under a native mint of its own, and an account holding either
// keeps what it wraps as lamports.
const isNativeMint = (mint: SplTokenAddress | undefined): boolean =>
	nonNullish(mint) && [WSOL_TOKEN.address, TOKEN_2022_NATIVE_MINT_ADDRESS].includes(mint);

/**
 * Whether a System instruction opens an account, at an address of its own or at one derived from a
 * seed. Both fund and size the account the same way: Raydium, for one, opens the wrapped SOL account
 * of a trade at a seed-derived address and closes it at the end.
 */
const isAccountCreation = (type: string): boolean =>
	['createAccount', 'createAccountWithSeed'].includes(type);

/**
 * The System instructions that pay lamports from one account into another: the plain transfer, the
 * one out of a seed-derived account and a withdrawal from a nonce account. All three state the
 * amount and the destination the same way, and the source of a withdrawal is its nonce account.
 */
const SYSTEM_TRANSFERS = ['transfer', 'transferWithSeed', 'withdrawFromNonce'];

const systemTransferSource = (info: object): SolAddress | undefined =>
	address({ info, key: 'source' }) ?? address({ info, key: 'nonceAccount' });

/**
 * Whether an idempotent account creation found the account already there and did nothing.
 *
 * The run reads every account an instruction writes, and the account a creation names is written,
 * so a pre-state is what says it already existed. Without a run there are no pre-states and
 * nothing is read as a no-op, which is right: the creation is then unrefuted.
 */
const noOpCreations = ({
	flattened,
	accountHolders,
	accountMintsBefore
}: {
	flattened: { parentIndex: number; topLevel: boolean; instruction: SolParsedRpcInstruction }[];
	accountHolders: Partial<Record<SolAddress, SolAddress>>;
	accountMintsBefore: Partial<Record<SolAddress, SplTokenAddress>>;
}): { positions: Set<number>; parents: Set<number> } => {
	// A token account in the state before the message, not lamports at the address. An associated
	// account's address can hold lamports before anything opens an account there, and the creation
	// then opens it on top of them rather than doing nothing; nor does a confirmed transaction's
	// entry of nothing for an account it creates say anything was there.
	const inPlace = new Set<SolAddress>([
		...Object.keys(accountHolders),
		...Object.keys(accountMintsBefore)
	]);

	const positions = new Set<number>();
	const parents = new Set<number>();

	flattened.forEach(
		(
			{
				parentIndex,
				topLevel,
				instruction: {
					program,
					parsed: { type, info }
				}
			},
			position
		) => {
			if (
				program === 'spl-associated-token-account' &&
				['create', 'createIdempotent'].includes(type)
			) {
				const account = address({ info, key: 'account' });

				if (isNullish(account)) {
					return;
				}

				if (type === 'createIdempotent' && inPlace.has(account)) {
					positions.add(position);

					// Only a creation the message states itself. Marking the parent of an inner one
					// would take the program's whole instruction out of the list with it.
					if (topLevel) {
						parents.add(parentIndex);
					}
				}

				inPlace.add(account);

				return;
			}

			if (program === 'system' && type === 'createAccount') {
				const account = address({ info, key: 'newAccount' });

				if (nonNullish(account)) {
					inPlace.add(account);
				}

				return;
			}

			// Closing it puts the address back to nothing, so a creation after one is a creation
			// again rather than a repeat.
			if (nonNullish(program) && TOKEN_PROGRAMS.includes(program) && type === 'closeAccount') {
				const account = address({ info, key: 'account' });

				if (nonNullish(account)) {
					inPlace.delete(account);
				}
			}
		}
	);

	return { positions, parents };
};

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

const isParsedStep = (entry: unknown): entry is { type: string; info: object } =>
	nonNullish(entry) &&
	typeof entry === 'object' &&
	'type' in entry &&
	typeof entry.type === 'string' &&
	'info' in entry &&
	nonNullish(entry.info) &&
	typeof entry.info === 'object';

/**
 * A token batch as the RPC returns one: the parsed instructions it carries, which come without a
 * program of their own, since they run in the batch's. Each is given the batch's in turn. A batch
 * whose contents are not in that shape stays whole, and describes nothing.
 */
export const solRpcBatchedInstructions = <
	T extends { program?: string; parsed: { type: string; info?: object } }
>(
	instruction: T
): T[] => {
	const {
		program,
		parsed: { type, info }
	} = instruction;

	if (
		type !== 'batch' ||
		isNullish(program) ||
		!TOKEN_PROGRAMS.includes(program) ||
		isNullish(info)
	) {
		return [instruction];
	}

	const carried = field({ info, key: 'instructions' });

	if (!Array.isArray(carried) || carried.length === 0) {
		return [instruction];
	}

	const entries = carried.filter(isParsedStep);

	return entries.length === carried.length
		? entries.map((parsed) => ({ ...instruction, parsed }))
		: [instruction];
};

/**
 * Whether the run returns calls made inside a token batch: every call of a top-level batch's
 * instruction, or, for a batch a program runs, the calls right after it one level deeper. A depth
 * the RPC leaves out counts as inside, the reading that trusts no order.
 */
export const solRpcBatchMadeCalls = ({
	inner,
	position
}: {
	inner: readonly unknown[];
	// Where the batch sits among the calls, absent for a batch the message states.
	position?: number;
}): boolean => {
	if (isNullish(position)) {
		return inner.length > 0;
	}

	const next = inner[position + 1];

	if (isNullish(next)) {
		return false;
	}

	const height = stackHeightOf(inner[position]);
	const nextHeight = stackHeightOf(next);

	return isNullish(height) || isNullish(nextHeight) || nextHeight > height;
};

/**
 * A token batch as the instructions it carries, in the order they ran with the calls the run
 * returns for it. The RPC returns every call made inside a batch after all its steps, with nothing
 * saying which step made it, and a step can make calls in the middle of the batch, such as a
 * Token-2022 transfer running its mint's hook. A batch of one step made them after that step; one
 * of more stays whole, since no order between its steps and those calls can be trusted.
 */
export const solRpcOrderedBatchedInstructions = <
	T extends { program?: string; parsed: { type: string; info?: object } }
>({
	instruction,
	madeCalls
}: {
	instruction: T;
	madeCalls: boolean;
}): T[] => {
	const carried = solRpcBatchedInstructions(instruction);

	return madeCalls && carried.length > 1 ? [instruction] : carried;
};

const isTokenBatch = ({ program, parsed: { type } }: SolParsedRpcInstruction): boolean =>
	nonNullish(program) && TOKEN_PROGRAMS.includes(program) && type === 'batch';

// A token batch's instructions are marked as its own, so its lines can be gathered under it. The
// mark names one batch among all the instructions of the transaction, and the program it runs in.
interface SolBatchMark {
	id: string;
	program: SolAddress;
}

interface Effect extends SolInstructionSummary {
	parentIndex: number;
	batch?: SolBatchMark;
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

/**
 * The accounts an instruction names, however it spells them: a kit instruction carries each with
 * its role, and an instruction the RPC could not parse carries their addresses alone.
 */
const accountsOf = (instruction: unknown): SolAddress[] =>
	nonNullish(instruction) &&
	typeof instruction === 'object' &&
	'accounts' in instruction &&
	Array.isArray(instruction.accounts)
		? instruction.accounts.reduce<SolAddress[]>((acc, meta: unknown) => {
				if (typeof meta === 'string') {
					return [...acc, meta];
				}

				return nonNullish(meta) &&
					typeof meta === 'object' &&
					'address' in meta &&
					typeof meta.address === 'string'
					? [...acc, meta.address]
					: acc;
			}, [])
		: [];

/**
 * The top-level instructions that could have emptied an account its program held, in order: those
 * that call that program with the account, themselves or inside them.
 *
 * Only the program that owns an account can take lamports out of it, and the program and the account
 * meet in the same call: an instruction that names the account for something else and calls the
 * program without it never reached the account. Which of several emptied it, the list cannot say: an
 * emptied account stays loaded for the rest of the message, and the program can be called with it
 * again after the close.
 */
export const solClosingInstructionCandidates = ({
	account,
	program,
	instructions,
	innerInstructions
}: {
	account: SolAddress;
	program: SolAddress;
	instructions: readonly unknown[];
	innerInstructions: readonly SolInstructionGroup[];
}): number[] =>
	instructions.reduce<number[]>((acc, instruction, index) => {
		const inner =
			innerInstructions.find(({ index: parent }) => parent === index)?.instructions ?? [];

		const direct =
			programAddressOf(instruction) === program && accountsOf(instruction).includes(account);
		const nested = inner.some(
			(candidate) =>
				programAddressOf(candidate) === program && accountsOf(candidate).includes(account)
		);

		return direct || nested ? [...acc, index] : acc;
	}, []);

const stackHeightOf = (instruction: unknown): number | undefined =>
	nonNullish(instruction) &&
	typeof instruction === 'object' &&
	'stackHeight' in instruction &&
	typeof instruction.stackHeight === 'number'
		? instruction.stackHeight
		: undefined;

/**
 * The call that made each call inside one top-level instruction: the closest call before it one
 * level up, from the depth the RPC reports for every nested call. A call reported without its depth
 * is left without a caller rather than guessed at.
 */
const callersOf = ({
	instruction,
	inner
}: {
	instruction: unknown;
	inner: readonly unknown[];
}): unknown[] => {
	const stack: unknown[] = [instruction];

	return inner.map((nested) => {
		const height = stackHeightOf(nested);

		if (isNullish(height) || height < 2) {
			return undefined;
		}

		const caller = stack[height - 2];

		stack.length = height;
		stack[height - 1] = nested;

		return caller;
	});
};

interface FlattenedInstruction {
	parentIndex: number;
	topLevel: boolean;
	instruction: SolParsedRpcInstruction;
	madeBy?: SolAddress;
	// The accounts the call that made this instruction names, which carry the signatures it acts with.
	madeWith?: SolAddress[];
	batch?: SolBatchMark;
	// A token batch left whole, whose steps nobody read in order.
	wholeBatch?: boolean;
}

const flatten = ({
	instructions,
	innerInstructions
}: {
	instructions: readonly unknown[];
	innerInstructions: readonly SolInstructionGroup[];
}): FlattenedInstruction[] =>
	instructions.flatMap((instruction, parentIndex) => {
		const inner = innerInstructions.find(({ index }) => index === parentIndex)?.instructions ?? [];

		const callers = callersOf({ instruction, inner });

		// Which of the two an instruction is has to survive the flattening: an account the message
		// itself opens is one the user is paying for, while the same call made inside a program is
		// that program's own plumbing and is already described by the instruction that caused it.
		// Marked before the parse filter, so an unreadable top-level call does not promote its first
		// inner one.
		return (
			[
				{
					instruction,
					topLevel: true,
					madeBy: undefined,
					madeWith: [],
					madeCalls: solRpcBatchMadeCalls({ inner })
				},
				...inner.map((nested, index) => ({
					instruction: nested,
					topLevel: false,
					madeBy: programAddressOf(callers[index]),
					madeWith: accountsOf(callers[index]),
					madeCalls: solRpcBatchMadeCalls({ inner, position: index })
				}))
			]
				.filter(({ instruction: candidate }) => isParsed(candidate))
				// A token batch runs the instructions it carries one after the other, so each takes the
				// batch's place in turn, marked as the batch's, and made by whatever made the batch. One
				// whose contents cannot be read, or whose steps cannot be put in order with the calls
				// made inside it, stays whole, and describes nothing.
				.flatMap<FlattenedInstruction>(
					({ instruction: candidate, topLevel, madeBy, madeWith, madeCalls }, position) => {
						const parsed = candidate as SolParsedRpcInstruction;
						const carried = solRpcOrderedBatchedInstructions({ instruction: parsed, madeCalls });

						return carried.length === 1 && carried[0] === parsed
							? [
									{
										parentIndex,
										topLevel,
										instruction: parsed,
										...(nonNullish(madeBy) && { madeBy, madeWith }),
										...(isTokenBatch(parsed) && { wholeBatch: true })
									}
								]
							: carried.map((entry) => ({
									parentIndex,
									topLevel,
									instruction: entry,
									...(nonNullish(madeBy) && { madeBy, madeWith }),
									batch: { id: `${parentIndex}:${position}`, program: parsed.programId }
								}));
					}
				)
		);
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
	isOwned,
	mintOf
}: {
	info: object;
	// Whether an account is the user's as of the transfer, for the same reason as its mint, and
	// whether what arrives at it lands with them.
	isOwned: (params: { account: SolAddress; arriving?: boolean }) => boolean;
	// Which mint an account holds as of the transfer. An unchecked transfer names no mint, and the
	// run's single map holds whichever account an address held last: one closed and opened again
	// for another mint within the message would lend a transfer made before that the later mint.
	mintOf: (account: SolAddress) => SplTokenAddress | undefined;
}): Omit<Effect, 'parentIndex'> | undefined => {
	const source = address({ info, key: 'source' });
	const destination = address({ info, key: 'destination' });
	const authority =
		address({ info, key: 'authority' }) ?? address({ info, key: 'multisigAuthority' });

	const { amount: checked, decimals } = tokenAmount({ info });
	const value = checked ?? amount({ info, key: 'amount' });

	const tokenAddress =
		address({ info, key: 'mint' }) ??
		(nonNullish(source) ? mintOf(source) : undefined) ??
		(nonNullish(destination) ? mintOf(destination) : undefined);

	// The authority is what makes a transfer the user's own: an SPL transfer names token accounts,
	// and the user's account is the one their wallet signs for, not one whose address they know.
	const outgoing =
		(nonNullish(authority) && isOwned({ account: authority })) ||
		(nonNullish(source) && isOwned({ account: source }));
	const incoming = nonNullish(destination) && isOwned({ account: destination, arriving: true });

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
		...(nonNullish(counterparty) && {
			counterparty,
			own: isOwned({ account: counterparty, arriving: outgoing })
		})
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
		programId,
		parsed: { type, info }
	},
	topLevel,
	position,
	noOp,
	ownedAt,
	userAddress,
	accountMints,
	openedAt,
	mintAt,
	returnedAt,
	accountTokenAmounts,
	accountUnsynced,
	rentExemptMinimum,
	flattened
}: {
	instruction: SolParsedRpcInstruction;
	// Whether the message states this instruction itself, rather than a program having made it.
	topLevel: boolean;
	// Where this instruction sits in the flattened order, so a balance can be taken as it stood
	// here rather than after a later instruction moved it on.
	position: number;
	// Whether this instruction is an idempotent creation of an account that was already there by
	// the time it ran, and so did nothing.
	noOp: boolean;
	// Whether an account is the user's as of an instruction, and whether what arrives at it lands
	// with them.
	ownedAt: (params: { account: SolAddress; position: number; arriving?: boolean }) => boolean;
	// The wallet itself, which is the only account of the user's that a close can pay into as a
	// balance. Separate from the accounts above, which are every account of theirs the run named.
	userAddress: OptionSolAddress;
	accountMints: Record<SolAddress, SplTokenAddress>;
	// Whose an account is and which mint it holds as of an instruction, walked from the state
	// before the transaction. Whose it is, as against who may act on it: the signer of a close is
	// its authority, which need not be its holder.
	openedAt: (params: { account: SolAddress; position: number }) => {
		holder?: SolAddress;
		mint?: SplTokenAddress;
	};
	mintAt: (params: { account: SolAddress; position: number }) => SplTokenAddress | undefined;
	// What the close at a position hands back, every lamport its account holds by then.
	returnedAt: (position: number) => bigint | undefined;
	// What each token account held going in, so a close of an empty wrapped SOL account is not
	// described as unwrapping something.
	accountTokenAmounts: Partial<Record<SolAddress, bigint>>;
	// What each wrapped SOL account held going in that no sync has counted yet.
	accountUnsynced: Partial<Record<SolAddress, bigint>>;
	// What a token account of the usual size costs to exist, read from the chain.
	rentExemptMinimum: bigint | undefined;
	flattened: { instruction: SolParsedRpcInstruction }[];
}): Omit<Effect, 'parentIndex'> | undefined => {
	if (PLUMBING_TYPES.includes(type)) {
		return undefined;
	}

	const isOwned = ({ account, arriving }: { account: SolAddress; arriving?: boolean }): boolean =>
		ownedAt({ account, position, arriving });

	if (program === 'spl-associated-token-account' && ['create', 'createIdempotent'].includes(type)) {
		const account = address({ info, key: 'account' });
		// `wallet` owns the new account, `source` funds it. They differ on the common case of
		// sending an SPL token to someone who has never held it: the account is theirs, the rent
		// is the sender's, and it is the rent that makes it worth showing.
		const wallet = address({ info, key: 'wallet' });
		const source = address({ info, key: 'source' });
		const mint = address({ info, key: 'mint' });

		const concerns = [account, wallet, source].some(
			(candidate) => nonNullish(candidate) && isOwned({ account: candidate })
		);

		if (isNullish(account) || !concerns) {
			return undefined;
		}

		// The idempotent form does nothing when the account is already there, and a line saying an
		// account was opened for a message that opened none states an operation that did not
		// happen - along with a rent nobody paid, since the creation it would have been read from
		// never ran. Counted as plumbing rather than dropped, or the instruction it came from would
		// be left uncovered and listed as one nothing could read.
		if (noOp) {
			return undefined;
		}

		return { kind: 'createTokenAccount', account, ...(nonNullish(mint) && { tokenAddress: mint }) };
	}

	// An account opened for a program other than the System and token programs, with rent from the
	// user's wallet: a liquidity position, an order book's open orders. The rent leaves the wallet as surely
	// as a send does, and an application opening its own account inside its instruction may have no
	// other line to show for it - without this one, the instruction read as one nothing described.
	//
	// At any level: the associated token account program opens its accounts the same way, but for
	// the token program, and those are read as the token accounts they become. Both spellings, since
	// a run reports the call as the RPC parses it and a message carries it as the wallet decodes it.
	//
	// Rent and nothing above it. Lamports beyond what the account's size costs are a balance in an
	// account the program controls, a payment that "rent" would understate, and stay unstated.
	//
	// Not an account left with the System program: that is a wallet, whoever holds its key spends
	// what it holds, and funding one is a payment to them rather than rent.
	//
	// The seed-derived form too. Its address is derived from a base rather than a key of its own,
	// which changes nothing about who governs the account once it exists: the program it is opened
	// for, exactly as with the plain form. Signing holds both forms to the same rent, and the review
	// states each one it accepts.
	if (program === 'system' && ['createAccount', 'createAccountWithSeed'].includes(type)) {
		const owner = address({ info, key: 'owner' }) ?? address({ info, key: 'programAddress' });

		if (
			nonNullish(owner) &&
			owner !== SYSTEM_PROGRAM_ADDRESS &&
			owner !== TOKEN_PROGRAM_ADDRESS &&
			owner !== TOKEN_2022_PROGRAM_ADDRESS
		) {
			const source = funderOf({ info });
			const account = address({ info, key: 'newAccount' });
			const lamports = amount({ info, key: 'lamports' });
			const space = amount({ info, key: 'space' });

			const reserve =
				nonNullish(space) && nonNullish(rentExemptMinimum)
					? rentExemptMinimumFor({ space, rentExemptMinimum })
					: undefined;

			return nonNullish(source) &&
				isOwned({ account: source }) &&
				nonNullish(account) &&
				nonNullish(lamports) &&
				nonNullish(reserve) &&
				lamports <= reserve
				? { kind: 'createAccount', account, program: owner, rent: lamports, payer: source }
				: undefined;
		}
	}

	// An account the message opens for the token program, read as the token account it is about to
	// become: the mint comes from the initialisation that follows, which states it. Without this the
	// list called a creation the wallet had decoded "unrecognised", and named the System program as
	// the whole of what it knew.
	//
	// Top level only. The associated token account program opens its accounts with the same call
	// made inside itself, and that creation is already the line the program's own instruction
	// produces - counting both would open one account twice.
	if (program === 'system' && isAccountCreation(type) && topLevel) {
		const account = address({ info, key: 'newAccount' });

		// The mint the initialisation after this creation names. The run's single map holds whichever
		// account the address held last, and only an address the message never initialises has no
		// other account for it to be.
		const opening = nonNullish(account) ? openedNext({ account, flattened, from: position }) : {};

		const tokenAddress = nonNullish(account)
			? (opening.mint ??
				(initialisedInMessage({ account, flattened }) ? undefined : accountMints[account]))
			: undefined;

		// Only an account of the user's. This list is what a transaction does to what they hold, and
		// a counterparty opening its own account is the transaction's business, not theirs. Whose it
		// is, the initialisation that follows says, for the same reason as its mint.
		const theirs = nonNullish(opening.holder)
			? isOwned({ account: opening.holder })
			: nonNullish(account) && isOwned({ account });

		return nonNullish(account) && nonNullish(tokenAddress) && theirs
			? { kind: 'createTokenAccount', account, tokenAddress }
			: undefined;
	}

	// Out of a seed-derived account or a nonce account as well: SOL paid into the wallet from either
	// arrives as surely as from a plain transfer, and a line stating it is what the wallet's own
	// change is held to.
	if (program === 'system' && SYSTEM_TRANSFERS.includes(type)) {
		const source = systemTransferSource(info);
		const destination = address({ info, key: 'destination' });

		const outgoing = nonNullish(source) && isOwned({ account: source });
		const incoming = nonNullish(destination) && isOwned({ account: destination, arriving: true });

		if (!outgoing && !incoming) {
			return undefined;
		}

		const counterparty = outgoing ? destination : source;

		// Paid by somebody else into an account of the user's other than the wallet, the lamports stay
		// in that account, which only the unwrap or the close that pays them on reaches, and the line
		// names it. In a wrapped SOL account they become wrapped SOL there: the account as of the
		// transfer, or the one opened there next, under the native mint of either token program. The
		// amount is lamports, which a native mint counts with the same precision on every network.
		const intoAccount =
			!outgoing && nonNullish(destination) && destination !== userAddress ? destination : undefined;

		const destinationMint = nonNullish(intoAccount)
			? (mintAt({ account: intoAccount, position }) ??
				openedNext({ account: intoAccount, flattened, from: position }).mint)
			: undefined;

		const wrappedMint = isNativeMint(destinationMint) ? destinationMint : undefined;

		return {
			kind: outgoing ? 'send' : 'receive',
			...(nonNullish(amount({ info, key: 'lamports' })) && {
				amount: amount({ info, key: 'lamports' })
			}),
			...(nonNullish(wrappedMint) && { tokenAddress: wrappedMint, decimals: WSOL_DECIMALS }),
			...(nonNullish(intoAccount) && { account: intoAccount }),
			...(nonNullish(counterparty) && {
				counterparty,
				own: isOwned({ account: counterparty, arriving: outgoing })
			})
		};
	}

	if (nonNullish(program) && TOKEN_PROGRAMS.includes(program)) {
		if (['transfer', 'transferChecked'].includes(type)) {
			return transferEffect({
				info,
				isOwned,
				mintOf: (account) => mintAt({ account, position })
			});
		}

		// Unwrapping pays lamports out of a wrapped SOL account to the destination it names, which
		// leaves the account open and moves its wrapped SOL like a transfer does. An amount left
		// unstated is everything the account wraps, as it stands at this instruction.
		if (type === 'unwrapLamports') {
			const source = address({ info, key: 'source' });
			const destination = address({ info, key: 'destination' });
			const stated = amount({ info, key: 'amount' });

			const wrapped =
				isNullish(stated) && nonNullish(source)
					? heldAtInstruction({
							account: source,
							native: true,
							flattened,
							accountTokenAmounts,
							accountUnsynced,
							rentExemptMinimum,
							payoutAt: returnedAt,
							until: position
						})
					: undefined;

			const effect = transferEffect({
				info: nonNullish(wrapped) ? { ...info, amount: wrapped } : info,
				isOwned,
				mintOf: (account) => mintAt({ account, position })
			});

			if (isNullish(effect)) {
				return undefined;
			}

			// The source holds the native mint of the program that runs the unwrap, or the program
			// refuses it, so that is the mint whether or not a run read the account. The amount is
			// lamports, which a native mint counts with the same precision on every network. One that
			// names none says so, which is what the line can still state when nobody read the amount.
			const unwrapping = {
				...effect,
				tokenAddress:
					programId === TOKEN_2022_PROGRAM_ADDRESS
						? TOKEN_2022_NATIVE_MINT_ADDRESS
						: WSOL_TOKEN.address,
				...(isNullish(stated) && { unwrapsAll: true }),
				decimals: WSOL_DECIMALS
			};

			// Paid to the wallet, what leaves the account arrives there as SOL itself, whoever held
			// it, and what the wallet holds has to count it.
			return nonNullish(destination) && destination === userAddress
				? { ...unwrapping, unwrapsToWallet: true }
				: unwrapping;
		}

		// Withdrawing excess lamports pays the destination whatever its source holds above what it
		// costs to exist and what it wraps, and names no amount. Paid to the wallet, that is SOL
		// arriving there by an amount nobody read, which leaves the wallet's change as unknown as
		// the line says. The line says it is the account's excess, which is what it can still state.
		if (type === 'withdrawExcessLamports') {
			const source = address({ info, key: 'source' });
			const destination = address({ info, key: 'destination' });

			return nonNullish(destination) && destination === userAddress
				? {
						kind: 'receive',
						withdrawsExcess: true,
						...(nonNullish(source) && { counterparty: source, own: isOwned({ account: source }) })
					}
				: undefined;
		}

		if (type === 'closeAccount') {
			const account = address({ info, key: 'account' });
			const owner = address({ info, key: 'owner' });
			const destination = address({ info, key: 'destination' });

			// Whose the account is, not who may close it. The signer of a close is its authority,
			// which is the holder normally and the close authority when one is set: a third party
			// naming this wallet as close authority on their own account would otherwise have it
			// read as the user's, its rent credited against what the transaction costs them and a
			// close of it elsewhere refused as their loss.
			//
			// Three readings, because absent is not the same as somebody else's: an account no run
			// read says nothing either way, and calling it not theirs would drop it out of the
			// refusal. Only an account read and held by somebody else is stated as not the user's.
			const { holder } = nonNullish(account) ? openedAt({ account, position }) : {};

			const ownAccount = nonNullish(holder)
				? holder === userAddress
				: nonNullish(account) && isOwned({ account })
					? true
					: undefined;

			// A close of somebody else's account can still pay the user, and the lamports arrive in
			// their wallet whether or not the account was ever theirs. Left out, the balance changes
			// carry an inflow that no line in the list accounts for. Only when the wallet itself is
			// named: lamports paid into an account of theirs that they did not own to begin with is
			// not an arrival they can spend, and none of it is theirs to be told about.
			const paysUser = nonNullish(destination) && destination === userAddress;

			// The authority stays in the test that decides whether the close is shown at all: it is
			// the only thing tying a close to the user when no run read the account.
			const concerns =
				(ownAccount ?? false) ||
				(nonNullish(owner) && isOwned({ account: owner }) && ownAccount !== false) ||
				paysUser;

			if (isNullish(account) || !concerns) {
				return undefined;
			}

			// The part of the payout that is rent. A Token program account is always the same size,
			// so its reserve is the chain's minimum for that size; a Token-2022 account varies with
			// its extensions, and its reserve is not stated rather than guessed at. Told apart by the
			// program's address: a parsed response labels both programs `spl-token`.
			const reserve = programId === TOKEN_PROGRAM_ADDRESS ? rentExemptMinimum : undefined;

			// The mint the account holds as of this close, for the same reason as its holder: an
			// address reopened for another mint later in the message would otherwise lend this close
			// that later mint, and with it the wrong label and the wrong split.
			const mint = mintAt({ account, position });

			// What it hands back is everything it holds by the time it closes: whatever it already
			// held, the rent it was funded with moments earlier, and anything an earlier close in
			// the same message paid into it.
			const returned = returnedAt(position);

			// Closing pays the account's whole balance to whoever the instruction names, which need
			// not be the user: read as a close alone, a hand-over of a funded wrapped SOL account
			// reads as money coming back. The destination is carried so the line can say where it
			// went, and marked when it is the user's own.

			// Unwrapping is what closing a wrapped SOL account does with the SOL inside it. An
			// account holding none is just being closed, and saying it unwrapped something states
			// an amount that was never there. An amount nobody read leaves it as an unwrap, which
			// is the reading that does not understate.
			//
			// The kind says so too, not only the words: an unwrap is read as SOL the transaction
			// trades, and an empty account's rent coming back beside a send would make the send read
			// as a swap.
			//
			// What it held when it closed, not before the transaction ran: the swaps that open one
			// wrap into it and unwrap out of it within the same message, and one that pre-dates the
			// message can be emptied before its close just the same.
			const wrapped = heldAboveReserveAtInstruction({
				account,
				native: mint === WSOL_TOKEN.address,
				flattened,
				accountTokenAmounts,
				accountUnsynced,
				rentExemptMinimum,
				payoutAt: returnedAt,
				until: position
			});

			return {
				kind: mint === WSOL_TOKEN.address && wrapped !== ZERO ? 'unwrap' : 'closeTokenAccount',
				account,
				...(nonNullish(mint) && { tokenAddress: mint }),
				...(nonNullish(returned) && { returned }),
				...(nonNullish(wrapped) && { wrapped }),
				...(nonNullish(reserve) && { reserve }),
				...(ownAccount === false && { ownAccount }),
				...(nonNullish(destination) && {
					counterparty: destination,
					own: isOwned({ account: destination, arriving: true })
				})
			};
		}

		if (['approve', 'approveChecked', 'revoke'].includes(type)) {
			const source = address({ info, key: 'source' });
			const owner = address({ info, key: 'owner' });

			if (
				isNullish(source) ||
				!(isOwned({ account: source }) || (nonNullish(owner) && isOwned({ account: owner })))
			) {
				return undefined;
			}

			const { amount: checked, decimals } = tokenAmount({ info });
			const delegate = address({ info, key: 'delegate' });
			const approved = address({ info, key: 'mint' }) ?? mintAt({ account: source, position });

			return {
				kind: type === 'revoke' ? 'revoke' : 'approve',
				account: source,
				...(nonNullish(checked ?? amount({ info, key: 'amount' })) && {
					amount: checked ?? amount({ info, key: 'amount' })
				}),
				...(nonNullish(decimals) && { decimals }),
				...(nonNullish(delegate) && {
					counterparty: delegate,
					own: isOwned({ account: delegate })
				}),
				...(nonNullish(approved) && { tokenAddress: approved })
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
				!(isOwned({ account }) || (nonNullish(authority) && isOwned({ account: authority })))
			) {
				return undefined;
			}

			const { amount: checked, decimals } = tokenAmount({ info });
			const value = checked ?? amount({ info, key: 'amount' });
			const mint = address({ info, key: 'mint' }) ?? mintAt({ account, position });

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

			if (isNullish(account) || !isOwned({ account })) {
				return undefined;
			}

			const mint = address({ info, key: 'mint' }) ?? mintAt({ account, position });

			return {
				kind: type === 'freezeAccount' ? 'freeze' : 'thaw',
				account,
				...(nonNullish(mint) && { tokenAddress: mint })
			};
		}

		if (type === 'setAuthority') {
			const account = address({ info, key: 'account' });

			if (isNullish(account) || !isOwned({ account })) {
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
 * What a token account holds as a walk stands, in the two parts the token programs keep apart for
 * wrapped SOL: the token amount, which transfers and unwraps move, and lamports paid in on top of
 * the amount and the reserve that no sync has counted yet. A close hands back both. An unwrap of
 * everything moves the amount alone, until `syncNative` folds the rest into it. An account of any
 * other mint holds its amount alone.
 */
interface HeldBalance {
	amount: bigint | undefined;
	unsynced: bigint | undefined;
}

// A sum is known only when every part of it is.
const plus = (parts: (bigint | undefined)[]): bigint | undefined =>
	parts.reduce<bigint | undefined>(
		(acc, part) => (nonNullish(acc) && nonNullish(part) ? acc + part : undefined),
		ZERO
	);

// The instructions that set a wrapped SOL account's amount to every lamport above its reserve:
// syncing it, and initialising it, which is where an opening's funding becomes its balance.
const SYNCING_TYPES = [
	'syncNative',
	'initializeAccount',
	'initializeAccount2',
	'initializeAccount3'
];

/**
 * The same walk the lamports take, over the token balance: from what the account held before the
 * transaction, or from nothing when this message opened it, plus every transfer in and out since.
 * Reading the state from before the transaction instead says a wrapped SOL account emptied on the
 * way still holds what it started with, and calls its close an unwrap of something already gone.
 *
 * Going in, an account holds what the run read: its amount, and the lamports above the reserve it
 * states and that amount, which a sync in the message folds in. Where no run read the reserve the
 * account is taken as synced, and only lamports the message pays in wait for a sync.
 *
 * Undefined when there is nothing to start from: an account that pre-dates the message and whose
 * state no run read is one whose balance nobody knows.
 */
const balanceAtInstruction = ({
	account,
	native,
	flattened,
	accountTokenAmounts,
	accountUnsynced,
	rentExemptMinimum,
	payoutAt,
	until
}: {
	account: SolAddress;
	// Whether the account holds wrapped SOL, whose token amount is lamports: a System transfer into
	// one is the wrapping, counted in the amount once the account is synced. Of any other mint,
	// lamports paid in stay lamports.
	native: boolean;
	flattened: { instruction: SolParsedRpcInstruction }[];
	accountTokenAmounts: Partial<Record<SolAddress, bigint>>;
	// What each wrapped SOL account held going in that no sync has counted yet, where a run read it.
	accountUnsynced: Partial<Record<SolAddress, bigint>>;
	// What the chain charges a token account of the usual size to exist. A creation may fund one
	// with more than that and let its initialisation read the difference as the balance, so the
	// two cannot be told apart without knowing where the line falls.
	rentExemptMinimum: bigint | undefined;
	// What the close at a position pays out, as the close walk has it.
	payoutAt: (position: number) => bigint | undefined;
	until: number;
}): HeldBalance | undefined => {
	const amountBefore = accountTokenAmounts[account];

	return flattened.slice(0, until).reduce<HeldBalance | undefined>(
		(
			held,
			{
				instruction: {
					program,
					parsed: { type, info }
				}
			},
			position
		) => {
			const token = nonNullish(program) && TOKEN_PROGRAMS.includes(program);

			// A close of this account ends it, and an address closed and opened again within the one
			// message is two accounts. Until something opens it again there is no balance to state.
			if (token && type === 'closeAccount' && address({ info, key: 'account' }) === account) {
				return undefined;
			}

			// Opening it starts it from whatever its creation funded above the reserve - nothing, for
			// any mint but wrapped SOL. Nothing states that split for wrapped SOL: the creation gives
			// one figure and the close gives the same one back, so without the reserve the balance is
			// unknown rather than nothing.
			if (
				program === 'system' &&
				isAccountCreation(type) &&
				address({ info, key: 'newAccount' }) === account
			) {
				if (!native) {
					return { amount: ZERO, unsynced: ZERO };
				}

				const lamports = amount({ info, key: 'lamports' });

				return {
					amount:
						nonNullish(lamports) &&
						nonNullish(rentExemptMinimum) &&
						amount({ info, key: 'space' }) === ATA_SIZE
							? maxBigInt(lamports - rentExemptMinimum, ZERO)
							: undefined,
					unsynced: ZERO
				};
			}

			// Nothing to start from stays nothing whatever moves after it.
			if (isNullish(held)) {
				return held;
			}

			// A close of another account pays everything it held into the one it names, and in a
			// wrapped SOL account those are lamports no sync counted yet.
			if (
				native &&
				token &&
				type === 'closeAccount' &&
				address({ info, key: 'destination' }) === account
			) {
				return { ...held, unsynced: plus([held.unsynced, payoutAt(position)]) };
			}

			// Wrapping: a System payment into a wrapped SOL account pays lamports in, which its token
			// amount counts once the account is synced.
			if (native && program === 'system' && SYSTEM_TRANSFERS.includes(type)) {
				return address({ info, key: 'destination' }) === account
					? { ...held, unsynced: plus([held.unsynced, amount({ info, key: 'lamports' })]) }
					: held;
			}

			if (
				native &&
				token &&
				SYNCING_TYPES.includes(type) &&
				address({ info, key: 'account' }) === account
			) {
				return { amount: plus([held.amount, held.unsynced]), unsynced: ZERO };
			}

			// Unwrapping takes the amount it states, or the whole amount, out of the token amount. Paid
			// elsewhere, the lamports leave with it; into the account itself they stay, on top of an
			// amount that dropped all the same. Paid into another wrapped SOL account, they arrive
			// there the way a wrapping does, by an amount nobody knows when the unwrap states none.
			if (native && token && type === 'unwrapLamports') {
				const unwrapped = amount({ info, key: 'amount' });
				const outOf = address({ info, key: 'source' }) === account;
				const into = address({ info, key: 'destination' }) === account;

				if (!outOf) {
					return into ? { ...held, unsynced: plus([held.unsynced, unwrapped]) } : held;
				}

				const remaining = isNullish(unwrapped)
					? ZERO
					: nonNullish(held.amount)
						? maxBigInt(held.amount - unwrapped, ZERO)
						: undefined;

				return {
					amount: remaining,
					unsynced: into ? plus([held.unsynced, unwrapped ?? held.amount]) : held.unsynced
				};
			}

			// Withdrawing excess lamports takes exactly what no sync counted out of its source, which
			// leaves the amount as it was, and pays its destination an amount nobody stated, which no
			// sync has counted there either.
			if (native && token && type === 'withdrawExcessLamports') {
				const outOf = address({ info, key: 'source' }) === account;
				const into = address({ info, key: 'destination' }) === account;

				return outOf === into ? held : { ...held, unsynced: outOf ? ZERO : undefined };
			}

			if (!token || !['transfer', 'transferChecked'].includes(type)) {
				return held;
			}

			const moved =
				type === 'transferChecked' ? tokenAmount({ info }).amount : amount({ info, key: 'amount' });

			// An amount nobody knows stays unknown whatever moves after it.
			if (isNullish(moved) || isNullish(held.amount)) {
				return held;
			}

			const into = address({ info, key: 'destination' }) === account;
			const outOf = address({ info, key: 'source' }) === account;

			// Moving nothing for the account unless exactly one end is it: a transfer from it to itself
			// leaves the balance where it was, and reading the destination alone counts it in.
			if (into === outOf) {
				return held;
			}

			return {
				...held,
				amount: into ? held.amount + moved : maxBigInt(held.amount - moved, ZERO)
			};
		},
		nonNullish(amountBefore)
			? { amount: amountBefore, unsynced: native ? (accountUnsynced[account] ?? ZERO) : ZERO }
			: undefined
	);
};

type BalanceParams = Parameters<typeof balanceAtInstruction>[0];

/**
 * What a token account holds in tokens by the time an instruction reaches it, which is what an
 * unwrap naming no amount moves.
 */
const heldAtInstruction = (params: BalanceParams): bigint | undefined =>
	balanceAtInstruction(params)?.amount;

/**
 * Everything a token account holds above its reserve by the time an instruction reaches it: what
 * it wraps, and lamports paid in that no sync counted yet. A close hands both back.
 */
const heldAboveReserveAtInstruction = (params: BalanceParams): bigint | undefined => {
	const held = balanceAtInstruction(params);

	return plus([held?.amount, held?.unsynced]);
};

/**
 * Whose a token account is and which mint it holds, as of an instruction: what it was opened as,
 * for its current lifecycle.
 *
 * Walked from the state before the transaction ran, the same way its balances are: initialising an
 * account names whose it is and its mint, an associated-account creation does the same, and
 * closing it ends it. Taking either from the run's report for the whole transaction instead let a
 * message close an account of the user's, open the same address again for somebody else or for
 * another mint, and have the first close read as that later account.
 *
 * A hand-over of ownership is deliberately not followed. It changes who may act on the account,
 * not whose lamports it holds, and following it would make one message enough to take them: hand
 * the user's account to a program's own address, close it to a stranger, and the close would read
 * as the program's rather than be refused. By the same rule an account handed to the user stays
 * whoever's it was.
 */
const openedAs = ({
	account,
	flattened,
	accountHolders,
	accountMintsBefore,
	until
}: {
	account: SolAddress;
	flattened: { instruction: SolParsedRpcInstruction }[];
	accountHolders: Partial<Record<SolAddress, SolAddress>>;
	accountMintsBefore: Partial<Record<SolAddress, SplTokenAddress>>;
	until: number;
}): { holder?: SolAddress; mint?: SplTokenAddress; closed?: boolean } =>
	flattened
		.slice(0, until)
		.reduce<{ holder?: SolAddress; mint?: SplTokenAddress; closed?: boolean }>(
			(
				acc,
				{
					instruction: {
						program,
						parsed: { type, info }
					}
				}
			) => {
				if (address({ info, key: 'account' }) !== account) {
					return acc;
				}

				const names = (holderKey: string): { holder?: SolAddress; mint?: SplTokenAddress } => {
					const holder = address({ info, key: holderKey }) ?? acc.holder;
					const mint = address({ info, key: 'mint' }) ?? acc.mint;

					return {
						...(nonNullish(holder) && { holder }),
						...(nonNullish(mint) && { mint })
					};
				};

				if (
					program === 'spl-associated-token-account' &&
					['create', 'createIdempotent'].includes(type)
				) {
					return names('wallet');
				}

				if (isNullish(program) || !TOKEN_PROGRAMS.includes(program)) {
					return acc;
				}

				if (['initializeAccount', 'initializeAccount2', 'initializeAccount3'].includes(type)) {
					return names('owner');
				}

				// A close ends the account, which is not the same as nobody having read whose it was:
				// until something opens the address again, it holds no account at all.
				return type === 'closeAccount' ? { closed: true } : acc;
			},
			{
				...(nonNullish(accountHolders[account]) && { holder: accountHolders[account] }),
				...(nonNullish(accountMintsBefore[account]) && { mint: accountMintsBefore[account] })
			}
		);

/**
 * The account the message opens at an address next, from an instruction on: the mint and the
 * holder its initialisation or its associated account creation names, before anything closes an
 * account there.
 *
 * An address opened for one mint, closed and opened for another is two accounts, and reading the
 * mint from the run's single map lends the first the second's: its line names the wrong token, and
 * a wrapped SOL account's funding is read as though it had nothing to wrap.
 */
const openedNext = ({
	account,
	flattened,
	from
}: {
	account: SolAddress;
	flattened: { instruction: SolParsedRpcInstruction }[];
	from: number;
}): { mint?: SplTokenAddress; holder?: SolAddress } => {
	const next = flattened.slice(from).find(
		({
			instruction: {
				program,
				parsed: { type, info }
			}
		}) =>
			address({ info, key: 'account' }) === account &&
			((nonNullish(program) &&
				TOKEN_PROGRAMS.includes(program) &&
				['initializeAccount', 'initializeAccount2', 'initializeAccount3', 'closeAccount'].includes(
					type
				)) ||
				(program === 'spl-associated-token-account' &&
					['create', 'createIdempotent'].includes(type)))
	);

	if (isNullish(next) || next.instruction.parsed.type === 'closeAccount') {
		return {};
	}

	const {
		instruction: {
			program,
			parsed: { info }
		}
	} = next;

	const mint = address({ info, key: 'mint' });
	const holder = address({
		info,
		key: program === 'spl-associated-token-account' ? 'wallet' : 'owner'
	});

	return { ...(nonNullish(mint) && { mint }), ...(nonNullish(holder) && { holder }) };
};

/**
 * Whether the message opens an account at an address anywhere, which makes the run's single map of
 * mints unreliable for it: that map is written by the last initialisation, which may be of an
 * account opened after the one being read.
 */
const initialisedInMessage = ({
	account,
	flattened
}: {
	account: SolAddress;
	flattened: { instruction: SolParsedRpcInstruction }[];
}): boolean =>
	flattened.some(
		({
			instruction: {
				program,
				parsed: { type, info }
			}
		}) =>
			address({ info, key: 'account' }) === account &&
			((program === 'spl-associated-token-account' &&
				['create', 'createIdempotent'].includes(type)) ||
				(nonNullish(program) &&
					TOKEN_PROGRAMS.includes(program) &&
					['initializeAccount', 'initializeAccount2', 'initializeAccount3'].includes(type)))
	);

/**
 * What each close in the message hands back: every lamport its account holds by then, read in one
 * pass over the message.
 *
 * An account's lamports start from what it held going in and move with every instruction that
 * reaches it. The System `createAccount` that opens it states the rent, and a System `transfer`
 * into it adds to that: wrapping SOL is exactly such a transfer, so a wrapped account closed at the
 * end of a swap hands back the rent and the wrapped SOL together, a total no instruction states.
 * A token transfer of wrapped SOL moves lamports too, since for that mint the token balance is the
 * lamports, and a close hands everything its account holds to the account it names and leaves it
 * with nothing.
 *
 * Walked forward once, keeping each account's lamports as they stand. Read backwards from each
 * close through the closes that fed it, a message closing accounts into each other over and over
 * re-read the instructions before every close for every close it reached, which grows with the cube
 * of the message.
 *
 * Keyed by the position of the close. An account nobody read and nothing funded hands back an
 * amount nobody knows.
 */
const closePayouts = ({
	flattened,
	accountLamports,
	mintAt,
	wrappedAt
}: {
	flattened: { instruction: SolParsedRpcInstruction }[];
	// What each account held going in, so a chain can start from an account that already existed.
	accountLamports: Partial<Record<SolAddress, bigint>>;
	// Which mint an account holds as of an instruction. A wrapped SOL account's token balance is
	// its lamports, so a token transfer in or out of one moves lamports; of any other mint, none.
	mintAt: (params: { account: SolAddress; position: number }) => SplTokenAddress | undefined;
	// What a wrapped SOL account wraps as of an instruction, which is what an unwrap naming no
	// amount moves.
	wrappedAt: (params: {
		account: SolAddress;
		position: number;
		payoutAt: (position: number) => bigint | undefined;
	}) => bigint | undefined;
}): Map<number, bigint | undefined> => {
	// What each account holds as the walk stands. Absent means untouched so far, and an untouched
	// account holds what it held going in, which may be unknown.
	const lamports = new Map<SolAddress, bigint | undefined>();

	const held = (account: SolAddress): bigint | undefined =>
		lamports.has(account) ? lamports.get(account) : accountLamports[account];

	// Paying in adds to what an account holds. One nobody read and nothing has touched yet starts
	// from nothing, as an account the message opens does; one this walk has lost track of stays
	// unknown, rather than holding only what arrived since.
	const add = ({ account, value }: { account: SolAddress; value: bigint }) => {
		const balance = held(account);

		lamports.set(
			account,
			isNullish(balance) && lamports.has(account) ? undefined : (balance ?? ZERO) + value
		);
	};

	// Paying out of an amount nobody knows leaves one nobody knows.
	const take = ({ account, value }: { account: SolAddress; value: bigint }) => {
		const balance = held(account);

		lamports.set(account, isNullish(balance) ? undefined : maxBigInt(balance - value, ZERO));
	};

	const payouts = new Map<number, bigint | undefined>();

	flattened.forEach(
		(
			{
				instruction: {
					program,
					parsed: { type, info }
				}
			},
			position
		) => {
			if (type === 'closeAccount') {
				const account = address({ info, key: 'account' });
				const destination = address({ info, key: 'destination' });

				if (isNullish(account)) {
					return;
				}

				// Everything it holds goes, and an address closed and opened again is a second account
				// that starts from nothing.
				const payout = held(account);

				payouts.set(position, payout);
				lamports.set(account, ZERO);

				// What arrives at the destination is all of it, so an amount nobody knows leaves the
				// destination holding one nobody knows either.
				if (nonNullish(destination) && destination !== account) {
					if (nonNullish(payout)) {
						add({ account: destination, value: payout });
					} else {
						lamports.set(destination, undefined);
					}
				}

				return;
			}

			if (
				nonNullish(program) &&
				TOKEN_PROGRAMS.includes(program) &&
				['transfer', 'transferChecked'].includes(type)
			) {
				const moved =
					type === 'transferChecked'
						? tokenAmount({ info }).amount
						: amount({ info, key: 'amount' });
				const source = address({ info, key: 'source' });
				const destination = address({ info, key: 'destination' });

				// A transfer from an account to itself moves nothing.
				if (isNullish(moved) || source === destination) {
					return;
				}

				if (nonNullish(destination) && isNativeMint(mintAt({ account: destination, position }))) {
					add({ account: destination, value: moved });
				}

				if (nonNullish(source) && isNativeMint(mintAt({ account: source, position }))) {
					take({ account: source, value: moved });
				}

				return;
			}

			// Unwrapping moves lamports out of a wrapped SOL account and leaves it open. An amount left
			// unstated is everything it wraps as of this instruction, which this walk does not know
			// apart from its rent but the token balance walk does, as for the unwrap's own line. Only
			// when that is unknown too do both ends hold an amount nobody can state, rather than one
			// this walk made up.
			if (nonNullish(program) && TOKEN_PROGRAMS.includes(program) && type === 'unwrapLamports') {
				const source = address({ info, key: 'source' });
				const destination = address({ info, key: 'destination' });

				if (isNullish(source) || source === destination) {
					return;
				}

				const moved =
					amount({ info, key: 'amount' }) ??
					wrappedAt({ account: source, position, payoutAt: (at) => payouts.get(at) });

				if (isNullish(moved)) {
					lamports.set(source, undefined);

					if (nonNullish(destination)) {
						lamports.set(destination, undefined);
					}

					return;
				}

				take({ account: source, value: moved });

				if (nonNullish(destination)) {
					add({ account: destination, value: moved });
				}

				return;
			}

			// Withdrawing excess lamports names no amount, so both ends hold one nobody can state.
			if (
				nonNullish(program) &&
				TOKEN_PROGRAMS.includes(program) &&
				type === 'withdrawExcessLamports'
			) {
				const source = address({ info, key: 'source' });
				const destination = address({ info, key: 'destination' });

				if (isNullish(source) || source === destination) {
					return;
				}

				lamports.set(source, undefined);

				if (nonNullish(destination)) {
					lamports.set(destination, undefined);
				}

				return;
			}

			if (program !== 'system') {
				return;
			}

			const funded = isAccountCreation(type)
				? address({ info, key: 'newAccount' })
				: SYSTEM_TRANSFERS.includes(type)
					? address({ info, key: 'destination' })
					: undefined;

			const value = amount({ info, key: 'lamports' });

			if (nonNullish(funded) && nonNullish(value)) {
				add({ account: funded, value });
			}
		}
	);

	return payouts;
};

/**
 * The System creation that funds the account a line opens, which is the first from where the line
 * stands: an address closed and opened again within the message is two accounts, each funded by its
 * own.
 */
const creationOf = ({
	account,
	flattened,
	from
}: {
	account: SolAddress;
	flattened: { topLevel: boolean; instruction: SolParsedRpcInstruction }[];
	from: number;
}): { topLevel: boolean; instruction: SolParsedRpcInstruction } | undefined =>
	flattened.slice(from).find(
		({
			instruction: {
				program,
				parsed: { type, info }
			}
		}) =>
			program === 'system' &&
			isAccountCreation(type) &&
			address({ info, key: 'newAccount' }) === account
	);

/**
 * The rent an account creation costs, from the System `createAccount` that funds it.
 *
 * The reserve and no more, where that is known. A creation can fund a wrapped SOL account with the
 * amount to wrap along with its rent, and initialising it reads everything above the reserve as
 * the wrapped balance: the balance is read with that split, and the rent is the other half of it,
 * so the two add up to the funding rather than both counting the wrapped SOL. The reserve is known
 * for one size only, the fixed size of a Token program account, and an account of any other size
 * holds no wrapped SOL.
 *
 * Without the reserve, a wrapped SOL account the message opens itself has a rent nobody can state,
 * as it has a balance nobody can state, rather than one that includes whatever it was funded to
 * wrap. The associated token account program funds exactly the rent of what it opens, and an
 * account of any other mint has nothing to wrap, so those creations state it as they stand.
 */
const rentOf = ({
	creation: {
		topLevel,
		instruction: {
			parsed: { info }
		}
	},
	native,
	rentExemptMinimum
}: {
	creation: { topLevel: boolean; instruction: SolParsedRpcInstruction };
	native: boolean;
	rentExemptMinimum: bigint | undefined;
}): bigint | undefined => {
	const lamports = amount({ info, key: 'lamports' });

	if (isNullish(lamports)) {
		return undefined;
	}

	if (nonNullish(rentExemptMinimum) && amount({ info, key: 'space' }) === ATA_SIZE) {
		return lamports > rentExemptMinimum ? rentExemptMinimum : lamports;
	}

	return native && topLevel ? undefined : lamports;
};

/**
 * Wrapping is a System transfer into a wrapped SOL account the user owns. Nothing in the
 * instruction says so, which is why it is recognised by its destination rather than by its name.
 *
 * The destination's mint as of the transfer, the account it holds then: an address closed and
 * opened again for another mint within the message would otherwise read a transfer into either by
 * the last. Where nothing is open there yet, the account the message opens there next, which is
 * where SOL sent ahead of its opening ends up.
 */
const asWrap = ({
	effect,
	mintOf
}: {
	effect: Omit<Effect, 'parentIndex'>;
	mintOf: (account: SolAddress) => SplTokenAddress | undefined;
}): Omit<Effect, 'parentIndex'> =>
	effect.kind === 'send' &&
	isNullish(effect.tokenAddress) &&
	nonNullish(effect.counterparty) &&
	(effect.own ?? false) &&
	mintOf(effect.counterparty) === WSOL_TOKEN.address
		? {
				kind: 'wrap',
				...(nonNullish(effect.amount) && { amount: effect.amount }),
				account: effect.counterparty
			}
		: effect;

const strip = ({
	parentIndex: _parentIndex,
	batch: _batch,
	...view
}: Effect): SolInstructionSummary => view;

/**
 * The lines of each token batch, gathered under one that names the batch and the program it runs in.
 *
 * A batch is one instruction to the network, and every line under it is that instruction's doing:
 * listed flat, its lines would read as ones the message states one by one. They are consecutive,
 * since the program runs a batch's instructions one after the other and nothing in between.
 */
const groupBatches = (effects: Effect[]): Effect[] =>
	effects
		.reduce<Effect[][]>((runs, effect) => {
			const run = runs[runs.length - 1];

			const continues =
				nonNullish(run) && nonNullish(effect.batch) && run[0].batch?.id === effect.batch.id;

			return continues ? [...runs.slice(0, -1), [...run, effect]] : [...runs, [effect]];
		}, [])
		.flatMap((run) => {
			const [{ parentIndex, batch }] = run;

			return isNullish(batch)
				? run
				: [
						{
							kind: 'batch' as const,
							program: batch.program,
							children: run.map(strip),
							parentIndex
						}
					];
		});

/**
 * Every line of a top-level instruction the wallet could not read, gathered under it.
 *
 * Such an instruction is described only by the calls it made inside itself, so each line found
 * there is that instruction's doing. One line or several, they hang under a heading that names its
 * program: flat, a line made inside an application reads like one the message states itself, and
 * a four-leg swap like four unrelated transfers. An instruction the wallet read is its own line.
 */
const groupUnread = ({
	effects,
	programs,
	unread
}: {
	effects: Effect[];
	programs: Record<number, SolAddress>;
	unread: Set<number>;
}): SolInstructionSummary[] =>
	effects
		.reduce<Effect[][]>((runs, effect) => {
			const run = runs[runs.length - 1];

			// The line saying nobody read an instruction stands on its own, beside whatever the
			// instruction's calls made, so it reads as the instruction's rather than as one of them.
			const continues =
				nonNullish(run) &&
				unread.has(effect.parentIndex) &&
				run[0].parentIndex === effect.parentIndex &&
				effect.kind !== 'unknown';

			return continues ? [...runs.slice(0, -1), [...run, effect]] : [...runs, [effect]];
		}, [])
		.flatMap((run) => {
			const [first] = run;

			// An instruction with nothing under it is already the line that names its program.
			if (!unread.has(first.parentIndex) || first.kind === 'unknown') {
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
 * Whether a simulated run opens an account inside another program's instruction with more than its
 * size costs.
 *
 * The message's own openings are held to the rent when the message is mapped, which reads the top
 * level only. One a program makes inside its own call reaches the review through the run alone, and
 * the list leaves an over-funded one out rather than call it rent - which refuses the request only
 * while nothing else in that instruction has a line. Anything above the rent is a balance in an
 * account the program controls, a payment with no destination, wherever the account is opened.
 *
 * An account the System program owns counts whatever it is funded with: nothing governs its lamports
 * but the key it is opened at, so none of them is rent, as when the message opens one itself. For
 * any other owner the line is the chain's reserve, and without it the opening is not judged on this.
 */
export const solOpensAccountBeyondRent = ({
	innerInstructions,
	rentExemptMinimum
}: {
	innerInstructions: SolInstructionGroup[];
	rentExemptMinimum: bigint | undefined;
}): boolean =>
	innerInstructions.some(({ instructions }) =>
		instructions.some((instruction) => {
			if (!isParsed(instruction)) {
				return false;
			}

			const {
				program,
				parsed: { type, info }
			} = instruction;

			if (program !== 'system' || !['createAccount', 'createAccountWithSeed'].includes(type)) {
				return false;
			}

			const owner = address({ info, key: 'owner' });

			if (owner === SYSTEM_PROGRAM_ADDRESS) {
				return true;
			}

			const lamports = amount({ info, key: 'lamports' });
			const space = amount({ info, key: 'space' });

			return (
				nonNullish(owner) &&
				nonNullish(lamports) &&
				nonNullish(space) &&
				nonNullish(rentExemptMinimum) &&
				lamports > rentExemptMinimumFor({ space, rentExemptMinimum })
			);
		})
	);

/**
 * Whether a simulated run keeps a token batch whole: one whose contents cannot be read, or one of
 * several steps the run returns calls made inside, which nothing puts in order with its steps.
 *
 * The list states such a batch as an instruction nobody read and none of its steps, so whatever a
 * step pays the wallet goes unstated too, which the check on an application's close relies on. That
 * holds whatever the message's own mapping read of the steps, which cannot say where the calls ran
 * either.
 */
export const solKeepsBatchWhole = ({
	instructions,
	innerInstructions
}: {
	instructions: readonly unknown[];
	innerInstructions: readonly SolInstructionGroup[];
}): boolean =>
	flatten({ instructions, innerInstructions }).some(({ wholeBatch }) => wholeBatch ?? false);

/**
 * Whose an account is as of an instruction: the holder its current lifecycle began with, where that
 * is known, and the accounts named as the user's otherwise. Those are every account the user held
 * at any point of the message, so read alone they lend an address that was somebody else's before
 * it was opened for the user, or after the user's was closed, to the user.
 *
 * An address with no account open is neither: the message closed what was there, or opens the first
 * account there only later. Nothing of the user's can leave it, and what arrives lands in the
 * account opened there next, so it is whoever that one is opened for.
 */
const ownershipAt =
	({
		flattened,
		owned,
		accountHolders,
		accountMintsBefore
	}: {
		flattened: { instruction: SolParsedRpcInstruction }[];
		owned: Set<SolAddress>;
		accountHolders: Partial<Record<SolAddress, SolAddress>>;
		accountMintsBefore: Partial<Record<SolAddress, SplTokenAddress>>;
	}) =>
	({
		account,
		position,
		arriving = false
	}: {
		account: SolAddress;
		position: number;
		arriving?: boolean;
	}): boolean => {
		const { holder, closed } = openedAs({
			account,
			flattened,
			accountHolders,
			accountMintsBefore,
			until: position
		});

		if (nonNullish(holder)) {
			return owned.has(holder);
		}

		const { holder: next } = openedNext({ account, flattened, from: position });

		if ((closed ?? false) || nonNullish(next)) {
			return arriving && nonNullish(next) && owned.has(next);
		}

		return owned.has(account);
	};

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
	accountHolders = {},
	accountMintsBefore = {},
	accountLamports = {},
	accountTokenAmounts = {},
	accountUnsynced = {},
	rentExemptMinimum,
	closedAccounts = [],
	includeUnrecognised = false
}: {
	instructions: readonly unknown[];
	innerInstructions?: readonly SolInstructionGroup[];
	ownedAddresses: SolAddress[];
	// The wallet itself, which is the only account of the user's a close can pay into as a balance.
	userAddress: OptionSolAddress;
	addressToToken?: Record<SolAddress, SplTokenAddress>;
	// Who held each token account before the transaction ran. Absent for an account no run looked
	// at, which is not the same as one held by somebody else. The holder at any later instruction
	// is walked from here, never taken from the state after the transaction.
	accountHolders?: Partial<Record<SolAddress, SolAddress>>;
	// Which mint each token account held before the transaction ran, for the same reason: the mint
	// at any later instruction is walked from here, never taken from the state after it.
	accountMintsBefore?: Partial<Record<SolAddress, SplTokenAddress>>;
	// Lamports per account before the transaction ran, from its balance metadata. A close hands
	// the destination the whole balance, which no instruction states.
	accountLamports?: Partial<Record<SolAddress, bigint>>;
	// What each token account held before the transaction ran. A wrapped SOL account holding
	// nothing is closed rather than unwrapped, and the line says so.
	accountTokenAmounts?: Partial<Record<SolAddress, bigint>>;
	// What each wrapped SOL account held before the transaction ran beyond the reserve it states and
	// its amount, where a run read that reserve: lamports no sync has counted yet. An account absent
	// here is taken as synced, as a transaction already on chain has to be, its records stating no
	// reserve.
	accountUnsynced?: Partial<Record<SolAddress, bigint>>;
	// What a token account of the usual size costs to exist. Without it, an account this message
	// opens holds an amount nobody can state rather than nothing.
	rentExemptMinimum?: bigint;
	// The accounts an application's program held before the run and emptied in it, each known to have
	// paid every lamport it held into the wallet: a closed liquidity position handing back its rent.
	// The program moves the lamports itself, so no call in the run states the close, and each is
	// listed under the instruction established to have emptied it, or not at all.
	closedAccounts?: SolClosedAccount[];
	// Whether to keep a line for each top-level instruction that produced no effect of its own.
	// Off where the list stands beside the balance changes that vouch for it, on where it is the
	// only account of the transaction there is.
	includeUnrecognised?: boolean;
}): SolInstructionSummary[] => {
	const flattened = flatten({ instructions, innerInstructions });

	const accountMints = collectAccountMints({ flattened, addressToToken });

	const noOps = noOpCreations({ flattened, accountHolders, accountMintsBefore });

	const openedAt = ({ account, position }: { account: SolAddress; position: number }) =>
		openedAs({ account, flattened, accountHolders, accountMintsBefore, until: position });

	// The run's single map of mints is right for an address whose account never changes within the
	// message, and only there: for one the message opens, it holds the last account's mint.
	const mintAt = ({
		account,
		position
	}: {
		account: SolAddress;
		position: number;
	}): SplTokenAddress | undefined => {
		const { mint, closed } = openedAt({ account, position });

		// A closed address holds no account and so no mint, until something opens it again.
		return (
			mint ??
			((closed ?? false) || initialisedInMessage({ account, flattened })
				? undefined
				: accountMints[account])
		);
	};

	const payouts = closePayouts({
		flattened,
		accountLamports,
		mintAt,
		// The source of an unwrap holds wrapped SOL, or the program refuses it.
		wrappedAt: ({ account, position, payoutAt }) =>
			heldAtInstruction({
				account,
				native: true,
				flattened,
				accountTokenAmounts,
				accountUnsynced,
				rentExemptMinimum,
				payoutAt,
				until: position
			})
	});

	const ownedAt = ownershipAt({
		flattened,
		owned: expandOwnedAccounts({ flattened, ownedAddresses }),
		accountHolders,
		accountMintsBefore
	});

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
	const plumbing = new Set([
		...noOps.parents,
		...instructions.reduce<number[]>((acc, instruction, index) => {
			if (!isParsed(instruction)) {
				return acc;
			}

			const {
				parsed: { type }
			} = instruction;

			return PLUMBING_TYPES.includes(type) ? [...acc, index] : acc;
		}, [])
	]);

	const { effects, unstated } = flattened.reduce<{ effects: Effect[]; unstated: number[] }>(
		(acc, { parentIndex, topLevel, instruction, madeBy, batch }, position) => {
			const effect = toEffect({
				instruction,
				topLevel,
				position,
				noOp: noOps.positions.has(position),
				ownedAt,
				userAddress,
				accountMints,
				openedAt,
				mintAt,
				returnedAt: (at) => payouts.get(at),
				accountTokenAmounts,
				accountUnsynced,
				rentExemptMinimum,
				flattened
			});

			// A step of a batch the message states gets the reading it would get stated on its own,
			// where one that produces no line and is not plumbing is an instruction nobody read. The
			// lines of the batch's other steps cover its index, so it is recorded by that index here.
			if (isNullish(effect)) {
				return nonNullish(batch) && topLevel && !PLUMBING_TYPES.includes(instruction.parsed.type)
					? { ...acc, unstated: [...acc.unstated, parentIndex] }
					: acc;
			}

			const wrapped = asWrap({
				effect,
				mintOf: (account) =>
					mintAt({ account, position }) ?? openedNext({ account, flattened, from: position }).mint
			});

			const creation =
				wrapped.kind === 'createTokenAccount' && nonNullish(wrapped.account)
					? creationOf({ account: wrapped.account, flattened, from: position })
					: undefined;

			const rent = nonNullish(creation)
				? rentOf({
						creation,
						native: wrapped.tokenAddress === WSOL_TOKEN.address,
						rentExemptMinimum
					})
				: undefined;

			// Not always the user: a sender opening the recipient's account pays its rent, and so can
			// any other signer of the message.
			const payer = nonNullish(creation) ? funderOf(creation.instruction.parsed) : undefined;

			// The program that made a transfer, when it is not the one the line hangs under and not one
			// of the known programs: a program the review's notice about programs OISY cannot read
			// names. A known pool on every leg of every routed swap would only repeat itself.
			const via =
				['send', 'receive'].includes(wrapped.kind) &&
				nonNullish(madeBy) &&
				madeBy !== programs[parentIndex] &&
				!SOLANA_KNOWN_PROGRAM_ADDRESSES.includes(madeBy)
					? madeBy
					: undefined;

			return {
				...acc,
				effects: [
					...acc.effects,
					{
						...wrapped,
						...(nonNullish(rent) && { rent }),
						...(nonNullish(payer) && { payer }),
						...(nonNullish(via) && { via }),
						parentIndex,
						...(nonNullish(batch) && { batch })
					}
				]
			};
		},
		{ effects: [], unstated: [] }
	);

	// Each close hangs under the instruction that made it, after that instruction's other lines: the
	// account goes once the program is done with it. The sort is stable, so every other line keeps
	// its place.
	const closes = closedAccounts.reduce<Effect[]>(
		(acc, { account, program, lamports, instruction: parentIndex }) =>
			nonNullish(parentIndex)
				? [...acc, { kind: 'closeAccount', account, program, returned: lamports, parentIndex }]
				: acc,
		[]
	);

	const described = [...groupBatches(effects), ...closes].sort(
		({ parentIndex: first }, { parentIndex: second }) => first - second
	);

	// A top-level instruction none of the effects came from is one the wallet could not read: a
	// program it does not know, or a message whose instructions carry raw bytes rather than the
	// parsed form. Kept in the position it holds in the transaction, so the list reads in the
	// order the run would take rather than as the recognised instructions with the gaps closed up.
	const covered = new Set(described.map(({ parentIndex }) => parentIndex));

	// A batch left whole is an instruction nobody read, whatever else the instruction made: the
	// lines beside it cannot say what its steps did. So is a batch the message states with a step
	// nobody read, which its other steps' lines say nothing about either.
	const unreadBatches = new Set([
		...flattened
			.filter(({ wholeBatch }) => wholeBatch ?? false)
			.map(({ parentIndex }) => parentIndex),
		...unstated
	]);

	// A batch the message states with no step nobody read is read in full, as its steps would be if
	// the message stated them one by one, even when no line comes from it: one that carries nothing
	// but plumbing.
	const readBatches = new Set(
		flattened
			.filter(({ batch, topLevel }) => nonNullish(batch) && topLevel)
			.map(({ parentIndex }) => parentIndex)
			.filter((index) => !unreadBatches.has(index))
	);

	const listed = includeUnrecognised
		? [
				...described,
				...instructions.reduce<Effect[]>((acc, _, index) => {
					if (covered.has(index) && !unreadBatches.has(index)) {
						return acc;
					}

					const program = programs[index];

					// The review already states what these do, as the priority fee it charges for.
					// Listing them here as instructions nothing could read would be noise on every
					// transaction that sets a compute budget, and untrue besides.
					if (
						program === COMPUTE_BUDGET_PROGRAM_ADDRESS ||
						plumbing.has(index) ||
						readBatches.has(index)
					) {
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
		: described;

	const unread = new Set(
		instructions.reduce<number[]>(
			(acc, instruction, index) => (isParsed(instruction) ? acc : [...acc, index]),
			[]
		)
	);

	return groupUnread({ effects: listed, programs, unread });
};

// What a transfer moves where: from a System account, a seed-derived one or a nonce account, or from
// a token account on the signature of its authority. A Token-2022 mint that charges a fee on
// transfers holds it back in the destination, which is credited the rest.
const paymentOf = ({
	program,
	parsed: { type, info }
}: SolParsedRpcInstruction):
	| {
			source?: SolAddress;
			destination?: SolAddress;
			authority?: SolAddress;
			value?: bigint;
			credited?: bigint;
	  }
	| undefined => {
	if (program === 'system' && SYSTEM_TRANSFERS.includes(type)) {
		return {
			source: systemTransferSource(info),
			destination: address({ info, key: 'destination' }),
			value: amount({ info, key: 'lamports' })
		};
	}

	if (
		nonNullish(program) &&
		TOKEN_PROGRAMS.includes(program) &&
		['transfer', 'transferChecked', 'transferCheckedWithFee'].includes(type)
	) {
		const value = tokenAmount({ info }).amount ?? amount({ info, key: 'amount' });
		const fee = tokenAmount({ info, key: 'feeAmount' }).amount;

		return {
			source: address({ info, key: 'source' }),
			destination: address({ info, key: 'destination' }),
			authority: address({ info, key: 'authority' }) ?? address({ info, key: 'multisigAuthority' }),
			value,
			...(nonNullish(value) && nonNullish(fee) && { credited: value - fee })
		};
	}
};

interface WaitingPayout {
	program: SolAddress;
	account: SolAddress;
	parentIndex: number;
	position: number;
	left: bigint;
}

// A transfer out of an account passes its amount on to the payouts into that account within the same
// instruction that are still waiting, oldest first.
const passOn = ({
	waiting,
	account,
	parentIndex,
	value
}: {
	waiting: WaitingPayout[];
	account: SolAddress | undefined;
	parentIndex: number;
	value: bigint | undefined;
}): WaitingPayout[] =>
	isNullish(account) || isNullish(value)
		? waiting
		: waiting.reduce<{ rest: bigint; waiting: WaitingPayout[] }>(
				({ rest, waiting: acc }, payout) => {
					if (payout.account !== account || payout.parentIndex !== parentIndex) {
						return { rest, waiting: [...acc, payout] };
					}

					const taken = payout.left < rest ? payout.left : rest;

					return {
						rest: rest - taken,
						waiting: [...acc, { ...payout, left: payout.left - taken }]
					};
				},
				{ rest: value, waiting: [] }
			).waiting;

/**
 * The programs that, called with the wallet among their accounts, pay out of an account that is not
 * the user's into another one that is not theirs either, each named once, in the order they do it.
 * Routers are left out: what passes through their own accounts is a swap on its way, or a fee.
 *
 * Such a payout has no line and no balance change, while any other line of the same instruction
 * accounts for all of it: a pool holding the user's liquidity in a position, called with the wallet
 * the position answers to, can pay it out to somebody else beside a line of nothing paid to the
 * user. A payout the receiving account passes on in full, later in the same instruction, is a hop
 * of a swap, a router's account carrying the trade to its next pool, and is not counted: only a
 * program running in that instruction moves anything out of that account, and a program the dApp
 * brings itself is named on its own. A transfer out passes its amount on once, to the payouts into
 * the account oldest first, so a split route paying one account from two pools is still a hop.
 */
export const findSolProgramsPayingOthers = ({
	instructions,
	innerInstructions = [],
	ownedAddresses,
	userAddress,
	accountHolders = {},
	accountMintsBefore = {}
}: {
	instructions: readonly unknown[];
	innerInstructions?: readonly SolInstructionGroup[];
	ownedAddresses: SolAddress[];
	userAddress: OptionSolAddress;
	accountHolders?: Partial<Record<SolAddress, SolAddress>>;
	accountMintsBefore?: Partial<Record<SolAddress, SplTokenAddress>>;
}): SolAddress[] => {
	if (isNullish(userAddress)) {
		return [];
	}

	const flattened = flatten({ instructions, innerInstructions });

	const ownedAt = ownershipAt({
		flattened,
		owned: expandOwnedAccounts({ flattened, ownedAddresses }),
		accountHolders,
		accountMintsBefore
	});

	const { named, waiting } = flattened.reduce<{
		named: { program: SolAddress; position: number }[];
		waiting: WaitingPayout[];
	}>(
		(acc, { parentIndex, topLevel, instruction, madeBy, madeWith = [] }, position) => {
			const payment = paymentOf(instruction);

			if (isNullish(payment)) {
				return acc;
			}

			const { source, destination, authority, value, credited = value } = payment;

			const waiting = passOn({ waiting: acc.waiting, account: source, parentIndex, value });

			if (
				topLevel ||
				isNullish(madeBy) ||
				SOLANA_ROUTER_PROGRAM_ADDRESSES.includes(madeBy) ||
				!madeWith.includes(userAddress)
			) {
				return { ...acc, waiting };
			}

			const fromUser = [authority, source].some(
				(account) => nonNullish(account) && ownedAt({ account, position })
			);
			const toUser =
				nonNullish(destination) && ownedAt({ account: destination, position, arriving: true });

			if (fromUser || toUser || value === ZERO) {
				return { ...acc, waiting };
			}

			// A payout whose account or amount is unknown cannot be followed on.
			if (isNullish(destination) || isNullish(credited)) {
				return { named: [...acc.named, { program: madeBy, position }], waiting };
			}

			return {
				...acc,
				waiting: [
					...waiting,
					{ program: madeBy, account: destination, parentIndex, position, left: credited }
				]
			};
		},
		{ named: [], waiting: [] }
	);

	const paying = [...named, ...waiting.filter(({ left }) => left > ZERO)]
		.sort(({ position: first }, { position: second }) => first - second)
		.map(({ program }) => program);

	return [...new Set(paying)];
};
