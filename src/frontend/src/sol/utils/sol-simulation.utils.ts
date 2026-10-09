import { ZERO } from '$lib/constants/app.constants';
import { SOLANA_KNOWN_PROGRAM_ADDRESSES } from '$sol/constants/sol-known-programs.constants';
import {
	SYSTEM_PROGRAM_ADDRESS,
	TOKEN_2022_PROGRAM_ADDRESS,
	TOKEN_PROGRAM_ADDRESS
} from '$sol/constants/sol.constants';
import type { SolAddress } from '$sol/types/address';
import type { SolanaParsedAccountInfo, SolanaSimulatedInnerInstructions } from '$sol/types/sol-rpc';
import type {
	SolClosedAccount,
	SolSimulationControlChange,
	SolSimulationPreview,
	SolSimulationTokenDelta
} from '$sol/types/sol-simulation';
import type { CompilableTransactionMessage } from '$sol/types/sol-transaction-message';
import type { SplTokenAddress } from '$sol/types/spl';
import { isNullish, nonNullish } from '@dfinity/utils';
import { isWritableRole } from '@solana/kit';

interface SolTokenAccountState {
	tokenAddress: SplTokenAddress;
	owner: SolAddress;
	delegate?: SolAddress;
	closeAuthority?: SolAddress;
	amount: bigint;
	decimals: number;
}

interface SolAccountState {
	// The program the account is assigned to. Reassigning it hands the account to different code.
	program: SolAddress;
	lamports: bigint;
	token?: SolTokenAccountState;
}

/**
 * The accounts whose post-state is worth asking the network for.
 *
 * Read-only accounts are identical before and after by construction, so only writable ones can
 * carry a change. That alone discards most of a DeFi message's account set. Lookup tables have
 * already been resolved at this point — the message comes from
 * `parseSolBase64TransactionMessage`, which decompiles fetching them — so versioned messages
 * expose their full account list here just like legacy ones.
 */
export const selectSolSimulationAddresses = ({
	feePayer: { address: feePayer },
	instructions
}: CompilableTransactionMessage): SolAddress[] => {
	const writable = Array.from(instructions).flatMap(({ accounts }) =>
		Array.from(accounts ?? [])
			.filter(({ role }) => isWritableRole(role))
			.map(({ address }) => address)
	);

	// A message can name the same writable account in several instructions.
	return [feePayer, ...writable].filter(
		(address, index, addresses) => addresses.indexOf(address) === index
	);
};

export const parseTokenAccountState = (
	account: NonNullable<SolanaParsedAccountInfo>
): SolTokenAccountState | undefined => {
	const { data } = account;

	if (!('parsed' in data) || data.parsed.type !== 'account') {
		return undefined;
	}

	const { mint, owner, delegate, closeAuthority, tokenAmount } = (data.parsed.info ??
		{}) as Partial<{
		mint: SplTokenAddress;
		owner: SolAddress;
		delegate: SolAddress;
		closeAuthority: SolAddress;
		tokenAmount: { amount: string; decimals: number };
	}>;

	if (isNullish(mint) || isNullish(owner) || isNullish(tokenAmount)) {
		return undefined;
	}

	return {
		tokenAddress: mint,
		owner,
		...(nonNullish(delegate) && { delegate }),
		...(nonNullish(closeAuthority) && { closeAuthority }),
		amount: BigInt(tokenAmount.amount),
		decimals: tokenAmount.decimals
	};
};

const parseAccountState = (account: SolanaParsedAccountInfo): SolAccountState | undefined => {
	if (isNullish(account)) {
		return undefined;
	}

	const token = parseTokenAccountState(account);

	return {
		program: account.owner,
		lamports: BigInt(account.lamports),
		...(nonNullish(token) && { token })
	};
};

/**
 * Whether an account is the user's own.
 *
 * The "after" arm is not redundant: an associated token account the message creates has no
 * pre-state at all, and dropping it would hide the balance it ends up holding.
 */
const isOwnAccount = ({
	address,
	userAddress,
	pre,
	post
}: {
	address: SolAddress;
	userAddress: SolAddress;
	pre?: SolAccountState;
	post?: SolAccountState;
}): boolean =>
	address === userAddress ||
	pre?.token?.owner === userAddress ||
	post?.token?.owner === userAddress;

/**
 * Who owns each account the simulation already read, and which of those accounts are the user's own.
 *
 * Costs no extra round trip: both sides of the diff are `jsonParsed`, so every token account they
 * cover already carries its owner and its mint. That is what lets the transfer lists match on
 * token accounts, which is what SPL transfers actually name. A rule matched against the wallet
 * address alone would put every token transfer in neither list.
 *
 * The mint travels along for the same reason it is free: recovering it later would cost a lookup
 * per unchecked transfer, on the review's critical path.
 */
