import { trackEvent } from '$lib/services/analytics.services';
import { trackWalletConnectUncheckedSigning } from '$lib/services/wallet-connect-analytics.services';

vi.mock('$lib/services/analytics.services', () => ({
	trackEvent: vi.fn()
}));

describe('wallet-connect-analytics.services', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('trackWalletConnectUncheckedSigning', () => {
		it('tracks the switch turned on from the Settings page', () => {
			trackWalletConnectUncheckedSigning({ modifier: 'enable' });

			expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
				name: 'wallet_connect_unchecked_signing',
				metadata: {
					event_context: 'wallet_connect',
					event_modifier: 'enable',
					source_location: 'settings_page',
					result_status: 'success'
				}
			});
		});

		it('tracks a request signed past its refusals, with the network and the reasons only', () => {
			trackWalletConnectUncheckedSigning({
				modifier: 'sign',
				network: 'SOL',
				reasons: ['close_pays_others', 'cannot_be_shown']
			});

			expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
				name: 'wallet_connect_unchecked_signing',
				metadata: {
					event_context: 'wallet_connect',
					event_modifier: 'sign',
					event_key: 'reason',
					event_value: 'close_pays_others,cannot_be_shown',
					token_network: 'SOL',
					result_status: 'success'
				}
			});
		});
	});
});
