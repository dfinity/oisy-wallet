import { SOLANA_DEVNET_NETWORK, SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
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
			'sends a transaction the RPC refused on $name with the code it was refused with, and nothing else',
			(network) => {
				trackSolUnreadableTransaction({
					network,
					reason: 'refused',
					errorCode: SOLANA_ERROR__JSON_RPC__SERVER_ERROR_UNSUPPORTED_TRANSACTION_VERSION
				});

				expect(track).toHaveBeenCalledExactlyOnceWith({
					name: 'transaction_load',
					metadata: {
						event_subcontext: 'single',
						event_severity: 'warn',
						token_network: network.name,
						result_status: 'error',
						result_error_severity: 'major',
						result_error_type: 'load_refused',
						result_error_code: '-32015'
					}
				});
			}
		);

		it('sends a transaction OISY failed to read without a code', () => {
			trackSolUnreadableTransaction({ network: SOLANA_MAINNET_NETWORK, reason: 'unparsable' });

			expect(track).toHaveBeenCalledExactlyOnceWith({
				name: 'transaction_load',
				metadata: {
					event_subcontext: 'single',
					event_severity: 'warn',
					token_network: SOLANA_MAINNET_NETWORK.name,
					result_status: 'error',
					result_error_severity: 'major',
					result_error_type: 'parse_failed'
				}
			});

			const [[{ metadata }]] = track.mock.calls;

			expect(metadata).not.toHaveProperty('result_error_code');
		});
	});
});
