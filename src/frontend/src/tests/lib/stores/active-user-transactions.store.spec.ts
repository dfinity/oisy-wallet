import type { ActiveUserTransaction } from '$declarations/backend/backend.did';
import { activeUserTransactionsStore } from '$lib/stores/active-user-transactions.store';
import { mockActiveUserTransaction } from '$tests/mocks/active-user-transactions.mock';
import { mockPrincipal, mockPrincipal2 } from '$tests/mocks/identity.mock';
import { get } from 'svelte/store';

const buildTx = (overrides: Partial<ActiveUserTransaction>): ActiveUserTransaction => ({
	...mockActiveUserTransaction,
	...overrides
});

const pending = ({ id, updatedAtNs }: { id: string; updatedAtNs: bigint }): ActiveUserTransaction =>
	buildTx({ id, status: { Pending: null }, updated_at_ns: updatedAtNs });

describe('active-user-transactions.store', () => {
	beforeEach(() => {
		activeUserTransactionsStore.reset();
		localStorage.clear();
	});

	it('is undefined before init', () => {
		expect(get(activeUserTransactionsStore)).toBeUndefined();
	});

	it('init primes empty state', () => {
		activeUserTransactionsStore.init(mockPrincipal);

		expect(get(activeUserTransactionsStore)).toEqual({
			data: {},
			lastSeenUpdatedAtNs: {},
			terminalSideEffectsApplied: {}
		});
	});

	it('init is a no-op when called twice with the same principal', () => {
		activeUserTransactionsStore.init(mockPrincipal);
		activeUserTransactionsStore.upsert({
			transaction: pending({ id: 'a', updatedAtNs: 1n })
		});
		const before = get(activeUserTransactionsStore);

		activeUserTransactionsStore.init(mockPrincipal);

		expect(get(activeUserTransactionsStore)).toBe(before);
	});

	it('init re-initializes when called with a different principal', () => {
		activeUserTransactionsStore.init(mockPrincipal);
		activeUserTransactionsStore.upsert({
			transaction: pending({ id: 'a', updatedAtNs: 1n })
		});

		activeUserTransactionsStore.init(mockPrincipal2);

		expect(get(activeUserTransactionsStore)?.data).toEqual({});
	});

	it('set replaces the data map', () => {
		activeUserTransactionsStore.init(mockPrincipal);
		activeUserTransactionsStore.set({
			transactions: [pending({ id: 'a', updatedAtNs: 1n }), pending({ id: 'b', updatedAtNs: 2n })]
		});

		expect(Object.keys(get(activeUserTransactionsStore)?.data ?? {}).sort()).toEqual(['a', 'b']);
	});

	it('drops set writes scoped to a previous principal', () => {
		activeUserTransactionsStore.init(mockPrincipal);
		activeUserTransactionsStore.init(mockPrincipal2);
		activeUserTransactionsStore.set({
			principal: mockPrincipal,
			transactions: [pending({ id: 'a', updatedAtNs: 1n })]
		});

		expect(get(activeUserTransactionsStore)?.data).toEqual({});
	});

	it('upsert adds a new row and updates an existing one', () => {
		activeUserTransactionsStore.init(mockPrincipal);
		activeUserTransactionsStore.upsert({
			transaction: pending({ id: 'a', updatedAtNs: 1n })
		});
		activeUserTransactionsStore.upsert({
			transaction: pending({ id: 'a', updatedAtNs: 5n })
		});
		activeUserTransactionsStore.upsert({
			transaction: pending({ id: 'b', updatedAtNs: 2n })
		});

		const data = get(activeUserTransactionsStore)?.data ?? {};

		expect(data.a?.updated_at_ns).toBe(5n);
		expect(Object.keys(data).sort()).toEqual(['a', 'b']);
	});

	it('remove drops the row and its seen-state entry', () => {
		activeUserTransactionsStore.init(mockPrincipal);
		activeUserTransactionsStore.upsert({
			transaction: pending({ id: 'a', updatedAtNs: 1n })
		});
		activeUserTransactionsStore.markAllSeen();

		activeUserTransactionsStore.remove({ id: 'a' });

		const current = get(activeUserTransactionsStore);

		expect(current?.data).toEqual({});
		expect(current?.lastSeenUpdatedAtNs).toEqual({});
	});

	it('markAllSeen records updated_at_ns for every current row', () => {
		activeUserTransactionsStore.init(mockPrincipal);
		activeUserTransactionsStore.upsert({
			transaction: pending({ id: 'a', updatedAtNs: 5n })
		});
		activeUserTransactionsStore.upsert({
			transaction: pending({ id: 'b', updatedAtNs: 7n })
		});

		activeUserTransactionsStore.markAllSeen();

		expect(get(activeUserTransactionsStore)?.lastSeenUpdatedAtNs).toEqual({ a: '5', b: '7' });
	});

	it('markAllSeen on no rows is a no-op (no persisted change)', () => {
		activeUserTransactionsStore.init(mockPrincipal);
		const before = get(activeUserTransactionsStore);
		activeUserTransactionsStore.markAllSeen();

		expect(get(activeUserTransactionsStore)).toBe(before);
	});

	it('persists last-seen state across reset+init for the same principal', () => {
		activeUserTransactionsStore.init(mockPrincipal);
		activeUserTransactionsStore.upsert({
			transaction: pending({ id: 'a', updatedAtNs: 5n })
		});
		activeUserTransactionsStore.markAllSeen();
		activeUserTransactionsStore.reset();

		activeUserTransactionsStore.init(mockPrincipal);

		expect(get(activeUserTransactionsStore)?.lastSeenUpdatedAtNs).toEqual({ a: '5' });
	});

	it('keeps per-principal persistence isolated', () => {
		activeUserTransactionsStore.init(mockPrincipal);
		activeUserTransactionsStore.upsert({
			transaction: pending({ id: 'a', updatedAtNs: 1n })
		});
		activeUserTransactionsStore.markAllSeen();
		activeUserTransactionsStore.reset();

		activeUserTransactionsStore.init(mockPrincipal2);

		expect(get(activeUserTransactionsStore)?.lastSeenUpdatedAtNs).toEqual({});
	});

	it('upsert drops writes with an older updated_at_ns than the stored row', () => {
		activeUserTransactionsStore.init(mockPrincipal);

		activeUserTransactionsStore.upsert({
			transaction: pending({ id: 'a', updatedAtNs: 5n })
		});
		activeUserTransactionsStore.upsert({
			transaction: pending({ id: 'a', updatedAtNs: 3n })
		});

		expect(get(activeUserTransactionsStore)?.data.a?.updated_at_ns).toBe(5n);
	});

	it('drops upserts scoped to a previous principal', () => {
		activeUserTransactionsStore.init(mockPrincipal);
		activeUserTransactionsStore.init(mockPrincipal2);
		activeUserTransactionsStore.upsert({
			principal: mockPrincipal,
			transaction: pending({ id: 'a', updatedAtNs: 1n })
		});

		expect(get(activeUserTransactionsStore)?.data).toEqual({});
	});

	it('upsert applies writes with an equal updated_at_ns (idempotent)', () => {
		activeUserTransactionsStore.init(mockPrincipal);

		const tx = pending({ id: 'a', updatedAtNs: 5n });
		activeUserTransactionsStore.upsert({ transaction: tx });
		activeUserTransactionsStore.upsert({ transaction: tx });

		expect(get(activeUserTransactionsStore)?.data.a?.updated_at_ns).toBe(5n);
	});

	it('drops removes scoped to a previous principal', () => {
		activeUserTransactionsStore.init(mockPrincipal2);
		activeUserTransactionsStore.upsert({
			transaction: pending({ id: 'b', updatedAtNs: 1n })
		});

		activeUserTransactionsStore.remove({ principal: mockPrincipal, id: 'b' });

		expect(get(activeUserTransactionsStore)?.data.b).toBeDefined();
	});

	describe('writes after reset', () => {
		// After `reset()`, the store has no current identity loaded. Late writes
		// from a previous session must be dropped silently rather than resurrect
		// state.
		it('set is dropped silently after reset', () => {
			activeUserTransactionsStore.init(mockPrincipal);
			activeUserTransactionsStore.reset();

			activeUserTransactionsStore.set({
				transactions: [pending({ id: 'a', updatedAtNs: 1n })]
			});

			expect(get(activeUserTransactionsStore)).toBeUndefined();
		});

		it('upsert is dropped silently after reset', () => {
			activeUserTransactionsStore.init(mockPrincipal);
			activeUserTransactionsStore.reset();

			activeUserTransactionsStore.upsert({
				transaction: pending({ id: 'a', updatedAtNs: 1n })
			});

			expect(get(activeUserTransactionsStore)).toBeUndefined();
		});

		it('remove is dropped silently after reset', () => {
			activeUserTransactionsStore.init(mockPrincipal);
			activeUserTransactionsStore.upsert({
				transaction: pending({ id: 'a', updatedAtNs: 1n })
			});
			activeUserTransactionsStore.reset();

			activeUserTransactionsStore.remove({ id: 'a' });

			expect(get(activeUserTransactionsStore)).toBeUndefined();
		});
	});
});
