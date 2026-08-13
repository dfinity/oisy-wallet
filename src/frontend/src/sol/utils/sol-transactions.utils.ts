import { ZERO } from '$lib/constants/app.constants';
import type { OptionSolAddress } from '$sol/types/address';
import type { MappedSolTransaction } from '$sol/types/sol-transaction';
import type { CompilableTransactionMessage } from '$sol/types/sol-transaction-message';
import { calculateSolPrioritizationFee, resolveSolComputeUnitLimit } from '$sol/utils/fee.utils';
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

/**
 * Whether these bytes decode as a compiled Solana transaction message.
 *
 * Decoder acceptance is the definition, deliberately, and it is wider than "the network would
 * honour a signature over exactly these bytes": the decoder also accepts a message carrying
 * trailing padding, for instance. The line is drawn there because this decoder is the very one the
 * transaction flow parses requests with, so what counts as a transaction on this path is exactly
 * what counts as one there.
 *
 * Decoding is the only criterion on purpose. A stricter sniff (plausible header counts, a
 * non-empty instruction list) would let a crafted degenerate message through, and the error is not
 * symmetric: refusing a genuine message costs a signature the dApp can ask for again, signing a
 * disguised transaction costs funds. The cost is bounded because Solana message signing carries
 * UTF-8 text, and no printable-ASCII string decodes as a compiled message, so only a binary
 * payload that happens to be transaction-shaped is affected.
 */
export const isSolCompiledTransactionMessage = (bytes: Uint8Array): boolean => {
	try {
		getCompiledTransactionMessageDecoder().decode(bytes);

		return true;
	} catch (_: unknown) {
		return false;
	}
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
}: TransactionMessage): MappedSolTransaction => {
	const instructionsList = Array.from(instructions);

	const mapped = instructionsList.reduce<MappedSolTransaction>(
		(acc, instruction) => {
			const {
				amount,
				source,
				destination,
				payer,
				tokenAddress,
				isApproval,
				unreviewed,
				computeUnitPrice,
				computeUnitLimit,
				ambiguous: instructionAmbiguous
			} = mapSolInstruction(instruction);

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
			//
			// An instruction can also declare itself unfaithful on its own, and that verdict
			// propagates untouched. Two kinds do: a Compute Budget directive we cannot price makes
			// the fee shown wrong rather than incomplete, and an authority change or a burn is
			// decoded in full yet has no amount/source/destination the summary can carry, so a
			// warning would let it hide behind a dust transfer the user does see.
			const mixesTokenWithNonToken =
				(nonNullish(tokenAddress) && nonNullish(acc.amount) && isNullish(acc.tokenAddress)) ||
				(isNullish(tokenAddress) && nonNullish(amount) && nonNullish(acc.tokenAddress));
			const mixesApprovalWithTransfer =
				nonNullish(acc.amount) &&
				nonNullish(amount) &&
				(acc.isApproval ?? false) !== (isApproval ?? false);

			const ambiguous =
				(acc.ambiguous ?? false) ||
				(instructionAmbiguous ?? false) ||
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
				...(ambiguous && { ambiguous }),
				...(nonNullish(computeUnitPrice) && { computeUnitPrice }),
				...(nonNullish(computeUnitLimit) && { computeUnitLimit })
			};
		},
		{ amount: undefined }
	);

	const { computeUnitPrice, computeUnitLimit, ...rest } = mapped;

	// The prioritisation fee needs the whole message: the price and the limit come from separate
	// instructions, and the limit falls back to a default derived from the instruction count.
	const prioritizationFee = calculateSolPrioritizationFee({
		computeUnitPrice,
		computeUnitLimit,
		instructionsCount: instructionsList.length
	});

	if (isNullish(prioritizationFee)) {
		return rest;
	}

	// The resolved limit travels with the fee: pricing the network's own estimate, which is quoted
	// per compute unit, against this request needs the very same limit.
	return {
		...rest,
		prioritizationFee,
		computeUnitLimit: resolveSolComputeUnitLimit({
			computeUnitLimit,
			instructionsCount: instructionsList.length
		})
	};
};
