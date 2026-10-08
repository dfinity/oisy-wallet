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

// Every hex value in a node's message: an address, a hash or signed data, each of which points to a
// wallet or a payment.
const HEX_VALUE_PATTERN = /0x[0-9a-f]+/gi;

/**
 * A transaction the node refused, or mined and reverted, because it ran out of the gas it was
 * signed with. An error: the send visibly failed, and a mined one still cost its fee.
 *
 * The two gas figures show how far the estimate fell short, per token and network. The node's
 * message is kept, every hex value in it replaced, and never the error ethers wraps around it: that
 * one embeds the signed transaction, which names the wallet, the recipient and the amount.
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
			result_error_text: nodeMessage.replace(HEX_VALUE_PATTERN, '0x…')
		}
	});
};
