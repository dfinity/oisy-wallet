import type { solTransactionTypes } from '$lib/schema/transaction.schema';
import type { TransactionId, TransactionType, TransactionUiCommon } from '$lib/types/transaction';
import { solanaHttpRpc } from '$sol/providers/sol-rpc.providers';
import type { SolAddress } from '$sol/types/address';
import type { SplTokenAddress } from '$sol/types/spl';
import {
	getBase58Decoder,
	signature,
	type Commitment,
	type FullySignedTransaction,
	type GetSignaturesForAddressApi,
	type Signature,
	type Transaction,
	type TransactionWithBlockhashLifetime,
	type TransactionWithinSizeLimit
} from '@solana/kit';

export type SolTransactionType = Extract<
	TransactionType,
	(typeof solTransactionTypes.options)[number]
>;

export interface SolTransactionUi extends TransactionUiCommon {
	id: TransactionId;
	signature: Signature;
	type: SolTransactionType;
	status: Commitment | null;
	value?: bigint;
	fee?: bigint;
	// For Solana transactions, we want to show the owner instead of the ATA address
	fromOwner?: SolAddress;
	toOwner?: SolAddress;
}

const mockSolSignature = () => {
	const randomBytes = new Uint8Array(64);
	crypto.getRandomValues(randomBytes);
	const base58 = getBase58Decoder().decode(randomBytes);
	return signature(base58);
};
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const aux = async () => {
	const { getTransaction } = solanaHttpRpc('mainnet');

	return await getTransaction(mockSolSignature(), {
		maxSupportedTransactionVersion: 0,
		encoding: 'jsonParsed'
	}).send();
};
// TODO: Import type directly from @solana/kit when they will expose it
export type SolRpcTransactionRaw = NonNullable<Awaited<ReturnType<typeof aux>>>;

export type ParsedAccount = SolRpcTransactionRaw['transaction']['message']['accountKeys'][number];

export type SolRpcTransaction = SolRpcTransactionRaw & {
	id: string;
	signature: Signature;
	confirmationStatus: Commitment | null;
};

export type SolSignature = ReturnType<
	GetSignaturesForAddressApi['getSignaturesForAddress']
>[number];

export type SolSignedTransaction = Transaction &
	FullySignedTransaction &
	TransactionWithinSizeLimit &
	TransactionWithBlockhashLifetime;

export interface MappedSolTransaction {
	amount: bigint | undefined;
	payer?: SolAddress;
	source?: SolAddress;
	destination?: SolAddress;
	// The SPL token mint moved by the transaction, when it is a token (not native SOL)
	// transfer. Lets the review screen show the correct token metadata instead of
	// defaulting to native SOL.
	tokenAddress?: SplTokenAddress;
	// `true` when the transaction grants a spending allowance (`Approve`/`ApproveChecked`)
	// rather than transferring funds. The `destination` then holds the delegate (spender),
	// so the review must label it as an approval, not a send.
	isApproval?: boolean;
	// `true` when the message contains at least one instruction whose effects the
	// review screen cannot display. Unlike `ambiguous`, this does not block signing:
	// it surfaces a warning so the user knows the review is incomplete and can decide.
	unreviewed?: boolean;
	// Compute Budget directives, set per instruction and combined at message level into
	// `prioritizationFee`. They never move funds but they price the transaction. At message
	// level `computeUnitLimit` is the *resolved* budget, defaulted and clamped as the runtime
	// would, and it is kept so the network's per-compute-unit estimate can be priced the same way.
	computeUnitPrice?: bigint;
	computeUnitLimit?: bigint;
	// The prioritisation fee, in lamports, the message will be charged on top of the base
	// transaction fee. Only set at message level, where the whole instruction list is known.
	prioritizationFee?: bigint;
	// What OISY itself would pay to prioritise this same message, in lamports, from the network's
	// recent fees. The review compares the requested fee against it. Absent when the estimate
	// could not be obtained.
	prioritizationFeeEstimate?: bigint;
	// `true` when the message bundles instructions that disagree on source,
	// destination, payer or action type. The summary keeps a single value per field,
	// so such a transaction cannot be faithfully represented on the review screen and
	// must not be signed without the user seeing every fund movement.
	ambiguous?: boolean;
}

export interface SolMappedTransaction {
	value: bigint;
	from: SolAddress;
	to: SolAddress;
	tokenAddress?: SplTokenAddress;
}

/**
 * One value movement, as named by a single transfer instruction.
 *
 * OISY decodes instructions in two representations that never meet: `@solana/kit` objects for an
 * unsigned message, RPC JSON for anything the network has already run. They do not have to. They
 * meet here, as legs, which is the narrowest shape the party rules need.
 */
export interface SolTransferLeg {
	source: SolAddress;
	destination: SolAddress;
	amount: bigint;
	tokenAddress?: SplTokenAddress;
}

export interface SolTransferParty {
	address: SolAddress;
	// The wallet owning the account, where it is known. SPL transfers name token accounts, and a
	// user recognises a wallet address where nobody recognises their own associated token account.
	owner?: SolAddress;
	// Whether the account is one of the user's own. Our own account legitimately appears among the
	// destinations of a swap, where it is what the user receives, so it is marked rather than
	// dropped.
	own: boolean;
}

/**
 * Who a transaction spends from and who it pays.
 *
 * The two rules are asymmetric on purpose. Sources answers "what of ours is being spent", so a
 * counterparty paying into a pool never appears there. Destinations answers "where does the value
 * end up", counting every leg we are on either side of, which is the only way a swap can show what
 * the user receives and not only what they spend.
 */
export interface SolTransferParties {
	sources: SolTransferParty[];
	destinations: SolTransferParty[];
	// `true` when the lists were built from top-level instructions alone. A routed swap performs
	// its transfers inside cross-program invocations, so such lists can be empty for a message that
	// moves four amounts, and an empty list reads as an answer rather than as a gap.
	partial: boolean;
}
