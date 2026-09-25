import { WSOL_TOKEN } from '$env/tokens/tokens-spl/tokens.wsol.env';
import { ZERO } from '$lib/constants/app.constants';
import { maxBigInt } from '$lib/utils/bigint.utils';
import { ATA_SIZE } from '$sol/constants/ata.constants';
import {
	COMPUTE_BUDGET_PROGRAM_ADDRESS,
	TOKEN_PROGRAM_ADDRESS
} from '$sol/constants/sol.constants';
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
 * Whether an idempotent account creation found the account already there and did nothing.
 *
 * The run reads every account an instruction writes, and the account a creation names is written,
 * so a pre-state is what says it already existed. Without a run there are no pre-states and
 * nothing is read as a no-op, which is right: the creation is then unrefuted.
 */
const noOpCreations = ({
	flattened,
	accountLamports
}: {
	flattened: { parentIndex: number; topLevel: boolean; instruction: SolParsedRpcInstruction }[];
	accountLamports: Partial<Record<SolAddress, bigint>>;
}): { positions: Set<number>; parents: Set<number> } => {
	// Above zero, not merely present. A confirmed transaction's balances carry an entry for every
	// account it names, an account it creates among them, at nothing: seeding from the keys alone
	// read those as already there and dropped the creation that made them.
	const inPlace = new Set<SolAddress>(
		Object.entries(accountLamports)
			.filter(([, lamports]) => nonNullish(lamports) && lamports > ZERO)
			.map(([account]) => account)
	);

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
		programId,
		parsed: { type, info }
	},
	topLevel,
	position,
	noOp,
	owned,
	userAddress,
	accountMints,
	openedAt,
	mintAt,
	accountLamports,
	accountTokenAmounts,
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
	owned: Set<SolAddress>;
	// The wallet itself, which is the only account of the user's that a close can pay into as a
	// balance. Separate from the set above, which is every account of theirs the run named.
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
	// What each account held going in, so a close can say what it hands back.
	accountLamports: Partial<Record<SolAddress, bigint>>;
	// What each token account held going in, so a close of an empty wrapped SOL account is not
	// described as unwrapping something.
	accountTokenAmounts: Partial<Record<SolAddress, bigint>>;
	// What a token account of the usual size costs to exist, read from the chain.
	rentExemptMinimum: bigint | undefined;
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
				: nonNullish(account) && owned.has(account)
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
				(nonNullish(owner) && owned.has(owner) && ownAccount !== false) ||
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
			const returned = fundedInTransaction({
				account,
				flattened,
				accountLamports,
				mintAt,
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
			// What it held when it closed, not before the transaction ran: the swaps that open one
			// wrap into it and unwrap out of it within the same message, and one that pre-dates the
			// message can be emptied before its close just the same.
			const wrapped = heldAtInstruction({
				account,
				native: mint === WSOL_TOKEN.address,
				flattened,
				accountTokenAmounts,
				rentExemptMinimum,
				until: position
			});

			return {
				kind: mint === WSOL_TOKEN.address ? 'unwrap' : 'closeTokenAccount',
				account,
				...(nonNullish(mint) && { tokenAddress: mint }),
				...(nonNullish(returned) && { returned }),
				...(nonNullish(wrapped) && { wrapped }),
				...(nonNullish(reserve) && { reserve }),
				...(ownAccount === false && { ownAccount }),
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
 * What a token account holds by the time an instruction reaches it.
 *
 * The same walk the lamports take, over the token balance: from what it held before the
 * transaction, or from nothing when this message opened it, plus every transfer in and out since.
 * Reading the state from before the transaction instead says a wrapped SOL account emptied on the
 * way still holds what it started with, and calls its close an unwrap of something already gone.
 *
 * Undefined when there is nothing to start from: an account that pre-dates the message and whose
 * state no run read is one whose balance nobody knows.
 */
const heldAtInstruction = ({
	account,
	native,
	flattened,
	accountTokenAmounts,
	rentExemptMinimum,
	until
}: {
	account: SolAddress;
	// Whether the account holds wrapped SOL, whose balance is its lamports: a System transfer into
	// one is the wrapping, and raises the token balance with them. Of any other mint it does not.
	native: boolean;
	flattened: { instruction: SolParsedRpcInstruction }[];
	accountTokenAmounts: Partial<Record<SolAddress, bigint>>;
	// What the chain charges a token account of the usual size to exist. A creation may fund one
	// with more than that and let its initialisation read the difference as the balance, so the
	// two cannot be told apart without knowing where the line falls.
	rentExemptMinimum: bigint | undefined;
	until: number;
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
		) => {
			// A close of this account ends it, and an address closed and opened again within the one
			// message is two accounts. Until something opens it again there is no balance to state.
			if (
				nonNullish(program) &&
				TOKEN_PROGRAMS.includes(program) &&
				type === 'closeAccount' &&
				address({ info, key: 'account' }) === account
			) {
				return undefined;
			}

			// Opening it starts it from whatever its creation funded above the reserve - nothing, for
			// any mint but wrapped SOL. Nothing states that split for wrapped SOL: the creation gives
			// one figure and the close gives the same one back, so without the reserve the balance is
			// unknown rather than nothing.
			if (
				program === 'system' &&
				type === 'createAccount' &&
				address({ info, key: 'newAccount' }) === account
			) {
				if (!native) {
					return ZERO;
				}

				const lamports = amount({ info, key: 'lamports' });

				return nonNullish(lamports) &&
					nonNullish(rentExemptMinimum) &&
					amount({ info, key: 'space' }) === ATA_SIZE
					? maxBigInt(lamports - rentExemptMinimum, ZERO)
					: undefined;
			}

			// An amount nobody knows stays unknown whatever moves after it.
			if (isNullish(acc)) {
				return acc;
			}

			// Wrapping: a System transfer into a wrapped SOL account raises its token balance with
			// its lamports, because there the two are the same thing.
			if (native && program === 'system' && type === 'transfer') {
				const wrapping = amount({ info, key: 'lamports' });

				return nonNullish(wrapping) && address({ info, key: 'destination' }) === account
					? acc + wrapping
					: acc;
			}

			if (
				isNullish(program) ||
				!TOKEN_PROGRAMS.includes(program) ||
				!['transfer', 'transferChecked'].includes(type)
			) {
				return acc;
			}

			const moved =
				type === 'transferChecked' ? tokenAmount(info).amount : amount({ info, key: 'amount' });

			if (isNullish(moved)) {
				return acc;
			}

			const into = address({ info, key: 'destination' }) === account;
			const outOf = address({ info, key: 'source' }) === account;

			// Moving nothing for the account unless exactly one end is it: a transfer from it to itself
			// leaves the balance where it was, and reading the destination alone counts it in.
			if (into === outOf) {
				return acc;
			}

			return into ? acc + moved : maxBigInt(acc - moved, ZERO);
		},
		accountTokenAmounts[account]
	);

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
}): { holder?: SolAddress; mint?: SplTokenAddress } =>
	flattened.slice(0, until).reduce<{ holder?: SolAddress; mint?: SplTokenAddress }>(
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

			return type === 'closeAccount' ? {} : acc;
		},
		{
			...(nonNullish(accountHolders[account]) && { holder: accountHolders[account] }),
			...(nonNullish(accountMintsBefore[account]) && { mint: accountMintsBefore[account] })
		}
	);

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
 * What an account holds in lamports by the time an instruction reaches it, starting from what it
 * held going in.
 *
 * The System `createAccount` that opens it states the rent, and any System `transfer` into it adds
 * to that: wrapping SOL is exactly such a transfer, so a wrapped account closed at the end of a
 * swap hands back the rent and the wrapped SOL together. No instruction states that total.
 */