export const mapSolSimulationAccountOwners = ({
	addresses,
	preAccounts,
	postAccounts,
	userAddress
}: {
	addresses: SolAddress[];
	preAccounts: readonly SolanaParsedAccountInfo[];
	postAccounts: readonly SolanaParsedAccountInfo[];
	userAddress: SolAddress;
}): {
	ownedAddresses: SolAddress[];
	addressToOwner: Record<SolAddress, SolAddress>;
	addressToToken: Record<SolAddress, SplTokenAddress>;
} =>
	addresses.reduce<{
		ownedAddresses: SolAddress[];
		addressToOwner: Record<SolAddress, SolAddress>;
		addressToToken: Record<SolAddress, SplTokenAddress>;
	}>(
		({ ownedAddresses, addressToOwner, addressToToken }, address, index) => {
			const pre = parseAccountState(preAccounts[index]);
			const post = parseAccountState(postAccounts[index]);

			// An account this message creates has no pre-state, and one it closes has no post-state.
			const token = post?.token ?? pre?.token;

			return {
				ownedAddresses: isOwnAccount({ address, userAddress, pre, post })
					? [...ownedAddresses, address]
					: ownedAddresses,
				addressToOwner: nonNullish(token)
					? { ...addressToOwner, [address]: token.owner }
					: addressToOwner,
				addressToToken: nonNullish(token)
					? { ...addressToToken, [address]: token.tokenAddress }
					: addressToToken
			};
		},
		{ ownedAddresses: [], addressToOwner: {}, addressToToken: {} }
	);

const controlChanges = ({
	account,
	pre,
	post
}: {
	account: SolAddress;
	pre?: SolAccountState;
	post?: SolAccountState;
}): SolSimulationControlChange[] => {
	// An account that did not exist beforehand cannot have been taken over; it was created by
	// this very message, and whatever it ends up holding is reported as a balance instead.
	if (isNullish(pre) || isNullish(post)) {
		return [];
	}

	const changed: [
		SolSimulationControlChange['field'],
		SolAddress | undefined,
		SolAddress | undefined
	][] = [
		['program', pre.program, post.program],
		['owner', pre.token?.owner, post.token?.owner],
		['delegate', pre.token?.delegate, post.token?.delegate],
		['closeAuthority', pre.token?.closeAuthority, post.token?.closeAuthority]
	];

	return changed.reduce<SolSimulationControlChange[]>(
		(acc, [field, from, to]) => [
			...acc,
			...(from !== to ? [{ account, field, ...(nonNullish(to) && { to }) }] : [])
		],
		[]
	);
};

/**
 * Diffs the state of the user's own accounts before and after a simulated run.
 *
 * Amounts and control fields are diffed side by side on purpose. A `SetAuthority` that hands an
 * associated token account to someone else moves not one token: the balance is untouched and only
 * the owner field changes. Reading amounts alone would describe that as nothing happening.
 */
export const mapSolSimulationPreview = ({
	addresses,
	preAccounts,
	postAccounts,
	userAddress
}: {
	addresses: SolAddress[];
	preAccounts: readonly SolanaParsedAccountInfo[];
	postAccounts: readonly SolanaParsedAccountInfo[];
	userAddress: SolAddress;
}): SolSimulationPreview => {
	const { solDelta, tokenDeltas, changes } = addresses.reduce<{
		solDelta: bigint | undefined;
		tokenDeltas: SolSimulationTokenDelta[];
		changes: SolSimulationControlChange[];
	}>(
		(acc, address, index) => {
			const pre = parseAccountState(preAccounts[index]);
			const post = parseAccountState(postAccounts[index]);

			if (!isOwnAccount({ address, userAddress, pre, post })) {
				return acc;
			}

			const tokenDelta = (post?.token?.amount ?? ZERO) - (pre?.token?.amount ?? ZERO);
			const token = post?.token ?? pre?.token;

			return {
				solDelta:
					address === userAddress
						? (post?.lamports ?? ZERO) - (pre?.lamports ?? ZERO)
						: acc.solDelta,
				tokenDeltas: [
					...acc.tokenDeltas,
					...(nonNullish(token) && tokenDelta !== ZERO
						? [
								{
									account: address,
									tokenAddress: token.tokenAddress,
									decimals: token.decimals,
									delta: tokenDelta
								}
							]
						: [])
				],
				changes: [...acc.changes, ...controlChanges({ account: address, pre, post })]
			};
		},
		{ solDelta: undefined, tokenDeltas: [], changes: [] }
	);

	return {
		...(nonNullish(solDelta) && solDelta !== ZERO && { solDelta }),
		tokenDeltas,
		controlChanges: changes
	};
};

export const isEmptySolSimulationPreview = ({
	solDelta,
	tokenDeltas,
	controlChanges
}: SolSimulationPreview): boolean =>
	isNullish(solDelta) && tokenDeltas.length === 0 && controlChanges.length === 0;

