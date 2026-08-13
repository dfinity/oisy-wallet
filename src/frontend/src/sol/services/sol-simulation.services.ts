import { waitForMilliseconds } from '$lib/utils/timeout.utils';
import { getMultipleAccountsInfo, simulateTransactionAccounts } from '$sol/api/solana.api';
import {
	SOLANA_SIMULATION_MAX_ACCOUNTS,
	SOLANA_SIMULATION_TIMEOUT_MILLISECONDS
} from '$sol/constants/sol.constants';
import type { OptionSolAddress, SolAddress } from '$sol/types/address';
import type { SolanaNetworkType } from '$sol/types/network';
import type { SolSimulationPreview } from '$sol/types/sol-simulation';
import type { CompilableTransactionMessage } from '$sol/types/sol-transaction-message';
import {
	isEmptySolSimulationPreview,
	mapSolSimulationPreview,
	selectSolSimulationAddresses
} from '$sol/utils/sol-simulation.utils';
import { isNullish, nonNullish } from '@dfinity/utils';

const simulate = async ({
	base64EncodedTransactionMessage,
	transactionMessage,
	address,
	network
}: {
	base64EncodedTransactionMessage: string;
	transactionMessage: CompilableTransactionMessage;
	address: SolAddress;
	network: SolanaNetworkType;
}): Promise<SolSimulationPreview | undefined> => {
	const addresses = selectSolSimulationAddresses(transactionMessage);

	// Truncating would be worse than saying nothing: the preview would report "no changes" for
	// accounts it never asked about.
	if (addresses.length > SOLANA_SIMULATION_MAX_ACCOUNTS) {
		return undefined;
	}

	// The "before" read does not depend on the simulation's outcome, so the two go out together
	// and the preview costs one round trip rather than two.
	const [preAccounts, { err, accounts: postAccounts }] = await Promise.all([
		getMultipleAccountsInfo({ addresses, network }),
		simulateTransactionAccounts({ base64EncodedTransactionMessage, addresses, network })
	]);

	// A run that failed rolled its changes back, so its post-state describes nothing the user
	// would actually get. Showing those deltas would be worse than showing none.
	if (nonNullish(err)) {
		return undefined;
	}

	const preview = mapSolSimulationPreview({
		addresses,
		preAccounts,
		postAccounts,
		userAddress: address
	});

	return isEmptySolSimulationPreview(preview) ? undefined : preview;
};

/**
 * What the network says this message would do to the user's own accounts, for the review to show
 * next to the statically decoded summary.
 *
 * Simulation sees what a decode structurally cannot: effects produced inside cross-program
 * invocations, which do not exist in an unsigned message at all.
 *
 * Best-effort by design. Any failure — an unsupported RPC, a rate limit, a transaction that would
 * itself fail, a provider taking too long — resolves to `undefined` and the review renders with
 * exactly the information it has today. The preview is extra context on top of the review, not
 * the material the review is made of, so its absence must never keep the user from seeing or
 * rejecting a request.
 */
export const simulateSolTransactionPreview = async (params: {
	base64EncodedTransactionMessage: string;
	transactionMessage: CompilableTransactionMessage;
	address: OptionSolAddress;
	network: SolanaNetworkType;
}): Promise<SolSimulationPreview | undefined> => {
	const { address } = params;

	if (isNullish(address)) {
		return undefined;
	}

	try {
		return await Promise.race([
			simulate({ ...params, address }),
			waitForMilliseconds(SOLANA_SIMULATION_TIMEOUT_MILLISECONDS).then(() => undefined)
		]);
	} catch (_: unknown) {
		return undefined;
	}
};
