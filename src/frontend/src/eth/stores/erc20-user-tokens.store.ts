import type { Erc20UserToken } from '$eth/types/erc20-user-token';
import type { CertifiedData } from '$lib/types/store';
import type { TokenId } from '$lib/types/token';
import { writable, type Readable } from 'svelte/store';

export type CertifiedErc20UserTokensData = CertifiedData<Erc20UserToken>[] | undefined | null;

export interface CertifiedErc20UserTokensStore extends Readable<CertifiedErc20UserTokensData> {
	setAll: (tokens: CertifiedData<Erc20UserToken>[]) => void;
	reset: (tokenId: TokenId) => void;
	resetAll: () => void;
}

export const initCertifiedErc20UserTokensStore = (): CertifiedErc20UserTokensStore => {
	const { subscribe, update, set } = writable<CertifiedErc20UserTokensData>(undefined);

	return {
		setAll: (tokens: CertifiedData<Erc20UserToken>[]) =>
			update((state) => [
				...(state ?? []).filter(
					({ data: { address } }) =>
						!tokens.map(({ data: { address } }) => address).includes(address)
				),
				...tokens.map(({ data, certified }) => ({
					certified,
					data: {
						...data,
						// We are using Symbols as key IDs for the ETH and ICP tokens, which is ideal for our use case due to their uniqueness. This ensures that even if two coins fetched dynamically have the same symbol or name, they will be used correctly.
						// However, this approach presents a challenge with ERC20 tokens, which need to be loaded twice - once with a query and once with an update. When they are loaded the second time, the existing Symbol should be reused to ensure they are identified as the same token.
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

export const erc20UserTokensStore = initCertifiedErc20UserTokensStore();
