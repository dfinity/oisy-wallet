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

		it('should not add an entry for a token that never failed', () => {
			icTransactionsStatusStore.succeed(tokenId);

			expect(get(icTransactionsStatusStore)).toStrictEqual({});
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
});
