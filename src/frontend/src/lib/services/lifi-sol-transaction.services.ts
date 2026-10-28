import { WSOL_TOKEN } from '$env/tokens/tokens-spl/tokens.wsol.env';
import { ZERO } from '$lib/constants/app.constants';
import {
	LifiQuoteRejectedError,
	LifiRouteUnsupportedError,
	LifiSolFeeChangedError
} from '$lib/types/errors';
import {
	assertLifiSolInstructions,
	assertLifiSolSimulation,
	lifiSolNetworkFee,
	token2022AccountSize,
	type LifiSolBinding,
	type LifiSolCreatedAccount
} from '$lib/utils/lifi-sol-transaction.utils';
import { decodeLifiSolTransaction, lifiRejectedError } from '$lib/utils/lifi-swap.utils';
import {
	getAccountData,
	getMultipleAccountsInfo,
	getSolCreateAccountFee
} from '$sol/api/solana.api';
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
import { parseTokenAccountState } from '$sol/utils/sol-simulation.utils';
import { parseSolBase64TransactionMessage } from '$sol/utils/sol-transactions.utils';
import { isNullish } from '@dfinity/utils';
import type { LiFiStep, QuoteRequestFromAmount } from '@lifi/sdk';
import { getMintDecoder } from '@solana-program/token-2022';
import { unwrapOption } from '@solana/kit';

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

	return {
		data,
		binding,
		transactionMessage,
		wrappedSolAccount,
		rentExemptMinimum,
		ceiling,
		closesWrappedSolAccount
	};
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
	const { data, binding, transactionMessage, wrappedSolAccount, rentExemptMinimum, ceiling } =
		await readLifiSolTransaction({ quote, request, displayedToAmountMin });
	const { userAddress } = binding;
	const network = SolanaNetworks.mainnet;

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
 * binding reads it before signing, short of the simulation: what the form budgets beyond the amount.
 *
 * A route the binding would refuse gets no offer, since it could only fail once the user confirmed
 * it. Neither does one that closes the user's wrapped SOL account while it holds wrapped SOL: the
 * close would unwrap all of it, which the binding refuses too. That account is read whenever the
 * route closes it, created first or not: an idempotent creation leaves an existing account as it is,
 * so it does not show the account to be new. Both refuse with
 * `LifiRouteUnsupportedError`, a route OISY cannot take rather than a forged one: the quote has
 * passed the trust checks. A failure to read the chain rejects as it is.
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
				route: quote
			});
		}

		throw err;
	}

	const { ceiling, wrappedSolAccount, closesWrappedSolAccount } = transaction;

	if (closesWrappedSolAccount && (await holdsWrappedSol(wrappedSolAccount))) {
		throw new LifiRouteUnsupportedError(
			'LI.FI Solana route would unwrap the wrapped SOL the user holds',
			{ route: quote }
		);
	}

	return ceiling;
};
