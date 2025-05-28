import { browser } from '$app/environment';
import { ICP_NETWORK_SYMBOL } from '$env/networks/networks.icp.env';
import { SOLANA_MAINNET_NETWORK_SYMBOL } from '$env/networks/networks.sol.env';
import { nullishSignOut } from '$lib/services/auth.services';
import type { SetIdbTokensParams } from '$lib/types/idb-tokens';
import type { Principal } from '@dfinity/principal';
import { isNullish } from '@dfinity/utils';
import { createStore, del, get, set as idbSet, type UseStore } from 'idb-keyval';

// There is no IndexedDB in SSG. Since this initialization occurs at the module's root, SvelteKit would encounter an error during the dapp bundling process, specifically a "ReferenceError [Error]: indexedDB is not defined". Therefore, the object for bundling on NodeJS side.
const idbTokensStore = (key: string): UseStore =>
	browser
		? createStore(`oisy-${key}-custom-tokens`, `${key}-custom-tokens`)
		: ({} as unknown as UseStore);

const idbIcTokensStore = idbTokensStore(ICP_NETWORK_SYMBOL.toLowerCase());
const idbSolTokensStore = idbTokensStore(SOLANA_MAINNET_NETWORK_SYMBOL.toLowerCase());

export const setIdbTokensStore = async ({
	identity,
	tokens,
	idbTokensStore
}: SetIdbTokensParams & {
	idbTokensStore: UseStore;
}) => {
	if (isNullish(identity)) {
		await nullishSignOut();
		return;
	}

	await idbSet(identity.getPrincipal().toText(), tokens, idbTokensStore);
};

export const setIdbIcTokens = (params: SetIdbTokensParams): Promise<void> =>
	setIdbTokensStore({ ...params, idbTokensStore: idbIcTokensStore });

export const setIdbSolTokens = (params: SetIdbTokensParams): Promise<void> =>
	setIdbTokensStore({ ...params, idbTokensStore: idbSolTokensStore });

export const getIdbIcTokens = (
	principal: Principal
): Promise<SetIdbTokensParams['tokens'] | undefined> => get(principal.toText(), idbIcTokensStore);

export const getIdbSolTokens = (
	principal: Principal
): Promise<SetIdbTokensParams['tokens'] | undefined> => get(principal.toText(), idbSolTokensStore);

export const deleteIdbIcTokens = (principal: Principal): Promise<void> =>
	del(principal.toText(), idbIcTokensStore);

export const deleteIdbSolTokens = (principal: Principal): Promise<void> =>
	del(principal.toText(), idbSolTokensStore);
