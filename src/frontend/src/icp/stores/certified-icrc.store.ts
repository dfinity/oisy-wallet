import type { IcToken } from '$icp/types/ic-token';
import type { CanisterIdText } from '$lib/types/canister';
import type { CertifiedData } from '$lib/types/store';
import type { Nullish } from '@dfinity/zod-schemas';
import { writable, type Readable } from 'svelte/store';

export type CertifiedIcrcTokensData<T extends IcToken> = Nullish<CertifiedData<T>[]>;

export interface CertifiedIcrcTokensStore<T extends IcToken> extends Readable<
	CertifiedIcrcTokensData<T>
> {
	set: (token: CertifiedData<T>) => void;
	batchSet: (token: CertifiedData<T>) => void;
	setAll: (tokens: CertifiedData<T>[]) => void;
	reset: (ledgerCanisterId: CanisterIdText) => void;
	resetAll: () => void;
}

const scheduleFlush =
	typeof requestAnimationFrame === 'function'
		? (fn: () => void) => requestAnimationFrame(() => fn())
		: (fn: () => void) => queueMicrotask(fn);

export const initCertifiedIcrcTokensStore = <T extends IcToken>(): CertifiedIcrcTokensStore<T> => {
	const { subscribe, update, set } = writable<CertifiedIcrcTokensData<T>>(undefined);

	const updateToken = ({
		state,
		token: { data, certified }
	}: {
		state: CertifiedIcrcTokensData<T>;
		token: CertifiedData<T>;
	}) => ({
		certified,
		data: {
			...data,
			// We are using Symbols as key IDs for the ETH and ICP tokens, which is ideal for our use case due to their uniqueness. This ensures that even if two coins fetched dynamically have the same symbol or name, they will be used correctly.
			// However, this approach presents a challenge with ICRC tokens, which need to be loaded twice - once with a query and once with an update. When they are loaded the second time, the existing Symbol should be reused to ensure they are identified as the same token.
			id:
				(state ?? []).find(
					({ data: { ledgerCanisterId } }) => ledgerCanisterId === data.ledgerCanisterId
				)?.data.id ?? data.id
		}
	});

	let pending: CertifiedData<T>[] = [];
	let scheduled = false;

	const flushBatch = () => {
		const batch = pending;
		pending = [];
		scheduled = false;

		if (batch.length === 0) {
			return;
		}

		update((state) => {
			const batchCanisterIds = new Set(
				batch.map(({ data: { ledgerCanisterId } }) => ledgerCanisterId)
			);
			const filtered = (state ?? []).filter(
				({ data: { ledgerCanisterId } }) => !batchCanisterIds.has(ledgerCanisterId)
			);
			return [...filtered, ...batch.map((token) => updateToken({ state, token }))];
		});
	};

	return {
		set: ({ data, ...rest }: CertifiedData<T>) =>
			update((state) => [
				...(state ?? []).filter(
					({ data: { ledgerCanisterId } }) => ledgerCanisterId !== data.ledgerCanisterId
				),
				updateToken({ state, token: { data, ...rest } })
			]),
		batchSet: (token: CertifiedData<T>) => {
			pending.push(token);
			if (!scheduled) {
				scheduled = true;
				scheduleFlush(flushBatch);
			}
		},
		setAll: (tokens: CertifiedData<T>[]) =>
			update((state) => [
				...(state ?? []).filter(
					({ data: { ledgerCanisterId } }) =>
						!tokens
							.map(({ data: { ledgerCanisterId } }) => ledgerCanisterId)
							.includes(ledgerCanisterId)
				),
				...tokens.map((token) => updateToken({ state, token }))
			]),
		reset: (ledgerCanisterId: CanisterIdText) => {
			pending = pending.filter(({ data }) => data.ledgerCanisterId !== ledgerCanisterId);
			update((state) => [
				...(state ?? []).filter(({ data: { ledgerCanisterId: id } }) => id !== ledgerCanisterId)
			]);
		},
		resetAll: () => {
			pending = [];
			scheduled = false;
			set(null);
		},
		subscribe
	};
};
