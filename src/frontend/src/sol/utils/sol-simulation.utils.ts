import { ZERO } from '$lib/constants/app.constants';
import type { SolAddress } from '$sol/types/address';
import type { SolanaParsedAccountInfo } from '$sol/types/sol-rpc';
import type {
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

const parseTokenAccountState = (
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
