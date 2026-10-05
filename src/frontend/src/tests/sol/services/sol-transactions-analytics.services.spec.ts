import { SOLANA_DEVNET_NETWORK, SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import { PLAUSIBLE_EVENTS } from '$lib/enums/plausible';
import * as analytics from '$lib/services/analytics.services';
import { trackSolUnreadableTransaction } from '$sol/services/sol-transactions-analytics.services';
import { SOLANA_ERROR__JSON_RPC__SERVER_ERROR_UNSUPPORTED_TRANSACTION_VERSION } from '@solana/kit';
import type { MockInstance } from 'vitest';

describe('sol-transactions-analytics.services', () => {
	describe('trackSolUnreadableTransaction', () => {
		let track: MockInstance;

		beforeEach(() => {
			vi.restoreAllMocks();
			track = vi.spyOn(analytics, 'trackEvent').mockImplementation(() => undefined);
		});

		it.each([SOLANA_MAINNET_NETWORK, SOLANA_DEVNET_NETWORK])(
			'sends the network $name and the error code as a warning, and nothing else',
			(network) => {
				trackSolUnreadableTransaction({
					network,
					errorCode: SOLANA_ERROR__JSON_RPC__SERVER_ERROR_UNSUPPORTED_TRANSACTION_VERSION
				});

				expect(track).toHaveBeenCalledExactlyOnceWith({
					name: PLAUSIBLE_EVENTS.LOAD_TRANSACTIONS,
					metadata: {
						event_context: 'transactions',
						event_subcontext: 'unreadable_skipped',
						event_severity: 'warn',
						token_network: network.name,
						result_status: 'error',
						result_error_code: '-32015'
					}
				});
			}
		);
	});
});
