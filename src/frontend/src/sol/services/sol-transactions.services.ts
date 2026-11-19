import { ZERO } from '$lib/constants/app.constants';
import { absBigInt } from '$lib/utils/bigint.utils';
import { fetchTransactionDetailForSignature, getAccountOwner } from '$sol/api/solana.api';
import { loadSplTokenMetadata } from '$sol/services/spl-token-metadata.services';
import type { SolAddress } from '$sol/types/address';
import type { SolanaNetworkType } from '$sol/types/network';
import {
	SolTransactionReadError,
	type ParsedAccount,
	type SolRpcTransaction,
	type SolSignature,
	type SolTransactionUi
} from '$sol/types/sol-transaction';
import type { SplTokenAddress } from '$sol/types/spl';
import { mapSolInstructionSummaries } from '$sol/utils/sol-instruction-summary.utils';
import { mapSolNetBalanceChanges } from '$sol/utils/sol-net-changes.utils';
import { deriveSolTransactionSummary } from '$sol/utils/sol-transaction-summary.utils';
import { isNullish, nonNullish } from '@dfinity/utils';

// The fee payer is always the first signer
// https://solana.com/docs/core/fees#base-transaction-fee
export const extractFeePayer = (accountKeys: ParsedAccount[]): ParsedAccount | undefined =>
	accountKeys.length > 0 ? accountKeys.filter(({ signer }) => signer)[0] : undefined;

interface SolTokenAccountMetadata {
	addressToOwner: Record<SolAddress, SolAddress>;
	addressToToken: Record<SolAddress, SplTokenAddress>;
}

type SolTokenBalance = NonNullable<
	NonNullable<SolRpcTransaction['meta']>['preTokenBalances']
>[number];

const emptySolTokenAccountMetadata: SolTokenAccountMetadata = {
	addressToOwner: {},
	addressToToken: {}
};

const extractTokenBalanceMetadata = ({
	accountKeys,
	tokenBalances
}: {
	accountKeys: ParsedAccount[];
	tokenBalances: SolTokenBalance[];
}): SolTokenAccountMetadata =>
	tokenBalances.reduce<SolTokenAccountMetadata>(
		({ addressToOwner, addressToToken }, { accountIndex, mint, owner }) => {
			const account = accountKeys[Number(accountIndex)]?.pubkey;

			if (isNullish(account) || isNullish(owner)) {
				return { addressToOwner, addressToToken };
			}

			return {
				addressToOwner: { ...addressToOwner, [account]: owner },
				addressToToken: { ...addressToToken, [account]: mint }
			};
		},
		emptySolTokenAccountMetadata
	);

export const fetchSolTransactionsForSignature = async ({
	signature,
	network,
	address,
	ownedTokenAccounts = []
}: {
	signature: SolSignature;
	network: SolanaNetworkType;
	address: SolAddress;
	// Token accounts of the user that may hold no balance yet, known without deriving them here: a
	// caller resolving a signature for every token of a network passes all their accounts at once.
	ownedTokenAccounts?: SolAddress[];
}): Promise<SolTransactionUi[]> => {
	const transactionDetail: SolRpcTransaction | null = await fetchTransactionDetailForSignature({
		signature,
		network
	});

	if (isNullish(transactionDetail)) {
		return [];
	}

	const reading = readOrThrow({ signature, transactionDetail, address, ownedTokenAccounts });

	if (isNullish(reading)) {
		return [];
	}

	const { record, counterparty, knownOwners, tokenAddresses } = reading;

	// Name the mints this record mentions. Best effort: an unnamed token still renders, and the
	// loader skips mints it has already asked about, so a busy wallet does not re-ask per page.
	await loadSplTokenMetadata({ tokenAddresses, network });

	const counterpartyOwner = nonNullish(counterparty)
		? (knownOwners[counterparty] ?? (await getAccountOwner({ address: counterparty, network })))
		: undefined;

	return [
		{
			...record,
			...(record.type === 'receive' &&
				nonNullish(counterpartyOwner) && { fromOwner: counterpartyOwner }),
			...(record.type === 'send' && nonNullish(counterpartyOwner) && { toOwner: counterpartyOwner })
		}
	];
};

interface SolTransactionReading {
	// Everything but who owns the counterparty, which takes a lookup.
	record: SolTransactionUi;
	counterparty?: SolAddress;
	// The owner of each token account the transaction itself names, so most counterparties need no
	// lookup.
	knownOwners: Record<SolAddress, SolAddress>;
	// The mints the record mentions, to be named.
	tokenAddresses: SplTokenAddress[];
}

// OISY's own reading of a transaction the RPC returned, which asks nothing of the network: a failure
// of it fails again however often the transaction is fetched again, so it is told apart from the
// failures of the lookups around it.
const readOrThrow = (params: Parameters<typeof readSolTransaction>[0]) => {
	try {
		return readSolTransaction(params);
	} catch (err: unknown) {
		throw new SolTransactionReadError('A Solana transaction could not be read', { cause: err });
	}
};

