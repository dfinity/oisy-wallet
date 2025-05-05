import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import type { EthereumNetwork } from '$eth/types/network';
import type { IcCkToken, IcToken } from '$icp/types/ic-token';
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
		set
	};
};

export const initReceiveTokenContext = ({
	token,
	...rest
}: {
	token: Token;
	open: LoadTokenAndOpenModal;
	close: CloseModalAndResetToken;
}): ReceiveTokenContext => {
	const tokenStore = initReceiveTokenStore(token as IcToken);
	const tokenId = derived(tokenStore, ({ id }) => id);
	const tokenStandard = derived(tokenStore, ({ standard }) => standard);

	const ckEthereumTwinToken = derived(
		tokenStore,
		(token) => (token as IcCkToken).twinToken ?? ETHEREUM_TOKEN
	);

	const ckEthereumTwinTokenNetwork = derived(
		[ckEthereumTwinToken],
		([{ network }]) => (network as EthereumNetwork | undefined) ?? ETHEREUM_NETWORK
	);

	return {
		token: tokenStore,
		tokenId,
		tokenStandard,
		ckEthereumTwinToken,
		ckEthereumTwinTokenNetwork,
		...rest
	};
};

export type LoadTokenAndOpenModal = (openModal: () => Promise<void>) => Promise<void>;
export type CloseModalAndResetToken = () => void;

export interface ReceiveTokenContext {
	token: ReceiveTokenStore;
	tokenId: Readable<TokenId>;
	tokenStandard: Readable<TokenStandard>;

	ckEthereumTwinToken: Readable<Token>;
	ckEthereumTwinTokenNetwork: Readable<EthereumNetwork>;

	open: LoadTokenAndOpenModal;
	close: CloseModalAndResetToken;
}

export const RECEIVE_TOKEN_CONTEXT_KEY = Symbol('receive-token');
