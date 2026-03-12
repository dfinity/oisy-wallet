import type { TokenUi } from '$lib/types/token-ui';
import { tokenUiListEqual } from '$lib/utils/tokens-ui.utils';

describe('tokens-ui.utils', () => {
	describe('tokenUiListEqual', () => {
		it('should return true for two empty arrays', () => {
			expect(tokenUiListEqual([], [])).toBeTruthy();
		});

		it('should return true for arrays with the same id, balance and usdBalance', () => {
			const idA = Symbol('a');
			const idB = Symbol('b');

			const left = [
				{ id: idA, balance: 100n, usdBalance: 5 },
				{ id: idB, balance: 200n, usdBalance: 10 }
			] as unknown as TokenUi[];
			const right = [
				{ id: idA, balance: 100n, usdBalance: 5 },
				{ id: idB, balance: 200n, usdBalance: 10 }
			] as unknown as TokenUi[];

			expect(tokenUiListEqual(left, right)).toBeTruthy();
		});

		it('should return true for identical object references', () => {
			const first = { id: Symbol('a'), balance: 100n, usdBalance: 5 } as unknown as TokenUi;
			const second = { id: Symbol('b'), balance: 200n, usdBalance: 10 } as unknown as TokenUi;

			expect(tokenUiListEqual([first, second], [first, second])).toBeTruthy();
		});

		it('should return true when non-compared fields differ', () => {
			const idA = Symbol('a');

			const left = [
				{ id: idA, balance: 100n, usdBalance: 5, usdPrice: 1.5 }
			] as unknown as TokenUi[];
			const right = [
				{ id: idA, balance: 100n, usdBalance: 5, usdPrice: 999 }
			] as unknown as TokenUi[];

			expect(tokenUiListEqual(left, right)).toBeTruthy();
		});

		it('should return false when array lengths differ', () => {
			const idA = Symbol('a');
			const idB = Symbol('b');

			const a = [{ id: idA, balance: 100n, usdBalance: 5 }] as unknown as TokenUi[];
			const b = [
				{ id: idA, balance: 100n, usdBalance: 5 },
				{ id: idB, balance: 200n, usdBalance: 10 }
			] as unknown as TokenUi[];

			expect(tokenUiListEqual(a, b)).toBeFalsy();
			expect(tokenUiListEqual(b, a)).toBeFalsy();
		});

		it('should return false when one array is empty and the other is not', () => {
			const token = [{ id: Symbol('a'), balance: 100n, usdBalance: 5 }] as unknown as TokenUi[];

			expect(tokenUiListEqual([], token)).toBeFalsy();
			expect(tokenUiListEqual(token, [])).toBeFalsy();
		});

		it('should return false when ids differ', () => {
			const left = [{ id: Symbol('a'), balance: 100n, usdBalance: 5 }] as unknown as TokenUi[];
			const right = [{ id: Symbol('b'), balance: 100n, usdBalance: 5 }] as unknown as TokenUi[];

			expect(tokenUiListEqual(left, right)).toBeFalsy();
		});

		it('should return false when balances differ', () => {
			const idA = Symbol('a');

			const left = [{ id: idA, balance: 100n, usdBalance: 5 }] as unknown as TokenUi[];
			const right = [{ id: idA, balance: 999n, usdBalance: 5 }] as unknown as TokenUi[];

			expect(tokenUiListEqual(left, right)).toBeFalsy();
		});

		it('should return false when usdBalances differ', () => {
			const idA = Symbol('a');

			const left = [{ id: idA, balance: 100n, usdBalance: 5 }] as unknown as TokenUi[];
			const right = [{ id: idA, balance: 100n, usdBalance: 999 }] as unknown as TokenUi[];

			expect(tokenUiListEqual(left, right)).toBeFalsy();
		});

		it('should return false when ids are in a different order', () => {
			const idA = Symbol('a');
			const idB = Symbol('b');

			const left = [
				{ id: idA, balance: 100n, usdBalance: 5 },
				{ id: idB, balance: 200n, usdBalance: 10 }
			] as unknown as TokenUi[];
			const right = [
				{ id: idB, balance: 200n, usdBalance: 10 },
				{ id: idA, balance: 100n, usdBalance: 5 }
			] as unknown as TokenUi[];

			expect(tokenUiListEqual(left, right)).toBeFalsy();
		});

		it('should handle undefined balance equally on both sides', () => {
			const idA = Symbol('a');

			const left = [{ id: idA, usdBalance: 5 }] as unknown as TokenUi[];
			const right = [{ id: idA, usdBalance: 5 }] as unknown as TokenUi[];

			expect(tokenUiListEqual(left, right)).toBeTruthy();
		});

		it('should handle undefined usdBalance equally on both sides', () => {
			const idA = Symbol('a');

			const left = [{ id: idA, balance: 100n }] as unknown as TokenUi[];
			const right = [{ id: idA, balance: 100n }] as unknown as TokenUi[];

			expect(tokenUiListEqual(left, right)).toBeTruthy();
		});

		it('should return false when balance is defined on one side but undefined on the other', () => {
			const idA = Symbol('a');

			const left = [{ id: idA, balance: 100n, usdBalance: 5 }] as unknown as TokenUi[];
			const right = [{ id: idA, usdBalance: 5 }] as unknown as TokenUi[];

			expect(tokenUiListEqual(left, right)).toBeFalsy();
		});

		it('should return false when usdBalance is defined on one side but undefined on the other', () => {
			const idA = Symbol('a');

			const left = [{ id: idA, balance: 100n, usdBalance: 5 }] as unknown as TokenUi[];
			const right = [{ id: idA, balance: 100n }] as unknown as TokenUi[];

			expect(tokenUiListEqual(left, right)).toBeFalsy();
		});

		it('should return true for longer arrays with matching id, balance and usdBalance', () => {
			const ids = [Symbol('a'), Symbol('b'), Symbol('c'), Symbol('d'), Symbol('e')];

			const left = ids.map((id, i) => ({
				id,
				balance: BigInt(i * 100),
				usdBalance: i * 10
			})) as unknown as TokenUi[];
			const right = ids.map((id, i) => ({
				id,
				balance: BigInt(i * 100),
				usdBalance: i * 10
			})) as unknown as TokenUi[];

			expect(tokenUiListEqual(left, right)).toBeTruthy();
		});

		it('should return false for longer arrays when a single balance differs', () => {
			const ids = [Symbol('a'), Symbol('b'), Symbol('c'), Symbol('d')];

			const left = ids.map((id, i) => ({
				id,
				balance: BigInt(i * 100),
				usdBalance: i * 10
			})) as unknown as TokenUi[];
			const right = ids.map((id, i) => ({
				id,
				balance: i === 2 ? 999n : BigInt(i * 100),
				usdBalance: i * 10
			})) as unknown as TokenUi[];

			expect(tokenUiListEqual(left, right)).toBeFalsy();
		});
	});
});