const readSolTransaction = ({
	signature,
	transactionDetail,
	address,
	ownedTokenAccounts
}: {
	signature: SolSignature;
	transactionDetail: SolRpcTransaction;
	address: SolAddress;
	ownedTokenAccounts: SolAddress[];
}): SolTransactionReading | undefined => {
	const {
		slot,
		blockTime,
		confirmationStatus: status,
		transaction: {
			message: { instructions, accountKeys }
		},
		meta
	} = transactionDetail;

	const { fee, preBalances, postBalances, preTokenBalances, postTokenBalances } = meta ?? {};
	const parsedAccountKeys = [...(accountKeys ?? [])];
	const { pubkey: feePayer } = extractFeePayer([...(accountKeys ?? [])]) ?? {};
	const tokenBalanceMetadata = extractTokenBalanceMetadata({
		accountKeys: parsedAccountKeys,
		tokenBalances: [...(preTokenBalances ?? []), ...(postTokenBalances ?? [])]
	});

	const putativeInnerInstructions = meta?.innerInstructions ?? [];

	const { addressToOwner, addressToToken } = tokenBalanceMetadata;

	// The accounts the user owns going in: the wallet, every token account the balances name as
	// theirs, and the token accounts the caller names, which may hold no balance yet. Accounts the
	// transaction itself opens for the user are learnt by the derivation.
	const ownedAddresses = [
		address,
		...Object.entries(addressToOwner)
			.filter(([, owner]) => owner === address)
			.map(([account]) => account),
		...ownedTokenAccounts
	];

	// Who held each token account going in. Not the owners merged from before and after, which the
	// counterparty lookup wants: an address closed and opened again for somebody else within the
	// one transaction would read as theirs at a close that happened while it was still the user's.
	const accountHolders = [...(preTokenBalances ?? [])].reduce<Record<SolAddress, SolAddress>>(
		(acc, { accountIndex, owner }) => {
			const account = parsedAccountKeys[Number(accountIndex)]?.pubkey;

			return nonNullish(account) && nonNullish(owner) ? { ...acc, [account]: owner } : acc;
		},
		{}
	);

	// Which mint each token account held going in, for the same reason as its holder.
	const accountMintsBefore = [...(preTokenBalances ?? [])].reduce<
		Record<SolAddress, SplTokenAddress>
	>((acc, { accountIndex, mint }) => {
		const account = parsedAccountKeys[Number(accountIndex)]?.pubkey;

		return nonNullish(account) && nonNullish(mint) ? { ...acc, [account]: mint } : acc;
	}, {});

	// What each token account held going in, from the same array the owners and mints come from.
	// Only the pre-state: what an account holds at a close is walked forward from here, and the
	// post-state of an account that was closed is nothing at all.
	const accountTokenAmounts = [...(preTokenBalances ?? [])].reduce<Record<SolAddress, bigint>>(
		(acc, { accountIndex, uiTokenAmount }) => {
			const account = parsedAccountKeys[Number(accountIndex)]?.pubkey;

			return nonNullish(account) && nonNullish(uiTokenAmount?.amount)
				? { ...acc, [account]: BigInt(uiTokenAmount.amount) }
				: acc;
		},
		{}
	);

	// What each account held going in, so a close can say what it hands back: the instruction
	// itself states no amount, and for a wrapped SOL account it is the wrapped SOL too.
	const balances = preBalances ?? [];

	const accountLamports = parsedAccountKeys.reduce<Record<SolAddress, bigint>>(
		(acc, { pubkey }, index) => {
			const lamports = balances[index];

			if (nonNullish(lamports)) {
				acc[pubkey] = lamports;
			}

			return acc;
		},
		{}
	);

	const instructionSummaries = mapSolInstructionSummaries({
		instructions: [...instructions],
		innerInstructions: [...putativeInnerInstructions].map(({ index, instructions: inner }) => ({
			index: Number(index),
			instructions: [...inner]
		})),
		ownedAddresses,
		userAddress: address,
		addressToToken,
		accountHolders,
		accountMintsBefore,
		accountLamports,
		accountTokenAmounts
	});

	const netChanges = mapSolNetBalanceChanges({
		address,
		fee,
		feePayer,
		accountKeys: parsedAccountKeys,
		preBalances: [...(preBalances ?? [])],
		postBalances: [...(postBalances ?? [])],
		preTokenBalances: [...(preTokenBalances ?? [])],
		postTokenBalances: [...(postTokenBalances ?? [])]
	});

	// Nothing of the user's moved and nothing they own was touched: one of the false positives an
	// ATA signature lookup produces, and there is nothing to show for it.
	if (instructionSummaries.length === 0 && netChanges.length === 0) {
		return;
	}

	const summary = deriveSolTransactionSummary({
		netChanges,
		instructions: instructionSummaries,
		userAddress: address
	});

	const { counterparty } = summary;

	// The shared type only speaks send and receive, so a swap is typed by its outgoing half and an
	// approval or authority change falls back to send too; what the transaction actually was is the
	// summary's to say, and the UI reads the summary first.
	const type: SolTransactionUi['type'] = summary.kind === 'receive' ? 'receive' : 'send';

	// A transaction that reduces to none of the three kinds has no counterparty to name: writing
	// the wallet into `to` would fabricate a transfer to self that never happened.
	const directional = summary.kind !== 'other';

	const amount = summary.spent ?? summary.received;

	// One record per signature: the transaction is the unit the user thinks in, and the summary,
	// the net and the instruction list travel with it for the modal's three tabs.
	const record: SolTransactionUi = {
		id: signature.signature,
		signature: signature.signature,
		blockNumber: Number(slot),
		timestamp: blockTime ?? ZERO,
		...(nonNullish(amount) && { value: absBigInt(amount.delta) }),
		type,
		from: type === 'send' ? address : (counterparty ?? address),
		...(directional && { to: type === 'send' ? (counterparty ?? address) : address }),
		status,
		...(nonNullish(fee) && nonNullish(feePayer) && { fee: address === feePayer ? fee : ZERO }),
		summary,
		netChanges,
		instructions: instructionSummaries
	};

	return {
		record,
		...(nonNullish(counterparty) && { counterparty }),
		knownOwners: addressToOwner,
		tokenAddresses: netChanges.map(({ tokenAddress }) => tokenAddress).filter(nonNullish)
	};
};