/**
 * The programs a simulated run calls from inside another program's instruction that are not among
 * the known ones, each named once, in the order the run first reaches them.
 *
 * Only the nested calls. The message's own instructions are the review's to list, and one it
 * cannot read is already listed as such; a nested call exists only in the run.
 *
 * Nothing at all when a nested call does not name its program. The RPC names it for every call a
 * simulation reports, parsed or not, but the type also admits one that only points into the
 * account list, and an empty list for a run containing it would say it calls only known programs.
 */
export const findSolUnreadPrograms = (
	innerInstructions: SolanaSimulatedInnerInstructions
): SolAddress[] | undefined => {
	const calls = [...innerInstructions].flatMap(({ instructions }) => [...instructions]);

	const programs = calls
		.map((instruction) => ('programId' in instruction ? instruction.programId : undefined))
		.filter(nonNullish);

	if (programs.length < calls.length) {
		return undefined;
	}

	const known = new Set<SolAddress>(SOLANA_KNOWN_PROGRAM_ADDRESSES);

	return [...new Set(programs)].filter((program) => !known.has(program));
};

// The programs whose accounts a run's lines already account for: what leaves a wallet does so by a
// transfer the run states, and a token account is closed by an instruction that names where its
// balance goes.
const NON_APPLICATION_PROGRAMS: SolAddress[] = [
	SYSTEM_PROGRAM_ADDRESS,
	TOKEN_PROGRAM_ADDRESS,
	TOKEN_2022_PROGRAM_ADDRESS
];

/**
 * The accounts an application's program held before a run and emptied in it.
 *
 * A program closing an account of its own moves the lamports itself, and no call in the run states
 * it: only the account's state before and after says it happened. The System program and the token
 * programs are left out. What leaves a wallet does so by a transfer the run states, and a token
 * account is closed by an instruction that names where its balance goes.
 *
 * Emptied means no lamports after the run, or no account at all. An account the run did not report
 * on says nothing, and is not counted as closed.
 */
export const findSolClosedAppAccounts = ({
	addresses,
	preAccounts,
	postAccounts
}: {
	addresses: SolAddress[];
	preAccounts: readonly SolanaParsedAccountInfo[];
	postAccounts: readonly SolanaParsedAccountInfo[];
}): SolClosedAccount[] =>
	addresses.reduce<SolClosedAccount[]>((acc, account, index) => {
		const pre = parseAccountState(preAccounts[index]);
		const post = postAccounts[index];

		if (isNullish(pre) || NON_APPLICATION_PROGRAMS.includes(pre.program) || pre.lamports === ZERO) {
			return acc;
		}

		const emptied = post === null || (nonNullish(post) && BigInt(post.lamports) === ZERO);

		return emptied ? [...acc, { account, program: pre.program, lamports: pre.lamports }] : acc;
	}, []);

/**
 * Whether an application's account that stays open lost lamports in a run.
 *
 * Its program can pay the wallet straight from it, which no line states, and that inflow could stand
 * in for a close paid somewhere else. Only writable accounts can change, and the run reports every
 * one of them: with none of these, the closed accounts are the only source left for what reaches the
 * wallet unstated.
 */
export const solOpenAppAccountsLostLamports = ({
	addresses,
	preAccounts,
	postAccounts
}: {
	addresses: SolAddress[];
	preAccounts: readonly SolanaParsedAccountInfo[];
	postAccounts: readonly SolanaParsedAccountInfo[];
}): boolean =>
	addresses.some((_, index) => {
		const pre = parseAccountState(preAccounts[index]);
		const post = parseAccountState(postAccounts[index]);

		return (
			nonNullish(pre) &&
			nonNullish(post) &&
			!NON_APPLICATION_PROGRAMS.includes(pre.program) &&
			post.lamports > ZERO &&
			post.lamports < pre.lamports
		);
	});

/**
 * Whether every lamport the closed accounts held reached the wallet.
 *
 * Nothing states where a program sends what it closes, so the wallet's own change is the witness:
 * once the lines that state what moved the wallet's SOL and the fee are taken out, what is left
 * must be exactly what the closed accounts held. Anything else - a part paid elsewhere, a movement
 * no line accounts for - and none of them is said to have come home.
 */
export const solClosedAccountsReachWallet = ({
	closedAccounts,
	walletChange,
	statedChange,
	fee
}: {
	closedAccounts: SolClosedAccount[];
	// The wallet's lamports after the run, less those before it.
	walletChange: bigint | undefined;
	// What the lines say the transaction does to the wallet's SOL.
	statedChange: bigint | undefined;
	// What the run charged the wallet as the transaction's fee.
	fee: bigint;
}): boolean =>
	closedAccounts.length > 0 &&
	nonNullish(walletChange) &&
	nonNullish(statedChange) &&
	walletChange ===
		statedChange - fee + closedAccounts.reduce((acc, { lamports }) => acc + lamports, ZERO);
