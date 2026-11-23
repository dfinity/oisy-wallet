import { RELAY_API_URL } from '$env/rest/relay.env';
import { RELAY_STATUS_TIMEOUT_MS } from '$lib/constants/swap.constants';

export interface RelayIntentStatus {
	// `waiting` for a quote Relay issued and has seen no deposit for yet; `unknown` for a request id it
	// never issued.
	status: string;
}

/**
 * Relay's status of the request a quote opened, keyless. `/intents/status/v3`, which outlives the
 * `/requests/v2` retirement of 2026-11-24.
 *
 * https://docs.relay.link/references/api/get-intents-status-v3
 */
export const fetchRelayIntentStatus = async ({
	requestId
}: {
	requestId: string;
}): Promise<RelayIntentStatus> => {
	const response = await fetch(
		`${RELAY_API_URL}/intents/status/v3?${new URLSearchParams({ requestId }).toString()}`,
		{ signal: AbortSignal.timeout(RELAY_STATUS_TIMEOUT_MS) }
	);

	if (!response.ok) {
		throw new Error(`Relay status lookup failed: ${response.status}`);
	}

	return await response.json();
};
