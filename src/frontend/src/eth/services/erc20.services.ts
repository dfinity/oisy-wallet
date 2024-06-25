import type { UserToken } from '$declarations/backend/backend.did';
import {
	SUPPORTED_ETHEREUM_NETWORKS,
	SUPPORTED_ETHEREUM_NETWORKS_CHAIN_IDS
} from '$env/networks.env';
import { ERC20_CONTRACTS, ERC20_TWIN_TOKENS } from '$env/tokens.erc20.env';
import { infuraErc20Providers } from '$eth/providers/infura-erc20.providers';
import { erc20UserTokensStore } from '$eth/stores/erc20-user-tokens.store';
import { erc20TokensStore } from '$eth/stores/erc20.store';
import type { Erc20Contract, Erc20Metadata, Erc20Token } from '$eth/types/erc20';
import type { Erc20UserToken, Erc20UserTokenState } from '$eth/types/erc20-user-token';
import type { EthereumNetwork } from '$eth/types/network';
import { mapErc20Token, mapErc20UserToken } from '$eth/utils/erc20.utils';
import { mapAddressStartsWith0x } from '$icp-eth/utils/eth.utils';
import { queryAndUpdate } from '$lib/actors/query.ic';
import { addUserToken, listUserTokens } from '$lib/api/backend.api';
import { ProgressStepsAddToken } from '$lib/enums/progress-steps';
import { nullishSignOut } from '$lib/services/auth.services';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { OptionIdentity } from '$lib/types/identity';
import { isNullishOrEmpty } from '$lib/utils/input.utils';
import { fromNullable, isNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export const loadErc20Contracts = async ({
	identity
}: {
	identity: OptionIdentity;
}): Promise<void> => {
	await Promise.all([loadDefaultErc20Contracts(), loadUserTokens({ identity })]);
};

const loadDefaultErc20Contracts = async (): Promise<{ success: boolean }> => {
	try {
		type ContractData = Erc20Contract &
			Erc20Metadata & { network: EthereumNetwork } & Pick<Erc20Token, 'category'> &
			Partial<Pick<Erc20Token, 'id'>>;

		const loadKnownContracts = (): Promise<ContractData>[] =>
			ERC20_CONTRACTS.map(
				async ({ network, ...contract }): Promise<ContractData> => ({
					...contract,
					network,
					category: 'default',
					...(await infuraErc20Providers(network.id).metadata(contract))
				})
			);

		const contracts = await Promise.all(loadKnownContracts());
		erc20TokensStore.set([...ERC20_TWIN_TOKENS, ...contracts.map(mapErc20Token)]);
	} catch (err: unknown) {
		erc20TokensStore.reset();

		const {
			init: {
				error: { erc20_contracts }
			}
		} = get(i18n);

		toastsError({
			msg: { text: erc20_contracts },
			err
		});

		return { success: false };
	}

	return { success: true };
};

const loadUserTokens = ({ identity }: { identity: OptionIdentity }): Promise<void> =>
	queryAndUpdate<Erc20UserToken[]>({
		request: (params) => loadErc20UserTokens(params),
		onLoad: loadErc20UserTokenData,
		onCertifiedError: ({ error: err }) => {
			erc20UserTokensStore.clear();

			toastsError({
				msg: { text: get(i18n).init.error.erc20_user_tokens },
				err
			});
		},
		identity
	});

const loadErc20UserTokens = async (params: {
	identity: OptionIdentity;
	certified: boolean;
}): Promise<Erc20UserToken[]> => {
	type ContractData = Erc20Contract &
		Erc20Metadata & { network: EthereumNetwork } & Pick<Erc20Token, 'category'> &
		Partial<Pick<Erc20Token, 'id'>>;

	type ContractDataWithCustomToken = ContractData & Erc20UserTokenState;

	const erc20DefaultContractAddresses = ERC20_CONTRACTS.map(({ address }) =>
		mapAddressStartsWith0x(address)
	);

	const loadUserContracts = async (): Promise<Promise<ContractDataWithCustomToken>[]> => {
		const contracts = await listUserTokens(params);

		return contracts
			.filter(
				({ chain_id, contract_address }) =>
					SUPPORTED_ETHEREUM_NETWORKS_CHAIN_IDS.includes(chain_id) &&
					!erc20DefaultContractAddresses.includes(mapAddressStartsWith0x(contract_address))
			)
			.map(
				async ({
					contract_address: address,
					chain_id,
					version,
					enabled
				}: UserToken): Promise<ContractDataWithCustomToken> => {
					const network = SUPPORTED_ETHEREUM_NETWORKS.find(
						({ chainId }) => chainId === chain_id
					) as EthereumNetwork;

					return {
						...{
							address,
							exchange: 'erc20' as const,
							category: 'custom' as const,
							network,
							version: fromNullable(version),
							enabled: fromNullable(enabled) ?? true
						},
						...(await infuraErc20Providers(network.id).metadata({ address }))
					};
				}
			);
	};

	const userContracts = await loadUserContracts();

	const contracts = await Promise.all(userContracts);
	return contracts.map(mapErc20UserToken);
};

export const saveErc20Contract = async ({
	contractAddress,
	metadata,
	network,
	updateSaveProgressStep,
	modalNext,
	onSuccess,
	onError,
	identity
}: {
	contractAddress: string | undefined;
	metadata: Erc20Metadata | undefined;
	network: EthereumNetwork;
	updateSaveProgressStep: (step: ProgressStepsAddToken) => void;
	modalNext: () => void;
	onSuccess: () => void;
	onError: () => void;
	identity: OptionIdentity;
}): Promise<void> => {
	const $i18n = get(i18n);

	if (isNullishOrEmpty(contractAddress)) {
		toastsError({
			msg: { text: $i18n.tokens.error.invalid_contract_address }
		});
		return;
	}

	if (isNullish(metadata)) {
		toastsError({
			msg: { text: $i18n.tokens.error.no_metadata }
		});
		return;
	}

	if (isNullish(identity)) {
		await nullishSignOut();
		return;
	}

	modalNext();

	try {
		updateSaveProgressStep(ProgressStepsAddToken.SAVE);

		await addUserToken({
			identity,
			token: {
				chain_id: network.chainId,
				contract_address: contractAddress,
				symbol: [],
				decimals: [],
				version: [],
				// TODO: this should be a parameter
				enabled: [true]
			}
		});

		updateSaveProgressStep(ProgressStepsAddToken.UPDATE_UI);

		erc20TokensStore.add(
			mapErc20Token({
				address: contractAddress,
				exchange: 'ethereum',
				category: 'custom',
				network: network,
				...metadata
			})
		);

		updateSaveProgressStep(ProgressStepsAddToken.DONE);

		setTimeout(() => onSuccess(), 750);
	} catch (err: unknown) {
		toastsError({
			msg: { text: $i18n.tokens.error.unexpected },
			err
		});

		onError();
	}
};

const loadErc20UserTokenData = ({
	response: tokens,
	certified
}: {
	certified: boolean;
	response: Erc20UserToken[];
}) => {
	tokens.forEach((token) =>
		erc20UserTokensStore.set({
			data: token,
			certified
		})
	);
};
