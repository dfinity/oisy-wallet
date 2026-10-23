import { WSOL_TOKEN } from '$env/tokens/tokens-spl/tokens.wsol.env';
import { LifiSolFeeChangedError } from '$lib/types/errors';
import {
	assertLifiSolInstructions,
	assertLifiSolSimulation,
	lifiSolNetworkFee,
	token2022AccountSize,
	type LifiSolBinding,
	type LifiSolCreatedAccount
} from '$lib/utils/lifi-sol-transaction.utils';
import { lifiRejectedError } from '$lib/utils/lifi-swap.utils';
import { getAccountData, getSolCreateAccountFee } from '$sol/api/solana.api';
import { ATA_SIZE } from '$sol/constants/ata.constants';
import { LIFI_SOLANA_FEE_WALLET } from '$sol/constants/lifi.constants';
import {
	SYSTEM_PROGRAM_ADDRESS,
	TOKEN_2022_PROGRAM_ADDRESS,
	TOKEN_PROGRAM_ADDRESS
} from '$sol/constants/sol.constants';
import { solanaHttpRpc } from '$sol/providers/sol-rpc.providers';
import { simulateSolTransaction } from '$sol/services/sol-simulation.services';
import { calculateAssociatedTokenAddress } from '$sol/services/spl-accounts.services';
import type { SolAddress } from '$sol/types/address';
import { SolanaNetworks } from '$sol/types/network';
import { rentExemptMinimumFor } from '$sol/utils/sol-rent.utils';
import {
	decodeTransactionMessage,
	parseSolBase64TransactionMessage
} from '$sol/utils/sol-transactions.utils';
import { isNullish } from '@dfinity/utils';
import type { LiFiStep, QuoteRequestFromAmount } from '@lifi/sdk';
import { getMintDecoder } from '@solana-program/token-2022';
import { getCompiledTransactionMessageDecoder, unwrapOption } from '@solana/kit';

const rejected = (reason: string) => lifiRejectedError({ subject: 'transaction', reason });

/**
 * The size of the associated token account a creation makes: an SPL Token one is `ATA_SIZE`, a
 * Token-2022 one carries the extensions its mint requires, so that mint is read. `undefined` when it
 * cannot be read or sized.
 */
const createdAccountSize = async ({
	mint,
	tokenProgram
}: Pick<LifiSolCreatedAccount, 'mint' | 'tokenProgram'>): Promise<bigint | undefined> => {
	if (tokenProgram === TOKEN_PROGRAM_ADDRESS) {
		return ATA_SIZE;
	}

	try {
		const data = await getAccountData({ address: mint, network: SolanaNetworks.mainnet });

		if (isNullish(data)) {
			return;
		}

		// The decoder throws on an extension type it does not know.
		const extensions = unwrapOption(getMintDecoder().decode(data).extensions) ?? [];

		return token2022AccountSize(extensions.map(({ __kind }) => __kind));
	} catch (_: unknown) {
		return undefined;
	}
};

/**
 * LI.FI's ceiling for a Solana transaction: its network fee plus the rent-exempt minimum of every
 * account it creates, each sized from its mint. An account that already exists is counted too, since
 * nothing in the message says it does, and a temporary one is, since it must be funded until it is
 * closed: an upper bound on what the transaction costs beyond the amount it swaps. `undefined` when
 * the size of one of them cannot be established.
 */
export const lifiSolTransactionCeiling = async ({
	networkFee,
	createdAccounts,
	rentExemptMinimum
}: {
	networkFee: bigint;
	createdAccounts: LifiSolCreatedAccount[];
	rentExemptMinimum: bigint;
}): Promise<bigint | undefined> => {
	const sizes = await Promise.all(createdAccounts.map(createdAccountSize));

	return sizes.reduce<bigint | undefined>(
		(acc, space) =>
			isNullish(acc) || isNullish(space)
				? undefined
				: acc + rentExemptMinimumFor({ space, rentExemptMinimum }),
		networkFee
	);
};

const toBinding = ({
	request: { fromToken, toToken, fromAddress, fromAmount },
	displayedToAmountMin
}: {
	request: QuoteRequestFromAmount;
	displayedToAmountMin: bigint;
}): LifiSolBinding => ({
	userAddress: fromAddress,
	fromToken,
	toToken,
	amount: BigInt(fromAmount),
	displayedToAmountMin
});

/**
 * An owner's associated token account for a mint, under each program that may hold the mint: the
 * instruction spending from or paying into it names the program, and the account is derived from
 * it.
 */
