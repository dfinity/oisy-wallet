import { WSOL_TOKEN } from '$env/tokens/tokens-spl/tokens.wsol.env';
import { ZERO } from '$lib/constants/app.constants';
import { LIFI_SOL_NETWORK_FEE_HEADROOM_PERCENT } from '$lib/constants/swap.constants';
import {
	LifiQuoteRejectedError,
	LifiRouteUnsupportedError,
	LifiSolFeeChangedError
} from '$lib/types/errors';
import {
	assertLifiSolInstructions,
	assertLifiSolSimulation,
	callsUnpinnedProgram,
	lifiSolNetworkFee,
	token2022AccountSize,
	type LifiSolBinding,
	type LifiSolCreatedAccount
} from '$lib/utils/lifi-sol-transaction.utils';
import { decodeLifiSolTransaction, lifiRejectedError } from '$lib/utils/lifi-swap.utils';
import { withDeadline } from '$lib/utils/timeout.utils';
import {
	getAccountData,
	getMultipleAccountsInfo,
	getSolCreateAccountFee
} from '$sol/api/solana.api';
import { ATA_SIZE } from '$sol/constants/ata.constants';
import { LIFI_SOLANA_FEE_WALLET } from '$sol/constants/lifi.constants';
import {
	SOLANA_SIMULATION_TIMEOUT_MILLISECONDS,
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
import { parseTokenAccountState } from '$sol/utils/sol-simulation.utils';
import { parseSolBase64TransactionMessage } from '$sol/utils/sol-transactions.utils';
import { isNullish } from '@dfinity/utils';
import type { LiFiStep, QuoteRequestFromAmount } from '@lifi/sdk';
import { getMintDecoder } from '@solana-program/token-2022';
import { unwrapOption } from '@solana/kit';

const rejected = (reason: string) => lifiRejectedError({ subject: 'transaction', reason });

/**
 * The size of the associated token account a creation makes: an SPL Token one is `ATA_SIZE`, a
 * Token-2022 one carries the extensions its mint requires, so that mint is read. `undefined` when the
 * mint does not exist or cannot be sized; a read that fails rejects as it is, a failure of the chain
 * rather than of the route.
 */
const createdAccountSize = async ({
	mint,
	tokenProgram
}: Pick<LifiSolCreatedAccount, 'mint' | 'tokenProgram'>): Promise<bigint | undefined> => {
	if (tokenProgram === TOKEN_PROGRAM_ADDRESS) {
		return ATA_SIZE;
	}

	const data = await getAccountData({ address: mint, network: SolanaNetworks.mainnet });

	if (isNullish(data)) {
		return;
	}

	try {
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
 * the size of one of them cannot be established; a mint read that fails rejects as it is.
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
 * A LI.FI Solana → Solana transaction read and pinned, short of simulating it: its top-level
 * instructions are the pinned ones (`assertLifiSolInstructions`), and its LI.FI ceiling is bounded.
 * Refuses with `LifiQuoteRejectedError` otherwise.
 */
const readLifiSolTransaction = async ({
	quote,
	request,
	displayedToAmountMin
}: {
	quote: LiFiStep;
	request: QuoteRequestFromAmount;
	displayedToAmountMin: bigint;
}) => {
	const data = quote.transactionRequest?.data;

	if (isNullish(data)) {
		throw rejected('no transaction');
	}

	const binding = toBinding({ request, displayedToAmountMin });
	const { userAddress, fromToken, toToken } = binding;
	const network = SolanaNetworks.mainnet;

	// The user is the only signer, so also the fee payer, whose lamport change in the simulation then
	// includes the fee.
	const { signatures } = decodeLifiSolTransaction({ data, userAddress });
	const signers = Object.keys(signatures);

	// A native source is spent from the user's wrapped SOL account, and its fee paid in SOL; a native
	// destination is paid into that same account.
	const nativeSource = fromToken === SYSTEM_PROGRAM_ADDRESS;
	const nativeDestination = toToken === SYSTEM_PROGRAM_ADDRESS;

	const [
		transactionMessage,
		wrappedSolAccount,
		sourceAccounts,
		destinationAccounts,
		feeAccounts,
		rentExemptMinimum
	] = await Promise.all([
		parseSolBase64TransactionMessage({ transactionMessage: data, rpc: solanaHttpRpc(network) }),
		calculateAssociatedTokenAddress({
			owner: userAddress,
			tokenAddress: WSOL_TOKEN.address,
			tokenOwnerAddress: TOKEN_PROGRAM_ADDRESS
		}),
		nativeSource ? undefined : associatedTokenAccounts({ owner: userAddress, mint: fromToken }),
		nativeDestination ? undefined : associatedTokenAccounts({ owner: userAddress, mint: toToken }),
		nativeSource ? {} : associatedTokenAccounts({ owner: LIFI_SOLANA_FEE_WALLET, mint: fromToken }),
		getSolCreateAccountFee(network)
	]);

	const { computeUnitLimit, computeUnitPrice, createdAccounts, closesWrappedSolAccount } =
		assertLifiSolInstructions({
			instructions: transactionMessage.instructions,
			binding,
			accounts: {
				wrappedSolAccount,
				sourceTokenAccounts: sourceAccounts ?? { [TOKEN_PROGRAM_ADDRESS]: wrappedSolAccount },
				destinationTokenAccounts: destinationAccounts ?? {
					[TOKEN_PROGRAM_ADDRESS]: wrappedSolAccount
				},
				feeTokenAccounts: feeAccounts
			}
		});

	const networkFee = lifiSolNetworkFee({
		computeUnitLimit,
		computeUnitPrice,
		signatures: signers.length,
		instructionsCount: transactionMessage.instructions.length
	});

	const ceiling = await lifiSolTransactionCeiling({
		networkFee,
		createdAccounts,
		rentExemptMinimum
	});

	if (isNullish(ceiling)) {
		throw rejected('the rent of an account it creates cannot be bounded');
	}

	return {
		data,
		binding,
		transactionMessage,
		wrappedSolAccount,
		rentExemptMinimum,
		networkFee,
		ceiling,
		closesWrappedSolAccount
	};
};

// A ceiling as the user reviews it: LI.FI prices the compute units anew with each quote, and the
// next re-quote must still fit (`LIFI_SOL_NETWORK_FEE_HEADROOM_PERCENT`). The rent does not move.
const withNetworkFeeHeadroom = ({
	ceiling,
	networkFee
}: {
	ceiling: bigint;
	networkFee: bigint;
}): bigint => ceiling + (networkFee * LIFI_SOL_NETWORK_FEE_HEADROOM_PERCENT) / 100n;

/**
 * Refuses a LI.FI Solana → Solana transaction unless it does what the request asked, before anything
 * is signed: its top-level instructions are the pinned ones (`assertLifiSolInstructions`), its LI.FI
 * ceiling is no higher than the one the user reviewed, and a simulation of its exact bytes, own
 * blockhash kept and pre-state read at the slot it ran at, bounds what it spends and receives
 * (`assertLifiSolSimulation`).
 *
 * A ceiling above the reviewed one throws `LifiSolFeeChangedError` with it, for the review to show,
 * with the headroom on its network fee the displayed quote's has: without it, a retry would pass only
 * at a price no higher than this one. Any other refusal throws `LifiQuoteRejectedError`. A simulation that fails, times out or cannot be
 * read at one slot refuses the transaction: unlike the WalletConnect review's, this one fails closed.
 *
 * Only the decompiled message is used to read the instructions and pick the accounts to simulate;
 * what is simulated, and later signed, are LI.FI's own bytes.
 *
 * Returns the slot the simulation ran at, where the transaction's blockhash was valid: the poller
 * reads the blockhash's validity no earlier than that (`lifi_simulation_slot`).
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
}): Promise<{ simulationSlot: bigint | undefined }> => {
	const {
		data,
		binding,
		transactionMessage,
		wrappedSolAccount,
		rentExemptMinimum,
		networkFee,
		ceiling
	} = await readLifiSolTransaction({ quote, request, displayedToAmountMin });
	const { userAddress } = binding;
	const network = SolanaNetworks.mainnet;

	if (ceiling > reviewedCeiling) {
		throw new LifiSolFeeChangedError({ ceiling: withNetworkFeeHeadroom({ ceiling, networkFee }) });
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

	return { simulationSlot: result?.slot };
};

// Whether the user's wrapped SOL account holds wrapped SOL, which closing it would unwrap. One that
// does not exist holds none; one that does not read as a token account counts as holding some.
const holdsWrappedSol = async (account: SolAddress): Promise<boolean> => {
	const [info] = await getMultipleAccountsInfo({
		addresses: [account],
		network: SolanaNetworks.mainnet
	});

	if (isNullish(info)) {
		return false;
	}

	const amount = parseTokenAccountState(info)?.amount;

	return isNullish(amount) || amount > ZERO;
};

/**
 * The LI.FI ceiling of a Solana-source quote the form shows, read off its own transaction as the
 * binding reads it before signing, short of the simulation, with headroom on its network fee: what
 * the form, "Max" and the review budget beyond the amount, and execution's re-quote must fit. LI.FI
 * prices the compute units anew with each quote (`LIFI_SOL_NETWORK_FEE_HEADROOM_PERCENT`).
 *
 * A route the binding would refuse gets no offer, since it could only fail once the user confirmed
 * it. It refuses with `LifiRouteUnsupportedError`, the binding's refusal as its cause: when a Solana
 * quote is fetched, the trust checks do not read its instructions, so the pinned instructions are the
 * only check of what its transaction does. The refusal is then tracked as a rejected quote, as a
 * forged EVM target is, and so is a change in LI.FI's transactions that the pin does not know yet.
 *
 * Nor does a route get an offer that closes the user's wrapped SOL account while it holds wrapped
 * SOL: the close would unwrap all of it, which the binding refuses too. That account is read
 * whenever the route closes it, created first or not: an idempotent creation leaves an existing
 * account as it is, so it does not show the account to be new. It refuses with
 * `LifiRouteUnsupportedError` and no cause, a route OISY cannot take, tracked as no route.
 *
 * A failure to read the chain rejects as it is.
 */
export const loadLifiSolQuoteCeiling = async ({
	quote,
	request
}: {
	quote: LiFiStep;
	request: QuoteRequestFromAmount;
}): Promise<bigint> => {
	let transaction: Awaited<ReturnType<typeof readLifiSolTransaction>>;

	try {
		transaction = await readLifiSolTransaction({
			quote,
			request,
			displayedToAmountMin: BigInt(quote.estimate.toAmountMin)
		});
	} catch (err: unknown) {
		if (err instanceof LifiQuoteRejectedError) {
			throw new LifiRouteUnsupportedError(`LI.FI Solana route cannot be executed: ${err.message}`, {
				route: quote,
				cause: err
			});
		}

		throw err;
	}

	const { networkFee, ceiling, wrappedSolAccount, closesWrappedSolAccount } = transaction;

	if (closesWrappedSolAccount && (await holdsWrappedSol(wrappedSolAccount))) {
		throw new LifiRouteUnsupportedError(
			'LI.FI Solana route would unwrap the wrapped SOL the user holds',
			{ route: quote }
		);
	}

	return withNetworkFeeHeadroom({ ceiling, networkFee });
};

const simulateCallsUnpinnedProgram = async ({
	data,
	userAddress
}: {
	data: string;
	userAddress: SolAddress;
}): Promise<boolean | undefined> => {
	const network = SolanaNetworks.mainnet;

	let transactionMessage: Awaited<ReturnType<typeof parseSolBase64TransactionMessage>>;

	try {
		transactionMessage = await parseSolBase64TransactionMessage({
			transactionMessage: data,
			rpc: solanaHttpRpc(network)
		});
	} catch (_: unknown) {
		return;
	}

	const result = await simulateSolTransaction({
		base64EncodedTransactionMessage: data,
		transactionMessage,
		address: userAddress,
		network,
		// Only the programs it reaches are read, not what it funds.
		rentExemptMinimumRequest: Promise.resolve(undefined)
	});

	return isNullish(result) ? undefined : callsUnpinnedProgram(result.unreadPrograms);
};

/**
 * Whether the transaction of a Solana-source quote the review shows calls a program that is neither
 * known nor pinned (`callsUnpinnedProgram`), from a simulation of it with its blockhash replaced: a
 * venue Jupiter added since the pin, which the binding would refuse only once the user confirmed.
 * Checking it at the review brings that refusal before the confirmation.
 *
 * `undefined` when there is no answer: a simulation that fails, a failed transaction included, a
 * message whose lookup tables cannot be read, or no answer within
 * `SOLANA_SIMULATION_TIMEOUT_MILLISECONDS`, the lookup tables' read included, since the review waits
 * for it. The binding still checks the transaction that is signed.
 */
export const lifiSolQuoteCallsUnpinnedProgram = async ({
	quote,
	userAddress
}: {
	quote: LiFiStep;
	userAddress: SolAddress;
}): Promise<boolean | undefined> => {
	const data = quote.transactionRequest?.data;

	if (isNullish(data)) {
		return;
	}

	return await withDeadline({
		operation: simulateCallsUnpinnedProgram({ data, userAddress }),
		fallback: undefined,
		milliseconds: SOLANA_SIMULATION_TIMEOUT_MILLISECONDS
	});
};
