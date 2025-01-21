import type { CertifiedData } from '$lib/types/store';
import type { TokenId } from '$lib/types/token';
import type { Option } from '$lib/types/utils';
import type { SplTokenAddress } from '$sol/types/spl';
import type { SplUserToken } from '$sol/types/spl-user-token';
import type { PrincipalText } from '@dfinity/zod-schemas';
import { writable, type Readable } from 'svelte/store';

export type CertifiedSplUserTokensData = Option<CertifiedData<SplUserToken>[]>;

export interface CertifiedSplUserTokensStore extends Readable<CertifiedSplUserTokensData> {
	setAll: (tokens: CertifiedData<SplUserToken>[]) => void;
	reset: (tokenId: TokenId) => void;
	resetAll: () => void;
}

export const initCertifiedSplUserTokensStore = (): CertifiedSplUserTokensStore => {
	const { subscribe, update, set } = writable<CertifiedSplUserTokensData>(undefined);

	return {
		setAll: (tokens: CertifiedData<SplUserToken>[]) =>
			update((state) => [
				...(state ?? []).filter(
					({ data: { address } }) =>
						!tokens.map(({ data: { address } }) => address).includes(address)
				),
				...tokens.map(({ data, certified }) => ({
					certified,
					data: {
						...data,
						id:
							(state ?? []).find(({ data: { address } }) => address === data.address)?.data.id ??
							data.id
					}
				}))
			]),
		reset: (tokenId: TokenId) =>
			update((state) => [...(state ?? []).filter(({ data: { id } }) => id !== tokenId)]),
		resetAll: () => set(null),
		subscribe
	};
};

export const SPL_USER_TOKENS_KEY = 'spl-user-tokens';

export type SplAddressMap = Record<PrincipalText, SplTokenAddress[]>;

export const splUserTokensStore = initCertifiedSplUserTokensStore();
