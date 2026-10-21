import { isTokenErc } from '$eth/utils/erc.utils';
import {
	PLAUSIBLE_EVENT_ERROR_SEVERITIES,
	PLAUSIBLE_EVENT_EVENTS_KEYS,
	PLAUSIBLE_EVENT_RESULT_STATUSES,
	PLAUSIBLE_EVENT_SEVERITIES,
	PLAUSIBLE_EVENT_TRANSACTION_SEND_ERROR_TYPES,
	PLAUSIBLE_EVENTS,
	type PLAUSIBLE_EVENT_CONTEXTS
} from '$lib/enums/plausible';
import { trackEvent } from '$lib/services/analytics.services';
import type { Token } from '$lib/types/token';
import { nonNullish } from '@dfinity/utils';

export type EthTransactionSendContext =
	| PLAUSIBLE_EVENT_CONTEXTS.SEND
	| PLAUSIBLE_EVENT_CONTEXTS.CONVERT
	| PLAUSIBLE_EVENT_CONTEXTS.AI_ASSISTANT;

// The one out-of-gas answer whose wording is known, Base's: a gas figure and nothing else. Any other
// wording is a node's free text, which no scrub can bound, so it is not tracked.
const GAS_ONLY_ANSWER_PATTERN = /^out of gas: gas required exceeds: \d+$/;

/**
 * A transaction the node refused, or mined and reverted, because it ran out of the gas it was
 * signed with. An error: the send visibly failed, and a mined one still cost its fee.
 *
 * The two gas figures show how far the estimate fell short, per token and network. The node's
 * message is kept only in the wording known to carry a gas figure alone, and never the error ethers
 * wraps around it: that one embeds the signed transaction, which names the wallet, the recipient
 * and the amount.
 */
export const trackEthTransactionSendOutOfGas = ({
	context,
	token,
	gasSent,
	gasNeeded,
	errorCode,
	nodeMessage
}: {
	context: EthTransactionSendContext;
	token: Token;
	gasSent?: bigint;
	gasNeeded?: bigint;
	errorCode: number;
	nodeMessage: string;
}) => {
	trackEvent({
		name: PLAUSIBLE_EVENTS.TRANSACTION_SEND,
		metadata: {
			event_context: context,
			event_severity: PLAUSIBLE_EVENT_SEVERITIES.ERROR,
			...(nonNullish(gasSent) && {
				event_key: PLAUSIBLE_EVENT_EVENTS_KEYS.GAS_SENT,
				event_value: `${gasSent}`
			}),
			...(nonNullish(gasNeeded) && {
				event_key2: PLAUSIBLE_EVENT_EVENTS_KEYS.GAS_NEEDED,
				event_value2: `${gasNeeded}`
			}),
			token_network: token.network.name,
			token_standard: token.standard.code,
			token_symbol: token.symbol,
			...(isTokenErc(token) && { token_address: token.address }),
			result_status: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
			result_error_severity: PLAUSIBLE_EVENT_ERROR_SEVERITIES.MAJOR,
			result_error_type: PLAUSIBLE_EVENT_TRANSACTION_SEND_ERROR_TYPES.OUT_OF_GAS,
			result_error_code: `${errorCode}`,
			...(GAS_ONLY_ANSWER_PATTERN.test(nodeMessage) && { result_error_text: nodeMessage })
		}
	});
};
