import {
	MAX_SAVE_USER_TRANSACTIONS_BATCH,
	MAX_USER_TRANSACTIONS_PER_TOKEN
} from '$lib/constants/user-transactions.constants';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * These constants mirror the canister's, and unlike the other mirrored limits in the codebase the
 * backend rejection is not a usable safety net here: the canister refuses an over-sized batch
 * outright rather than truncating it, so a frontend value above the real cap makes every save fail
 * silently. Drift has to break the build rather than the cache.
 */
describe('user-transactions.constants', () => {
	const source = readFileSync(
		join(process.cwd(), 'src/shared/src/types/user_transaction.rs'),
		'utf-8'
	);

	const rustConstant = (name: string): number => {
		const match = source.match(new RegExp(`pub const ${name}:\\s*\\w+\\s*=\\s*([0-9_]+)`));

		expect(match, `${name} not found in user_transaction.rs`).not.toBeNull();

		return Number(match?.[1].replaceAll('_', ''));
	};

	it('should match the canister save batch cap', () => {
		expect(MAX_SAVE_USER_TRANSACTIONS_BATCH).toBe(rustConstant('MAX_SAVE_USER_TRANSACTIONS_BATCH'));
	});

	it('should match the canister per-token storage cap', () => {
		expect(MAX_USER_TRANSACTIONS_PER_TOKEN).toBe(rustConstant('MAX_USER_TRANSACTIONS_PER_TOKEN'));
	});
});
