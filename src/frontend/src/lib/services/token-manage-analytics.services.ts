import {
	PLAUSIBLE_EVENTS,
	type PLAUSIBLE_EVENT_RESULT_STATUSES,
	type PLAUSIBLE_EVENT_SOURCE_LOCATIONS
} from '$lib/enums/plausible';
import { trackEvent } from '$lib/services/analytics.services';
import { nonNullish } from '@dfinity/utils';

export type TokenManageEventModifier = 'import' | 'delete' | 'enable' | 'disable' | 'edit';

export type TokenManageEventKey = 'index_canister';

export type TokenManageSourceLocation =
	PLAUSIBLE_EVENT_SOURCE_LOCATIONS.MANAGE_TOKENS | PLAUSIBLE_EVENT_SOURCE_LOCATIONS.TOKEN_DETAILS;

export interface TokenManageEventToken {
	network: string;
	address: string;
	standard?: string;
	symbol?: string;
	name?: string;
}

export interface TrackTokenManageParams {
	modifier: TokenManageEventModifier;
	token: TokenManageEventToken;
	sourceLocation: TokenManageSourceLocation;
	resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES;
	key?: TokenManageEventKey;
	value?: string;
	error?: string;
	errorCode?: string;
}

export const trackTokenManage = ({
	modifier,
	key,
	value,
	token,
	sourceLocation,
	resultStatus,
	error,
	errorCode
}: TrackTokenManageParams) => {
	trackEvent({
		name: PLAUSIBLE_EVENTS.TOKEN_MANAGE,
		metadata: {
			event_modifier: modifier,
			...(nonNullish(key) && { event_key: key }),
			...(nonNullish(value) && { event_value: value }),
			token_network: token.network,
			token_address: token.address,
			...(nonNullish(token.standard) && { token_standard: token.standard }),
			...(nonNullish(token.symbol) && { token_symbol: token.symbol }),
			...(nonNullish(token.name) && { token_name: token.name }),
			source_location: sourceLocation,
			result_status: resultStatus,
			...(nonNullish(error) && { result_error: error }),
			...(nonNullish(errorCode) && { result_error_code: errorCode })
		}
	});
};
