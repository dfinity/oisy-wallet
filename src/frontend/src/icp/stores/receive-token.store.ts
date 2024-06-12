import type {IcCkToken, IcToken} from '$icp/types/ic';
import type { Token, TokenId, TokenStandard } from '$lib/types/token';
import { derived, writable, type Readable } from 'svelte/store';

export type ReceiveTokenStoreData = IcToken;

export interface ReceiveTokenStore extends Readable<ReceiveTokenStoreData> {
	set: (data: ReceiveTokenStoreData) => void;
}

const initReceiveTokenStore = (token: IcToken): ReceiveTokenStore => {
	const { subscribe, set } = writable<ReceiveTokenStoreData>(token);

	return {
		subscribe,

		set(token) {
			set(token);
		}
	};
};

export const initReceiveTokenContext = (token: Token): ReceiveTokenContext => {
	const tokenStore = initReceiveTokenStore(token as IcToken);
	const tokenId = derived(tokenStore, ({ id }) => id);
	const tokenStandard = derived(tokenStore, ({ standard }) => standard);
	const twinToken = derived(tokenStore,token => (token as IcCkToken).twinToken)

	return { token: tokenStore, tokenId, tokenStandard, twinToken };
};

export interface ReceiveTokenContext {
	token: ReceiveTokenStore;
	tokenId: Readable<TokenId>;
	tokenStandard: Readable<TokenStandard>;
	twinToken: Readable<Token | undefined>;
}

export const RECEIVE_TOKEN_CONTEXT_KEY = Symbol('receive-token');
