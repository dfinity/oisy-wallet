import type { Erc20Token } from '$eth/types/erc20';
import { isTokenErc } from '$eth/utils/erc.utils';
import type { ExtToken } from '$icp/types/ext-token';
import type { IcToken } from '$icp/types/ic-token';
import { isTokenExt } from '$icp/utils/ext.utils';
import { isTokenIc } from '$icp/utils/icrc.utils';
import type { CustomToken } from '$lib/types/custom-token';
import type { CertifiedData } from '$lib/types/store';
import type { Token, TokenId } from '$lib/types/token';
import type { Option } from '$lib/types/utils';
import type { SplToken } from '$sol/types/spl';
import { isTokenSpl } from '$sol/utils/spl.utils';
import { writable, type Readable } from 'svelte/store';

type CertifiedCustomTokensData<T extends Token> = Option<CertifiedData<CustomToken<T>>[]>;

export interface CertifiedCustomTokensStore<T extends Token>
	extends Readable<CertifiedCustomTokensData<T>> {
	setAll: (tokens: CertifiedData<CustomToken<T>>[]) => void;
	reset: (tokenId: TokenId) => void;
	resetByIdentifier: (identifier: Identifier) => void;
	resetAll: () => void;
}

type Identifier =
	| `${Erc20Token['address']}${'#'}${Erc20Token['network']['chainId']}`
	| SplToken['address']
	| IcToken['ledgerCanisterId']
	| ExtToken['canisterId'];

export const initCertifiedCustomTokensStore = <
	T extends Token
>(): CertifiedCustomTokensStore<T> => {
	const { subscribe, update, set } = writable<CertifiedCustomTokensData<T>>(undefined);

	const getIdentifier = <T extends Token>(token: T): Identifier | TokenId =>
		isTokenSpl(token)
			? token.address
			: isTokenErc(token)
				? `${token.address}#${token.network.chainId}`
				: isTokenExt(token)
					? token.canisterId
					: isTokenIc(token)
						? token.ledgerCanisterId
						: token.id;

	return {
		setAll: (tokens: CertifiedData<CustomToken<T>>[]) =>
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
		resetByIdentifier: (identifier: Identifier) =>
			update((state) => [
				...(state ?? []).filter(({ data }) => getIdentifier(data) !== identifier)
			]),
		resetAll: () => set(null),
		subscribe
	};
};