const fundedInTransaction = ({
	account,
	flattened,
	accountLamports = {},
	mintAt,
	until
}: {
	account: SolAddress;
	flattened: { instruction: SolParsedRpcInstruction }[];
	// What each account held going in, so a chain can start from an account that already existed.
	accountLamports?: Partial<Record<SolAddress, bigint>>;
	// Which mint an account holds as of an instruction. A wrapped SOL account's token balance is
	// its lamports, so a token transfer in or out of one moves lamports; of any other mint, none.
	mintAt: (params: { account: SolAddress; position: number }) => SplTokenAddress | undefined;
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
			// A close of this account empties it and ends it. Whatever it held before belongs to an
			// account that no longer exists, and an address closed and opened again within the one
			// message is two accounts, the second of which starts from nothing.
			if (type === 'closeAccount' && address({ info, key: 'account' }) === account) {
				return ZERO;
			}

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
							mintAt,
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
				mintAt({ account, position: index }) === WSOL_TOKEN.address
			) {
				const moved =
					type === 'transferChecked' ? tokenAmount(info).amount : amount({ info, key: 'amount' });

				if (isNullish(moved)) {
					return acc;
				}

				const into = address({ info, key: 'destination' }) === account;
				const outOf = address({ info, key: 'source' }) === account;

				// The same as for the token balance: a transfer from the account to itself moves no
				// lamports.
				if (into === outOf) {
					return acc;
				}

				return into ? (acc ?? ZERO) + moved : maxBigInt((acc ?? ZERO) - moved, ZERO);
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
 *
 * The creation of the account the line opens, which is the first from where the line stands: an
 * address closed and opened again within the message is two accounts, each funded by its own.
 */
const rentOf = ({
	account,
	flattened,
	from,
	native,
	rentExemptMinimum
}: {
	account: SolAddress;
	flattened: { topLevel: boolean; instruction: SolParsedRpcInstruction }[];
	from: number;
	native: boolean;
	rentExemptMinimum: bigint | undefined;
}): bigint | undefined => {
	const creation = flattened.slice(from).find(
		({
			instruction: {
				program,
				parsed: { type, info }
			}
		}) =>
			program === 'system' &&
			type === 'createAccount' &&
			address({ info, key: 'newAccount' }) === account
	);

	if (isNullish(creation)) {
		return undefined;
	}

	const {
		topLevel,
		instruction: {
			parsed: { info }
		}
	} = creation;

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
	accountHolders = {},
	accountMintsBefore = {},
	accountLamports = {},
	accountTokenAmounts = {},
	rentExemptMinimum,
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
	// What a token account of the usual size costs to exist. Without it, an account this message
	// opens holds an amount nobody can state rather than nothing.
	rentExemptMinimum?: bigint;
	// Whether to keep a line for each top-level instruction that produced no effect of its own.
	// Off where the list stands beside the balance changes that vouch for it, on where it is the
	// only account of the transaction there is.
	includeUnrecognised?: boolean;
}): SolInstructionSummary[] => {
	const flattened = flatten({ instructions, innerInstructions });

	const accountMints = collectAccountMints({ flattened, addressToToken });

	const noOps = noOpCreations({ flattened, accountLamports });

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
	}): SplTokenAddress | undefined =>
		openedAt({ account, position }).mint ??
		(initialisedInMessage({ account, flattened }) ? undefined : accountMints[account]);

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

	const effects = flattened.reduce<Effect[]>(
		(acc, { parentIndex, topLevel, instruction }, position) => {
			const effect = toEffect({
				instruction,
				topLevel,
				position,
				noOp: noOps.positions.has(position),
				owned,
				userAddress,
				accountMints,
				openedAt,
				mintAt,
				accountLamports,
				accountTokenAmounts,
				rentExemptMinimum,
				flattened
			});

			if (isNullish(effect)) {
				return acc;
			}

			const wrapped = asWrap({ effect, accountMints });

			const rent =
				wrapped.kind === 'createTokenAccount' && nonNullish(wrapped.account)
					? rentOf({
							account: wrapped.account,
							flattened,
							from: position,
							native: wrapped.tokenAddress === WSOL_TOKEN.address,
							rentExemptMinimum
						})
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
