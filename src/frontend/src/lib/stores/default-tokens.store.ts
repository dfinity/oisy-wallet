import type { Erc20ContractAddress } from '$eth/types/erc20';
import { isTokenErc20 } from '$eth/utils/erc20.utils';
import type { Token, TokenId } from '$lib/types/token';
import type { SplTokenAddress } from '$sol/types/spl';
import { isTokenSpl } from '$sol/utils/spl.utils';
import { writable, type Readable } from 'svelte/store';

type DefaultTokensData<T extends Token> = T[] | undefined;

export interface DefaultTokensStore<T extends Token> extends Readable<DefaultTokensData<T>> {
	set: (tokens: DefaultTokensData<T>) => void;
	add: (token: T) => void;
	remove: (tokenId: TokenId) => void;
	reset: () => void;
}

export const initDefaultTokensStore = <T extends Token>(): DefaultTokensStore<T> => {
	const INITIAL: DefaultTokensData<T> = undefined;

	const { subscribe, set, update } = writable<DefaultTokensData<T>>(INITIAL);

	const getIdentifier = <T extends Token>(
		token: T
	): string | Erc20ContractAddress['address'] | SplTokenAddress =>
		isTokenSpl(token)
			? token.address
			: isTokenErc20(token)
				? token.address
				: `${token.id.description}`;

	return {
		set,
		add: (token: T) =>
			update((state) => [
				...(state ?? []).filter(
					(data) => getIdentifier(data).toLowerCase() !== getIdentifier(token).toLowerCase()
				),
				token
			]),
		remove: (tokenId: TokenId) =>
			update((state) => [...(state ?? []).filter(({ id }) => id !== tokenId)]),
		reset: () => set(INITIAL),
		subscribe
	};
};
