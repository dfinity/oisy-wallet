import type { Erc20ContractAddress } from '$eth/types/erc20';
import { isTokenErc } from '$eth/utils/erc.utils';
import type { CertifiedData } from '$lib/types/store';
import type { Token, TokenId } from '$lib/types/token';
import type { UserToken } from '$lib/types/user-token';
import type { Option } from '$lib/types/utils';
import type { SplTokenAddress } from '$sol/types/spl';
import { isTokenSpl } from '$sol/utils/spl.utils';
import { writable, type Readable } from 'svelte/store';

type CertifiedUserTokensData<T extends Token> = Option<CertifiedData<UserToken<T>>[]>;

export interface CertifiedUserTokensStore<T extends Token>
	extends Readable<CertifiedUserTokensData<T>> {
	setAll: (tokens: CertifiedData<UserToken<T>>[]) => void;
	reset: (tokenId: TokenId) => void;
	resetAll: () => void;
}

export const initCertifiedUserTokensStore = <T extends Token>(): CertifiedUserTokensStore<T> => {
	const { subscribe, update, set } = writable<CertifiedUserTokensData<T>>(undefined);

	const getIdentifier = <T extends Token>(
		token: T
	): TokenId | Erc20ContractAddress['address'] | SplTokenAddress =>
		isTokenSpl(token)
			? token.address
			: isTokenErc(token)
				? `${token.address}#${token.network.chainId}`
				: token.id;

	return {
		setAll: (tokens: CertifiedData<UserToken<T>>[]) =>
			update((state) => [
				...(state ?? []).filter(
					({ data }) => !tokens.map(({ data }) => getIdentifier(data)).includes(getIdentifier(data))
				),
				...tokens.map(({ data, certified }) => ({
					certified,
					data: {
						...data,
						// We are using Symbols as key IDs for the tokens, which is ideal for our use case due to their uniqueness. This ensures that even if two coins fetched dynamically have the same symbol or name, they will be used correctly.
						// However, this approach presents a challenge with ERC20 tokens, which need to be loaded twice - once with a query and once with an update. When they are loaded the second time, the existing Symbol should be reused to ensure they are identified as the same token.
						id:
							(state ?? []).find(
								({ data: stateData }) => getIdentifier(stateData) === getIdentifier(data)
							)?.data.id ?? data.id
					}
				}))
			]),
		reset: (tokenId: TokenId) =>
			update((state) => [...(state ?? []).filter(({ data: { id } }) => id !== tokenId)]),
		resetAll: () => set(null),
		subscribe
	};
};
