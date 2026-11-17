import { btcAddressToOutputScript } from '$btc/utils/btc-psbt.utils';
import { fetchRelayIntentStatus } from '$lib/rest/relay.rest';
import type { LifiBtcPayoutBinding } from '$lib/services/lifi-btc-binding.services';
import type { LifiQuoteRejectedError } from '$lib/types/errors';
import { lifiBtcMemoText, lifiRejectedError } from '$lib/utils/lifi-swap.utils';
import { LifiRelayToolDataSchema } from '$lib/validation/lifi-relay.validation';
import { safeParse } from '$lib/validation/utils.validation';
import { isNullish } from '@dfinity/utils';
import { ChainId } from '@lifi/sdk';

// Relay's chain id for Solana; its EVM chain ids are the chains' own, as LI.FI's are.
const RELAY_SOLANA_CHAIN_ID = 792703809;

// What Relay answers for a request it opened and has seen no deposit for yet.
const RELAY_STATUS_WAITING = 'waiting';

const rejected = (reason: string): LifiQuoteRejectedError =>
	lifiRejectedError({ subject: 'quote', reason: `its Relay quote ${reason}` });

const isSameBytes = ({ actual, expected }: { actual: Uint8Array; expected: Uint8Array }): boolean =>
	actual.length === expected.length && actual.every((byte, index) => byte === expected[index]);

const depositoryScript = (address: string): Uint8Array | undefined => {
	try {
		return btcAddressToOutputScript({ address, network: 'mainnet' });
	} catch (_: unknown) {
		return undefined;
	}
};

/**
 * Relay's payout binding, best effort: Relay keeps no record of a quote's recipient or amounts that
 * OISY can read before the deposit (`requests/v2` finds nothing until it sees one). So this binds what
 * it can:
 *
 * - LI.FI's copy of Relay's quote (`estimate.toolData`) must name the order the memo carries, pay
 *   exactly output 0 to Relay's depository, and pay out the reviewed asset on the reviewed chain at
 *   least the displayed minimum. That catches a quote whose parts disagree.
 * - Relay must know the request that quote opened, and have seen no deposit for it yet
 *   (`/intents/status/v3`: `waiting`).
 *
 * Neither checks the recipient, and both trust LI.FI's answer: a response tampered with in transit,
 * or by LI.FI, could name a request of its own that pays someone else. Accepted on 2026-11-17, as
 * pending decision 1 records. A refusal or a failed lookup aborts the swap before signing.
 */
export const bindLifiRelayPayout: LifiBtcPayoutBinding = async ({
	quote,
	deposit,
	memo,
	request,
	displayedToAmountMin
}) => {
	// `toolData` is in LI.FI's answer, though the SDK's `Estimate` type leaves it out.
	const relay = safeParse({
		schema: LifiRelayToolDataSchema,
		value: (quote.estimate as { toolData?: unknown }).toolData
	});

	if (isNullish(relay)) {
		throw rejected('is missing or malformed');
	}

	const {
		steps: [{ requestId }],
		details: {
			currencyOut: { currency, minimumAmount }
		},
		protocol: {
			v2: { orderId, paymentDetails }
		}
	} = relay;

	// The memo is `0x<order id>`, then `=|lifi` and LI.FI's transaction id.
	const [memoOrderId] = lifiBtcMemoText(memo).split('=');

	if (memoOrderId?.toLowerCase() !== orderId.toLowerCase()) {
		throw rejected('names another order than the memo');
	}

	const depository = depositoryScript(paymentDetails.depository);

	if (
		isNullish(depository) ||
		!isSameBytes({ actual: depository, expected: deposit.script }) ||
		BigInt(paymentDetails.amount) !== deposit.value
	) {
		throw rejected('does not take the deposit');
	}

	const toSolana = request.toChain === ChainId.SOL;
	const toChain = toSolana ? RELAY_SOLANA_CHAIN_ID : Number(request.toChain);

	// A Solana mint is base58 and case-sensitive; an EVM address is hex in any case.
	const isReviewedToken = toSolana
		? currency.address === request.toToken
		: currency.address.toLowerCase() === request.toToken.toLowerCase();

	if (currency.chainId !== toChain || !isReviewedToken) {
		throw rejected('pays out another asset than the one reviewed');
	}

	if (BigInt(minimumAmount) < displayedToAmountMin) {
		throw rejected('pays out less than the displayed minimum');
	}

	const { status } = await fetchRelayIntentStatus({ requestId });

	if (status !== RELAY_STATUS_WAITING) {
		throw rejected(`is not one Relay awaits a deposit for (${status})`);
	}
};
