import { browser } from '$app/environment';
import type { CustomToken, ErcToken } from '$declarations/backend/backend.did';
import type { DeleteIdbTokenParams, SetIdbTokensParams } from '$lib/types/idb-tokens';
import { isNullish, nonNullish } from '@dfinity/utils';
import { Principal } from '@icp-sdk/core/principal';
import { clear, createStore, get, set as idbSet, type UseStore } from 'idb-keyval';

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

// The backend keys an EVM custom token by address and chain id only, whatever its standard, so the
// cached entry to drop is matched the same way.
const toErcFungibleToken = (token: CustomToken['token']): ErcToken | undefined =>
	'Erc20' in token ? token.Erc20 : 'Erc4626' in token ? token.Erc4626 : undefined;

export const deleteIdbEthToken = async ({
	identity,
	token
}: DeleteIdbTokenParams): Promise<void> => {
	if (isNullish(identity)) {
		return;
	}

	const tokenToDelete = toErcFungibleToken(token.token);

	if (isNullish(tokenToDelete)) {
		return;
	}

	const { token_address: tokenToDeleteAddress, chain_id: tokenToDeleteChainId } = tokenToDelete;

	const currentTokens = await getIdbAllCustomTokens(identity.getPrincipal());

	if (nonNullish(currentTokens)) {
		await setIdbAllCustomTokens({
			identity,
			tokens: currentTokens.filter(({ token: savedToken }) => {
				const savedErcToken = toErcFungibleToken(savedToken);

				return nonNullish(savedErcToken)
					? !(
							savedErcToken.token_address === tokenToDeleteAddress &&
							savedErcToken.chain_id === tokenToDeleteChainId
						)
					: true;
			})
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
