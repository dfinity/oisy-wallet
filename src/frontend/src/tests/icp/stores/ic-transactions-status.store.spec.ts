import { icTransactionsStatusStore } from '$icp/stores/ic-transactions-status.store';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import { get } from 'svelte/store';

describe('ic-transactions-status.store', () => {
	const tokenId: TokenId = parseTokenId('test');
	const anotherTokenId: TokenId = parseTokenId('another-test');

	beforeEach(() => {
		icTransactionsStatusStore.reset();
	});

	it('should be empty initially', () => {
		expect(get(icTransactionsStatusStore)).toStrictEqual({});
	});

	describe('fail', () => {
		it('should start counting at one', () => {
			icTransactionsStatusStore.fail(tokenId);

			expect(get(icTransactionsStatusStore)[tokenId]).toBe(1);
		});

		it('should count consecutive failures', () => {
			Array.from({ length: 5 }).forEach(() => icTransactionsStatusStore.fail(tokenId));

			expect(get(icTransactionsStatusStore)[tokenId]).toBe(5);
		});

		it('should count each token separately', () => {
			icTransactionsStatusStore.fail(tokenId);
			icTransactionsStatusStore.fail(anotherTokenId);
			icTransactionsStatusStore.fail(anotherTokenId);

			expect(get(icTransactionsStatusStore)[tokenId]).toBe(1);
			expect(get(icTransactionsStatusStore)[anotherTokenId]).toBe(2);
		});
	});

	describe('succeed', () => {
		it('should clear the count of the token', () => {
			icTransactionsStatusStore.fail(tokenId);
			icTransactionsStatusStore.fail(tokenId);

			icTransactionsStatusStore.succeed(tokenId);

			expect(get(icTransactionsStatusStore)[tokenId]).toBe(0);
		});

		it('should not clear the count of the other tokens', () => {
			icTransactionsStatusStore.fail(tokenId);
			icTransactionsStatusStore.fail(anotherTokenId);

			icTransactionsStatusStore.succeed(tokenId);

			expect(get(icTransactionsStatusStore)[anotherTokenId]).toBe(1);
		});

		it('should record the successful check of a token that never failed', () => {
			// "Never checked" (no entry) and "checked and fine" (zero) have to read differently, so a
			// consumer can tell a recovery from a token the wallet has not reached yet.
			icTransactionsStatusStore.succeed(tokenId);

			expect(get(icTransactionsStatusStore)[tokenId]).toBe(0);
		});

		it('should not create an entry for the other tokens', () => {
			icTransactionsStatusStore.succeed(tokenId);

			expect(get(icTransactionsStatusStore)[anotherTokenId]).toBeUndefined();
		});

		it('should start counting from scratch after a success', () => {
			icTransactionsStatusStore.fail(tokenId);
			icTransactionsStatusStore.fail(tokenId);
			icTransactionsStatusStore.succeed(tokenId);

			icTransactionsStatusStore.fail(tokenId);

			expect(get(icTransactionsStatusStore)[tokenId]).toBe(1);
		});
	});

	describe('reset', () => {
		it('should clear every token', () => {
			icTransactionsStatusStore.fail(tokenId);
			icTransactionsStatusStore.fail(anotherTokenId);

			icTransactionsStatusStore.reset();

			expect(get(icTransactionsStatusStore)).toStrictEqual({});
		});
	});

	describe('notifications', () => {
		it('should not notify when a token already at zero succeeds again', () => {
			icTransactionsStatusStore.succeed(tokenId);

			const notified = vi.fn();
			const unsubscribe = icTransactionsStatusStore.subscribe(notified);

			// Every token reports success on every job, so this is the common path.
			icTransactionsStatusStore.succeed(tokenId);
			icTransactionsStatusStore.succeed(tokenId);

			// Only the subscription's own initial call.
			expect(notified).toHaveBeenCalledOnce();

			unsubscribe();
		});

		it('should notify when a token recovers from a failure', () => {
			icTransactionsStatusStore.fail(tokenId);

			const notified = vi.fn();
			const unsubscribe = icTransactionsStatusStore.subscribe(notified);

			icTransactionsStatusStore.succeed(tokenId);

			expect(notified).toHaveBeenCalledTimes(2);

			unsubscribe();
		});
	});
});
