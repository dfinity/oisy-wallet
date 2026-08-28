import {
	MAX_SAVE_USER_TRANSACTIONS_BATCH,
	MAX_USER_TRANSACTIONS_PER_TOKEN
} from '$lib/constants/user-transactions.constants';
import { readRustNumericConstant } from '$tests/utils/rust-constants.test-utils';

/**
 * These constants mirror the canister's, and unlike the other mirrored limits in the codebase the
 * backend rejection is not a usable safety net here: the canister refuses an over-sized batch
 * outright rather than truncating it, so a frontend value above the real cap makes every save fail
 * silently. Drift has to break the build rather than the cache.
 */
describe('user-transactions.constants', () => {
	const path = 'src/shared/src/types/user_transaction.rs';

	it('should match the canister save batch cap', () => {
		expect(MAX_SAVE_USER_TRANSACTIONS_BATCH).toBe(
			readRustNumericConstant({ path, name: 'MAX_SAVE_USER_TRANSACTIONS_BATCH' })
		);
	});

	it('should match the canister per-token storage cap', () => {
		expect(MAX_USER_TRANSACTIONS_PER_TOKEN).toBe(
			readRustNumericConstant({ path, name: 'MAX_USER_TRANSACTIONS_PER_TOKEN' })
		);
	});
});
