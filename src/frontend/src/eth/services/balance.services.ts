import { SUPPORTED_ETHEREUM_TOKENS } from '$env/tokens.env';
import { infuraErc20Providers } from '$eth/providers/infura-erc20.providers';
import { infuraProviders } from '$eth/providers/infura.providers';
import type { Erc20Token } from '$eth/types/erc20';
import { isSupportedEthTokenId } from '$eth/utils/eth.utils';
import { address as addressStore } from '$lib/derived/address.derived';
import { balancesStore } from '$lib/stores/balances.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { OptionAddress } from '$lib/types/address';
import type { NetworkId } from '$lib/types/network';
import type { Token, TokenId } from '$lib/types/token';
import { isNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export const reloadBalance = async (token: Token): Promise<{ success: boolean }> => {
	if (isSupportedEthTokenId(token.id)) {
		return loadBalance({ networkId: token.network.id, tokenId: token.id });
	}

	return loadErc20Balance({ token: token as Erc20Token });
};

export const loadBalance = async ({
	networkId,
	tokenId
}: {
	networkId: NetworkId;
	tokenId: TokenId;
}): Promise<{ success: boolean }> => {
	const address = get(addressStore);

	if (isNullish(address)) {
		toastsError({
			msg: { text: 'ETH address is unknown.' }
		});

		return { success: false };
	}

	try {
		const { balance } = infuraProviders(networkId);
		const data = await balance(address);

		balancesStore.set({ tokenId, data: { data, certified: false } });
	} catch (err: unknown) {
		balancesStore.reset(tokenId);

		toastsError({
			msg: { text: 'Error while loading the ETH balance.' },
			err
		});

		return { success: false };
	}

	return { success: true };
};

const loadErc20Balance = async ({
	token: contract,
	address: optionAddress
}: {
	token: Erc20Token;
	address?: OptionAddress;
}): Promise<{ success: boolean }> => {
	const address = optionAddress ?? get(addressStore);

	if (isNullish(address)) {
		toastsError({
			msg: { text: 'ETH address is unknown.' }
		});

		return { success: false };
	}

	try {
		const { balance } = infuraErc20Providers(contract.network.id);
		const data = await balance({ address, contract });
		balancesStore.set({ tokenId: contract.id, data: { data, certified: false } });
	} catch (err: unknown) {
		balancesStore.reset(contract.id);

		toastsError({
			msg: { text: `Error while loading ${contract.symbol} balance.` },
			err
		});

		return { success: false };
	}

	return { success: true };
};

export const loadBalances = async (): Promise<{ success: boolean }> => {
	const results = await Promise.all([
		...SUPPORTED_ETHEREUM_TOKENS.map(({ network: { id: networkId }, id: tokenId }) =>
			loadBalance({ networkId, tokenId })
		)
	]);

	return { success: results.every(({ success }) => success === true) };
};

export const loadErc20Balances = async ({
	address,
	erc20Tokens,
	networkId
}: {
	address: OptionAddress;
	erc20Tokens: Erc20Token[];
	networkId: NetworkId;
}): Promise<{ success: boolean }> => {
	const results = await Promise.all([
		...erc20Tokens
			.filter(({ network: { id } }) => id === networkId)
			.map((token) => loadErc20Balance({ token, address }))
	]);

	return { success: results.every(({ success }) => success === true) };
};
