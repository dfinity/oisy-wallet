import { browser } from '$app/environment';
import type { DeleteIdbTokenParams, SetIdbTokensParams } from '$lib/types/idb-tokens';
import { isNullish, nonNullish } from '@dfinity/utils';
import { Principal } from '@icp-sdk/core/principal';
import { clear, createStore, del, get, set as idbSet, type UseStore } from 'idb-keyval';

// There is no IndexedDB in SSG. Since this initialization occurs at the module's root, SvelteKit would encounter an error during the dapp bundling process, specifically a "ReferenceError [Error]: indexedDB is not defined". Therefore, the object for bundling on NodeJS side.
const idbTokensStore = (key: string): UseStore =>
	browser
		? createStore(`oisy-${key}-custom-tokens`, `${key}-custom-tokens`)
		: ({} as unknown as UseStore);

const idbAllCustomTokensStore = idbTokensStore('all');

export const setIdbTokensStore = async ({
	identity,
	tokens,
	idbTokensStore
}: SetIdbTokensParams & {
	idbTokensStore: UseStore;
}) => {
	if (isNullish(identity)) {
		return;
	}

	await idbSet(identity.getPrincipal().toText(), tokens, idbTokensStore);
};

export const setIdbAllCustomTokens = (params: SetIdbTokensParams): Promise<void> =>
	setIdbTokensStore({ ...params, idbTokensStore: idbAllCustomTokensStore });

export const getIdbAllCustomTokens = (
	principal: Principal
): Promise<SetIdbTokensParams['tokens'] | undefined> =>
	get(principal.toText(), idbAllCustomTokensStore);

export const deleteIdbAllCustomTokens = (principal: Principal): Promise<void> =>
	del(principal.toText(), idbAllCustomTokensStore);

export const deleteIdbEthToken = async ({
	identity,
	token
}: DeleteIdbTokenParams): Promise<void> => {
	if (isNullish(identity)) {
		return;
	}

	const { token: tokenToDelete } = token;

	if (!('Erc20' in tokenToDelete)) {
		return;
	}

	const {
		Erc20: { token_address: tokenToDeleteAddress, chain_id: tokenToDeleteChainId }
	} = tokenToDelete;

	const currentTokens = await getIdbAllCustomTokens(identity.getPrincipal());

	if (nonNullish(currentTokens)) {
		await setIdbAllCustomTokens({
			identity,
			tokens: currentTokens.filter(({ token: savedToken }) =>
				'Erc20' in savedToken
					? !(
							savedToken.Erc20.token_address === tokenToDeleteAddress &&
							savedToken.Erc20.chain_id === tokenToDeleteChainId
						)
					: true
			)
		});
	}
};

export const deleteIdbIcToken = async ({
	identity,
	token
}: DeleteIdbTokenParams): Promise<void> => {
	if (isNullish(identity)) {
		return;
	}

	const { token: tokenToDelete } = token;

	if (!('Icrc' in tokenToDelete)) {
		return;
	}

	const {
		Icrc: { ledger_id: tokenToDeleteLedgerId }
	} = tokenToDelete;

	const currentTokens = await getIdbAllCustomTokens(identity.getPrincipal());

	if (nonNullish(currentTokens)) {
		await setIdbAllCustomTokens({
			identity,
			tokens: currentTokens.filter(({ token: savedToken }) =>
				'Icrc' in savedToken
					? Principal.from(savedToken.Icrc.ledger_id).toText() !== tokenToDeleteLedgerId.toText()
					: true
			)
		});
	}
};

export const deleteIdbSolToken = async ({
	identity,
	token
}: DeleteIdbTokenParams): Promise<void> => {
	if (isNullish(identity)) {
		return;
	}

	const { token: tokenToDelete } = token;

	let tokenToDeleteAddress: string;
	if ('SplDevnet' in tokenToDelete) {
		tokenToDeleteAddress = tokenToDelete.SplDevnet.token_address;
	} else if ('SplMainnet' in tokenToDelete) {
		tokenToDeleteAddress = tokenToDelete.SplMainnet.token_address;
	} else {
		return;
	}

	const currentTokens = await getIdbAllCustomTokens(identity.getPrincipal());

	if (nonNullish(currentTokens)) {
		await setIdbAllCustomTokens({
			identity,
			tokens: currentTokens.filter(({ token: savedToken }) => {
				let tokenAddress: string | undefined;
				if ('SplDevnet' in savedToken) {
					tokenAddress = savedToken.SplDevnet.token_address;
				} else if ('SplMainnet' in savedToken) {
					tokenAddress = savedToken.SplMainnet.token_address;
				}

				return nonNullish(tokenAddress) ? tokenAddress !== tokenToDeleteAddress : true;
			})
		});
	}
};

export const clearIdbAllCustomTokens = (): Promise<void> => clear(idbAllCustomTokensStore);
