import { browser } from '$app/environment';
import type { CustomToken, UserToken } from '$declarations/backend/backend.did';
import { ETHEREUM_NETWORK_SYMBOL } from '$env/networks/networks.eth.env';
import { ICP_NETWORK_SYMBOL } from '$env/networks/networks.icp.env';
import { SOLANA_MAINNET_NETWORK_SYMBOL } from '$env/networks/networks.sol.env';
import { nullishSignOut } from '$lib/services/auth.services';
import type { DeleteIdbTokenParams, SetIdbTokensParams } from '$lib/types/idb-tokens';
import { Principal } from '@dfinity/principal';
import { isNullish, nonNullish } from '@dfinity/utils';
import { createStore, del, get, set as idbSet, type UseStore } from 'idb-keyval';

// There is no IndexedDB in SSG. Since this initialization occurs at the module's root, SvelteKit would encounter an error during the dapp bundling process, specifically a "ReferenceError [Error]: indexedDB is not defined". Therefore, the object for bundling on NodeJS side.
const idbTokensStore = (key: string): UseStore =>
	browser
		? createStore(`oisy-${key}-custom-tokens`, `${key}-custom-tokens`)
		: ({} as unknown as UseStore);

const idbIcTokensStore = idbTokensStore(ICP_NETWORK_SYMBOL.toLowerCase());
const idbEthTokensStore = idbTokensStore(ETHEREUM_NETWORK_SYMBOL.toLowerCase());
const idbSolTokensStore = idbTokensStore(SOLANA_MAINNET_NETWORK_SYMBOL.toLowerCase());

export const setIdbTokensStore = async <T extends CustomToken | UserToken>({
	identity,
	tokens,
	idbTokensStore
}: SetIdbTokensParams<T> & {
	idbTokensStore: UseStore;
}) => {
	if (isNullish(identity)) {
		await nullishSignOut();
		return;
	}

	await idbSet(identity.getPrincipal().toText(), tokens, idbTokensStore);
};

export const setIdbIcTokens = (params: SetIdbTokensParams<CustomToken>): Promise<void> =>
	setIdbTokensStore({ ...params, idbTokensStore: idbIcTokensStore });

export const setIdbEthTokens = (params: SetIdbTokensParams<UserToken>): Promise<void> =>
	setIdbTokensStore({ ...params, idbTokensStore: idbEthTokensStore });

export const setIdbSolTokens = (params: SetIdbTokensParams<CustomToken>): Promise<void> =>
	setIdbTokensStore({ ...params, idbTokensStore: idbSolTokensStore });

export const getIdbIcTokens = (
	principal: Principal
): Promise<SetIdbTokensParams<CustomToken>['tokens'] | undefined> =>
	get(principal.toText(), idbIcTokensStore);

export const getIdbEthTokens = (
	principal: Principal
): Promise<SetIdbTokensParams<UserToken>['tokens'] | undefined> =>
	get(principal.toText(), idbEthTokensStore);

export const getIdbSolTokens = (
	principal: Principal
): Promise<SetIdbTokensParams<CustomToken>['tokens'] | undefined> =>
	get(principal.toText(), idbSolTokensStore);

export const deleteIdbIcTokens = (principal: Principal): Promise<void> =>
	del(principal.toText(), idbIcTokensStore);

export const deleteIdbEthTokens = (principal: Principal): Promise<void> =>
	del(principal.toText(), idbEthTokensStore);

export const deleteIdbSolTokens = (principal: Principal): Promise<void> =>
	del(principal.toText(), idbSolTokensStore);

export const deleteIdbEthToken = async ({
	identity,
	token
}: DeleteIdbTokenParams<UserToken>): Promise<void> => {
	if (isNullish(identity)) {
		await nullishSignOut();
		return;
	}

	const currentTokens = await getIdbEthTokens(identity.getPrincipal());

	if (nonNullish(currentTokens)) {
		await setIdbEthTokens({
			identity,
			tokens: currentTokens.filter(({ contract_address, chain_id }) =>
				token.chain_id === chain_id ? token.contract_address !== contract_address : true
			)
		});
	}
};

export const deleteIdbIcToken = async ({
	identity,
	token
}: DeleteIdbTokenParams<CustomToken>): Promise<void> => {
	if (isNullish(identity)) {
		await nullishSignOut();
		return;
	}

	const { token: tokenToDelete } = token;

	if (!('Icrc' in tokenToDelete)) {
		return;
	}

	const {
		Icrc: { ledger_id: tokenToDeleteLedgerId }
	} = tokenToDelete;

	const currentTokens = await getIdbIcTokens(identity.getPrincipal());

	if (nonNullish(currentTokens)) {
		await setIdbIcTokens({
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
}: DeleteIdbTokenParams<CustomToken>): Promise<void> => {
	if (isNullish(identity)) {
		await nullishSignOut();
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

	const currentTokens = await getIdbIcTokens(identity.getPrincipal());

	if (nonNullish(currentTokens)) {
		await setIdbSolTokens({
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
