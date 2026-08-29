import { readRustNumericConstant } from '$tests/utils/rust-constants.test-utils';

describe('readRustNumericConstant', () => {
	const path = 'src/shared/src/types/user_transaction.rs';

	it('should read a plain literal', () => {
		expect(readRustNumericConstant({ path, name: 'MAX_SAVE_USER_TRANSACTIONS_BATCH' })).toBe(500);
	});

	it('should read a literal written with underscore separators', () => {
		expect(readRustNumericConstant({ path, name: 'MAX_USER_TRANSACTIONS_PER_TOKEN' })).toBe(10_000);
	});

	// `MAX_USER_TRANSACTION_DATA_LEN` is declared as `16 * 1024`, so a literal-only reader would
	// have missed it entirely.
	it('should fold a product of literals', () => {
		expect(readRustNumericConstant({ path, name: 'MAX_USER_TRANSACTION_DATA_LEN' })).toBe(16384);
	});

	it('should fold a long product without losing precision', () => {
		expect(
			readRustNumericConstant({
				path: 'src/shared/src/types/personal_note_share.rs',
				name: 'MAX_PERSONAL_NOTE_SHARE_EXPIRY_NS'
			})
		).toBe(30 * 24 * 60 * 60 * 1_000_000_000);
	});

	// Anything that is not integer literals joined by `*` and `+` has to fail loudly rather than be
	// coerced into a number that silently differs from what the canister compiled.
	it('should refuse a constant it cannot fold', () => {
		expect(() =>
			readRustNumericConstant({
				path: 'src/shared/src/types/bitcoin.rs',
				name: 'FEE_PERCENTILES_INITIAL_DELAY'
			})
		).toThrow(/cannot read/);
	});

	it('should throw for a constant that does not exist', () => {
		expect(() => readRustNumericConstant({ path, name: 'MAX_NOT_A_REAL_CONSTANT' })).toThrow(
			/not found/
		);
	});

	it('should throw for a file that does not exist', () => {
		expect(() =>
			readRustNumericConstant({ path: 'src/shared/src/types/nope.rs', name: 'ANYTHING' })
		).toThrow();
	});
});