const associatedTokenAccounts = async ({
	owner,
	mint
}: {
	owner: SolAddress;
	mint: SolAddress;
}): Promise<Partial<Record<SolAddress, SolAddress>>> => {
	const [token, token2022] = await Promise.all(
		[TOKEN_PROGRAM_ADDRESS, TOKEN_2022_PROGRAM_ADDRESS].map((tokenOwnerAddress) =>
			calculateAssociatedTokenAddress({ owner, tokenAddress: mint, tokenOwnerAddress })
		)
	);

	return { [TOKEN_PROGRAM_ADDRESS]: token, [TOKEN_2022_PROGRAM_ADDRESS]: token2022 };
};

/**
 * Refuses a LI.FI Solana → Solana transaction unless it does what the request asked, before anything
 * is signed: its top-level instructions are the pinned ones (`assertLifiSolInstructions`), its LI.FI
 * ceiling is no higher than the one the user reviewed, and a simulation of its exact bytes, own
 * blockhash kept and pre-state read at the slot it ran at, bounds what it spends and receives
 * (`assertLifiSolSimulation`).
 *
 * A ceiling above the reviewed one throws `LifiSolFeeChangedError` with it, for the review to show;
 * any other refusal throws `LifiQuoteRejectedError`. A simulation that fails, times out or cannot be
 * read at one slot refuses the transaction: unlike the WalletConnect review's, this one fails closed.
 *
 * Only the decompiled message is used to read the instructions and pick the accounts to simulate;
 * what is simulated, and later signed, are LI.FI's own bytes.
 */
export const assertLifiSolTransaction = async ({
	quote,
	request,
	displayedToAmountMin,
	reviewedCeiling
}: {
	quote: LiFiStep;
	request: QuoteRequestFromAmount;
	displayedToAmountMin: bigint;
	reviewedCeiling: bigint;
}): Promise<void> => {
	const data = quote.transactionRequest?.data;

	if (isNullish(data)) {
		throw rejected('no transaction');
	}

	const binding = toBinding({ request, displayedToAmountMin });
	const { userAddress, fromToken } = binding;
	const network = SolanaNetworks.mainnet;

	const { messageBytes, signatures } = decodeTransactionMessage(data);

	// The fee is priced from the Compute Budget instructions, which a version 1 message replaces with
	// its config.
	if (getCompiledTransactionMessageDecoder().decode(messageBytes).version !== 0) {
		throw rejected('not a version 0 transaction');
	}

	// The fee payer is the first signer, so this also makes the user pay the fee, which the
	// simulation's lamport change then includes.
	const signers = Object.keys(signatures);

	if (signers.length !== 1 || signers[0] !== userAddress) {
		throw rejected('the transaction needs a signer other than the user');
	}

	// A native source is spent from the user's wrapped SOL account, and its fee paid in SOL.
	const nativeSource = fromToken === SYSTEM_PROGRAM_ADDRESS;

	const [transactionMessage, wrappedSolAccount, sourceAccounts, feeAccounts, rentExemptMinimum] =
		await Promise.all([
			parseSolBase64TransactionMessage({ transactionMessage: data, rpc: solanaHttpRpc(network) }),
			calculateAssociatedTokenAddress({
				owner: userAddress,
				tokenAddress: WSOL_TOKEN.address,
				tokenOwnerAddress: TOKEN_PROGRAM_ADDRESS
			}),
			nativeSource ? undefined : associatedTokenAccounts({ owner: userAddress, mint: fromToken }),
			nativeSource
				? {}
				: associatedTokenAccounts({ owner: LIFI_SOLANA_FEE_WALLET, mint: fromToken }),
			getSolCreateAccountFee(network)
		]);

	const { computeUnitLimit, computeUnitPrice, createdAccounts } = assertLifiSolInstructions({
		instructions: transactionMessage.instructions,
		binding,
		accounts: {
			wrappedSolAccount,
			sourceTokenAccounts: sourceAccounts ?? { [TOKEN_PROGRAM_ADDRESS]: wrappedSolAccount },
			feeTokenAccounts: feeAccounts
		}
	});

	const ceiling = await lifiSolTransactionCeiling({
		networkFee: lifiSolNetworkFee({
			computeUnitLimit,
			computeUnitPrice,
			signatures: signers.length,
			instructionsCount: transactionMessage.instructions.length
		}),
		createdAccounts,
		rentExemptMinimum
	});

	if (isNullish(ceiling)) {
		throw rejected('the rent of an account it creates cannot be bounded');
	}

	if (ceiling > reviewedCeiling) {
		throw new LifiSolFeeChangedError({ ceiling });
	}

	const result = await simulateSolTransaction({
		base64EncodedTransactionMessage: data,
		transactionMessage,
		address: userAddress,
		network,
		rentExemptMinimumRequest: Promise.resolve(rentExemptMinimum),
		replaceRecentBlockhash: false,
		consistentSnapshot: true
	});

	assertLifiSolSimulation({ result, binding, wrappedSolAccount, ceiling });
};
