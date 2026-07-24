import { ProgressStepsSendXrp } from '$lib/enums/progress-steps';
import { retryWithDelay } from '$lib/services/rest.services';
import type { NullishIdentity } from '$lib/types/identity';
import {
	isXrpTransactionValidated,
	loadXrpAccountInfo,
	loadXrpLedgerIndex,
	loadXrpOpenLedgerFee,
	submitXrpTransaction
} from '$xrp/api/xrpl.api';
import {
	XRP_DEFAULT_FEE_DROPS,
	XRP_LAST_LEDGER_SEQUENCE_OFFSET
} from '$xrp/constants/xrp.constants';
import { getXrpSigningPublicKey, signXrpTransaction } from '$xrp/services/xrp-sign.services';
import type { XrpAddress } from '$xrp/types/address';
import type { XrpNetworkType } from '$xrp/types/network';
import type { XrpBalance } from '$xrp/types/xrp-balance';
import type { XrpSubmitResult } from '$xrp/types/xrp-transaction';
import { buildXrpPayment } from '$xrp/utils/xrp-transaction.utils';
import { assertNonNullish } from '@dfinity/utils';

/**
 * Sends native XRP: fetches the account sequence, the open-ledger fee and the current
 * ledger index, builds and threshold-signs a Payment, submits it, and waits for the
 * transaction to be included in a validated ledger.
 *
 * `amount` is in drops. The caller is responsible for having already reserved the
 * account base reserve out of the max amount (see `getXrpMaxAmount`).
 */
export const sendXrp = async ({
	identity,
	network,
	source,
	destination,
	amount,
	destinationTag,
	progress
}: {
	identity: NullishIdentity;
	network: XrpNetworkType;
	source: XrpAddress;
	destination: XrpAddress;
	amount: XrpBalance;
	destinationTag?: number;
	progress?: (step: ProgressStepsSendXrp) => void;
}): Promise<XrpSubmitResult> => {
	progress?.(ProgressStepsSendXrp.INITIALIZATION);

	const [{ sequence }, fee, ledgerIndex, signingPublicKey] = await Promise.all([
		loadXrpAccountInfo({ address: source, network }),
		loadXrpOpenLedgerFee({ network, fallbackFee: XRP_DEFAULT_FEE_DROPS }),
		loadXrpLedgerIndex({ network }),
		getXrpSigningPublicKey({ identity, network })
	]);

	const transaction = buildXrpPayment({
		account: source,
		destination,
		amount,
		fee,
		sequence,
		signingPublicKey,
		destinationTag,
		lastLedgerSequence: ledgerIndex + XRP_LAST_LEDGER_SEQUENCE_OFFSET
	});

	progress?.(ProgressStepsSendXrp.SIGN);
	const txBlob = await signXrpTransaction({ identity, network, transaction });

	progress?.(ProgressStepsSendXrp.SEND);
	const result = await submitXrpTransaction({ txBlob, network });

	if (!result.accepted) {
		throw new Error(
			`XRP transaction rejected: ${result.engineResult}${
				result.engineResultMessage ? ` (${result.engineResultMessage})` : ''
			}`
		);
	}

	progress?.(ProgressStepsSendXrp.CONFIRM);
	const { txHash } = result;
	assertNonNullish(txHash, 'XRP submit response did not include a transaction hash.');

	await retryWithDelay({
		request: async () => {
			const validated = await isXrpTransactionValidated({ hash: txHash, network });

			if (!validated) {
				throw new Error('XRP transaction not yet validated');
			}
		},
		maxRetries: 10
	});

	progress?.(ProgressStepsSendXrp.DONE);

	return result;
};
