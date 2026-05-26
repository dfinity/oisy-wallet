import {
	PLAUSIBLE_EVENT_RESULT_STATUSES,
	PLAUSIBLE_EVENT_SOURCE_LOCATIONS
} from '$lib/enums/plausible';
import { trackEvent } from '$lib/services/analytics.services';
import { trackTokenManage } from '$lib/services/token-manage-analytics.services';

vi.mock('$lib/services/analytics.services', () => ({
	trackEvent: vi.fn()
}));

describe('token-manage-analytics.services', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('trackTokenManage', () => {
		it('should track a token_manage success event with token metadata', () => {
			trackTokenManage({
				modifier: 'import',
				sourceLocation: PLAUSIBLE_EVENT_SOURCE_LOCATIONS.MANAGE_TOKENS,
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS,
				token: {
					network: 'ICP',
					address: 'ipchn-lqaaa-aaaam-qizkq-cai',
					symbol: 'CCC',
					name: 'CCC NFT Platform'
				}
			});

			expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
				name: 'token_manage',
				metadata: {
					event_modifier: 'import',
					token_network: 'ICP',
					token_address: 'ipchn-lqaaa-aaaam-qizkq-cai',
					token_symbol: 'CCC',
					token_name: 'CCC NFT Platform',
					source_location: 'manage_tokens',
					result_status: 'success'
				}
			});
		});

		it('should track edit-specific fields and errors when provided', () => {
			trackTokenManage({
				modifier: 'edit',
				key: 'index_canister',
				value: 'index-canister-id',
				sourceLocation: PLAUSIBLE_EVENT_SOURCE_LOCATIONS.TOKEN_DETAILS,
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
				error: 'Version mismatch',
				errorCode: 'version_mismatch',
				token: {
					network: 'ICP',
					address: 'ledger-canister-id'
				}
			});

			expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
				name: 'token_manage',
				metadata: {
					event_modifier: 'edit',
					event_key: 'index_canister',
					event_value: 'index-canister-id',
					token_network: 'ICP',
					token_address: 'ledger-canister-id',
					source_location: 'token_details',
					result_status: 'error',
					result_error: 'Version mismatch',
					result_error_code: 'version_mismatch'
				}
			});
		});
	});
});
