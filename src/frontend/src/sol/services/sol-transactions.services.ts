import { ZERO } from '$lib/constants/app.constants';
import { absBigInt } from '$lib/utils/bigint.utils';
import { fetchTransactionDetailForSignature, getAccountOwner } from '$sol/api/solana.api';
import { loadSplTokenMetadata } from '$sol/services/spl-token-metadata.services';
import type { SolAddress } from '$sol/types/address';
import type { SolanaNetworkType } from '$sol/types/network';
import type {
	ParsedAccount,
	SolRpcTransaction,
	SolSignature,
	SolTransactionUi
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
		addressToToken,
		accountLamports
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
		return [];
	}

	// Name the mints this record mentions. Best effort: an unnamed token still renders, and the
	// loader skips mints it has already asked about, so a busy wallet does not re-ask per page.
	await loadSplTokenMetadata({
		tokenAddresses: netChanges.map(({ tokenAddress }) => tokenAddress).filter(nonNullish),
		network
	});

	const summary = deriveSolTransactionSummary({
		netChanges,
		instructions: instructionSummaries
	});

	const { counterparty } = summary;

	const counterpartyOwner = nonNullish(counterparty)
		? (addressToOwner[counterparty] ?? (await getAccountOwner({ address: counterparty, network })))
		: undefined;

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
		...(type === 'receive' && nonNullish(counterpartyOwner) && { fromOwner: counterpartyOwner }),
		...(type === 'send' && nonNullish(counterpartyOwner) && { toOwner: counterpartyOwner }),
		status,
		...(nonNullish(fee) && nonNullish(feePayer) && { fee: address === feePayer ? fee : ZERO }),
		summary,
		netChanges,
		instructions: instructionSummaries
	};

	return [record];
};
