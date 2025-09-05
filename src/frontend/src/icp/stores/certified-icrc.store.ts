import type { IcToken } from '$icp/types/ic-token';
import type { CanisterIdText } from '$lib/types/canister';
import type { CertifiedData } from '$lib/types/store';
import type { Option } from '$lib/types/utils';
import { writable, type Readable } from 'svelte/store';

export type CertifiedIcrcTokensData<T extends IcToken> = Option<CertifiedData<T>[]>;

export interface CertifiedIcrcTokensStore<T extends IcToken>
	extends Readable<CertifiedIcrcTokensData<T>> {
	set: (token: CertifiedData<T>) => void;
	setAll: (tokens: CertifiedData<T>[]) => void;
	reset: (ledgerCanisterId: CanisterIdText) => void;
	resetAll: () => void;
}

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

	return {
		set: ({ data, ...rest }: CertifiedData<T>) =>
			update((state) => [
				...(state ?? []).filter(
					({ data: { ledgerCanisterId } }) => ledgerCanisterId !== data.ledgerCanisterId
				),
				updateToken({ state, token: { data, ...rest } })
			]),
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
		reset: (ledgerCanisterId: CanisterIdText) =>
			update((state) => [
				...(state ?? []).filter(({ data: { ledgerCanisterId: id } }) => id !== ledgerCanisterId)
			]),
		resetAll: () => set(null),
		subscribe
	};
};
