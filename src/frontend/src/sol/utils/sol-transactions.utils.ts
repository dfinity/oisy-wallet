import { ZERO } from '$lib/constants/app.constants';
import type { OptionSolAddress } from '$sol/types/address';
import type { MappedSolTransaction } from '$sol/types/sol-transaction';
import type { CompilableTransactionMessage } from '$sol/types/sol-transaction-message';
import { mapSolInstruction } from '$sol/utils/sol-instructions.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import {
	decompileTransactionMessageFetchingLookupTables,
	getBase64Encoder,
	getCompiledTransactionMessageDecoder,
	getTransactionDecoder,
	type Rpc,
	type SolanaRpcApi,
	type Transaction,
	type TransactionMessage
} from '@solana/kit';

export const decodeTransactionMessage = (transactionMessage: string): Transaction => {
	const transactionBytes = getBase64Encoder().encode(transactionMessage);
	return getTransactionDecoder().decode(transactionBytes);
};

/**
 * It parses a base64 encoded transaction message into a compilable transaction message with lookup tables and instruction
 */
export const parseSolBase64TransactionMessage = async ({
	transactionMessage,
	rpc
}: {
	transactionMessage: string;
	rpc: Rpc<SolanaRpcApi>;
}): Promise<CompilableTransactionMessage> => {
	const { messageBytes } = decodeTransactionMessage(transactionMessage);
	const compiledTransactionMessage = getCompiledTransactionMessageDecoder().decode(messageBytes);
	return await decompileTransactionMessageFetchingLookupTables(compiledTransactionMessage, rpc);
};

const conflicts = ({
	current,
	next
}: {
	current: OptionSolAddress;
	next: OptionSolAddress;
}): boolean => nonNullish(current) && nonNullish(next) && current !== next;

export const mapSolTransactionMessage = ({
	instructions
}: TransactionMessage): MappedSolTransaction =>
	Array.from(instructions).reduce<MappedSolTransaction>(
		(acc, instruction) => {
			const { amount, source, destination, payer, tokenAddress, isApproval, unreviewed } =
				mapSolInstruction(instruction);

			// The summary holds a single value per field, so any later instruction that
			// disagrees on source, destination or payer would be silently dropped from the
			// review screen. We flag those as ambiguous so the signing flow refuses a
			// transaction it cannot display faithfully.
			//
			// The same applies to the token: the summary shows a single token's metadata and
			// sums every amount into one figure. Bundling movements of different mints — or
			// mixing a known SPL token with a native/unknown one — cannot be shown faithfully.
			//
			// An unreviewed instruction is different: it does not corrupt the summary, it
			// simply has effects we cannot describe. Rejecting every such transaction would
			// break most real dApp interactions (swaps, staking, NFT mints all carry
			// instructions we don't decode). We surface it as a warning instead, so the user
			// is told the review is incomplete and can decide.
			const mixesTokenWithNonToken =
				(nonNullish(tokenAddress) && nonNullish(acc.amount) && isNullish(acc.tokenAddress)) ||
				(isNullish(tokenAddress) && nonNullish(amount) && nonNullish(acc.tokenAddress));
			const mixesApprovalWithTransfer =
				nonNullish(acc.amount) &&
				nonNullish(amount) &&
				(acc.isApproval ?? false) !== (isApproval ?? false);

			const ambiguous =
				(acc.ambiguous ?? false) ||
				conflicts({ current: acc.source, next: source }) ||
				conflicts({ current: acc.destination, next: destination }) ||
				conflicts({ current: acc.payer, next: payer }) ||
				conflicts({ current: acc.tokenAddress, next: tokenAddress }) ||
				mixesTokenWithNonToken ||
				mixesApprovalWithTransfer;

			return {
				...acc,
				amount: nonNullish(amount) ? (acc.amount ?? ZERO) + amount : acc.amount,
				...(nonNullish(source) && { source }),
				...(nonNullish(destination) && { destination }),
				...(nonNullish(payer) && { payer }),
				...(nonNullish(tokenAddress) && { tokenAddress }),
				...((isApproval ?? acc.isApproval) && { isApproval: true }),
				...((unreviewed ?? acc.unreviewed) && { unreviewed: true }),
				...(ambiguous && { ambiguous })
			};
		},
		{ amount: undefined }
	);
