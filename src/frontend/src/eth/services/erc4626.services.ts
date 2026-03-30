import {
	SUPPORTED_EVM_NETWORKS,
	SUPPORTED_EVM_NETWORKS_CHAIN_IDS
} from '$env/networks/networks-evm/networks.evm.env';
import {
	SUPPORTED_ETHEREUM_NETWORKS,
	SUPPORTED_ETHEREUM_NETWORKS_CHAIN_IDS
} from '$env/networks/networks.eth.env';
import { ERC4626_TOKENS } from '$env/tokens/tokens.erc4626.env';
import { ETHEREUM_DEFAULT_DECIMALS } from '$env/tokens/tokens.eth.env';
import { ERC4626_ABI } from '$eth/constants/erc4626.constants';
import { infuraErc4626Providers } from '$eth/providers/infura-erc4626.providers';
import { infuraProviders } from '$eth/providers/infura.providers';
import { approve } from '$eth/services/approve.services';
import { safeLoadMetadata as safeLoadErc20Metadata } from '$eth/services/erc20.services';
import { getNonce } from '$eth/services/nonce.services';
import { prepare } from '$eth/services/prepare.services';
import { erc4626CustomTokensStore } from '$eth/stores/erc4626-custom-tokens.store';
import { erc4626DefaultTokensStore } from '$eth/stores/erc4626-default-tokens.store';
import type { EthAddress } from '$eth/types/address';
import type { Erc20Token } from '$eth/types/erc20';
import type { Erc4626ContractAddress } from '$eth/types/erc4626';
import type { Erc4626CustomToken } from '$eth/types/erc4626-custom-token';
import { signTransaction } from '$lib/api/signer.api';
import { ZERO } from '$lib/constants/app.constants';
import { DEFAULT_TOKEN_TAGS } from '$lib/constants/token-tag.constants';
import { ProgressStepsStake, ProgressStepsUnstake } from '$lib/enums/progress-steps';
import { loadNetworkCustomTokens } from '$lib/services/custom-tokens.services';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { LoadCustomTokenParams } from '$lib/types/custom-token';
import type { NullishIdentity } from '$lib/types/identity';
import type { NetworkId } from '$lib/types/network';
import type { RequiredTransactionFeeData } from '$lib/types/transaction';
import type { Vault } from '$lib/types/vaults';
import { consoleError } from '$lib/utils/console.utils';
import { parseCustomTokenId } from '$lib/utils/custom-token.utils';
import { getCodebaseTokenIconPath } from '$lib/utils/tokens.utils';
import { waitAndTriggerWallet } from '$lib/utils/wallet.utils';
import { assertNonNullish, fromNullable, nonNullish, queryAndUpdate } from '@dfinity/utils';
import { Interface } from 'ethers/abi';
import { get } from 'svelte/store';

export const isInterfaceErc4626 = async ({
	networkId,
	address
}: {
	networkId: NetworkId;
	address: Erc4626ContractAddress;
}): Promise<boolean> => {
	const { isInterfaceErc4626 } = infuraErc4626Providers(networkId);

	return await isInterfaceErc4626(address);
};

export const loadErc4626Tokens = async ({
	identity
}: {
	identity: NullishIdentity;
}): Promise<void> => {
	loadDefaultErc4626Tokens();
	await loadCustomErc4626Tokens({ identity, useCache: true });
};

export const loadDefaultErc4626Tokens = (): void => {
	erc4626DefaultTokensStore.set(ERC4626_TOKENS);
};

export const loadCustomErc4626Tokens = ({
	identity,
	useCache = false
}: Omit<LoadCustomTokenParams, 'certified'>): Promise<void> =>
	queryAndUpdate<Erc4626CustomToken[]>({
		request: (params) => loadCustomTokensWithMetadata({ ...params, useCache }),
		onLoad: loadCustomTokenData,
		onUpdateError,
		identity
	});

const loadCustomTokensWithMetadata = async ({
	tokens,
	...params
}: LoadCustomTokenParams): Promise<Erc4626CustomToken[]> => {
	const loadCustomContracts = async (): Promise<Erc4626CustomToken[]> => {
		const erc4626CustomTokens = tokens ?? (await loadNetworkCustomTokens(params));

		const [existingTokens, nonExistingTokens] = erc4626CustomTokens.reduce<
			[Erc4626CustomToken[], Erc4626CustomToken[]]
		>(
			(
				[accExisting, accNonExisting],
				{
					token,
					enabled,
					version: versionNullable,
					allow_external_content_source: allowExternalContentSourceNullable
				}
			) => {
				if (!('Erc4626' in token)) {
					return [accExisting, accNonExisting];
				}

				if (
					![...SUPPORTED_ETHEREUM_NETWORKS_CHAIN_IDS, ...SUPPORTED_EVM_NETWORKS_CHAIN_IDS].includes(
						token.Erc4626.chain_id
					)
				) {
					return [accExisting, accNonExisting];
				}

				const version = fromNullable(versionNullable);
				const allowExternalContentSource = fromNullable(allowExternalContentSourceNullable);

				const {
					Erc4626: { token_address: tokenAddress, chain_id: tokenChainId }
				} = token;

				const existingToken = ERC4626_TOKENS.find(
					({ address, network: { chainId } }) =>
						tokenAddress.toLowerCase() === address.toLowerCase() && tokenChainId === chainId
				);

				if (nonNullish(existingToken)) {
					accExisting.push({ ...existingToken, enabled, version });

					return [accExisting, accNonExisting];
				}

				const network = [...SUPPORTED_ETHEREUM_NETWORKS, ...SUPPORTED_EVM_NETWORKS].find(
					({ chainId }) => tokenChainId === chainId
				);

				// This should not happen because we filter the chain_id in the previous filter, but we need it to be type safe
				assertNonNullish(
					network,
					`Inconsistency in network data: no network found for chainId ${tokenChainId} in custom token, even though it is in the environment`
				);

				const newToken: Erc4626CustomToken = {
					id: parseCustomTokenId({ identifier: tokenAddress, chainId: network.chainId }),
					name: tokenAddress,
					address: tokenAddress,
					network,
					symbol: tokenAddress,
					decimals: ETHEREUM_DEFAULT_DECIMALS,
					standard: { code: 'erc4626' as const },
					category: 'custom' as const,
					tags: DEFAULT_TOKEN_TAGS,
					assetAddress: '' as Erc4626ContractAddress,
					assetDecimals: ETHEREUM_DEFAULT_DECIMALS,
					assetSymbol: '',
					enabled,
					version,
					allowExternalContentSource
				};

				accNonExisting.push(newToken);

				return [accExisting, accNonExisting];
			},
			[[], []]
		);

		const safeLoadMetadata = async ({
			networkId,
			address
		}: {
			networkId: NetworkId;
			address: Erc4626ContractAddress;
		}) => {
			try {
				// TODO(GIX-2740): check if metadata for address already loaded in store and reuse - using Infura is not a certified call anyway
				return await infuraErc4626Providers(networkId).metadata({ address });
			} catch (err: unknown) {
				consoleError(
					`Error loading metadata for custom ERC4626 token ${address} on network ${networkId.description}`,
					err
				);
			}
		};

		const safeLoadAssetAddress = async ({
			networkId,
			address
		}: {
			networkId: NetworkId;
			address: Erc4626ContractAddress;
		}): Promise<Erc4626ContractAddress | undefined> => {
			try {
				return await infuraErc4626Providers(networkId).getAssetAddress(address);
			} catch (err: unknown) {
				consoleError(
					`Error loading asset address for custom ERC4626 token ${address} on network ${networkId.description}`,
					err
				);
			}
		};

		const customTokens: Erc4626CustomToken[] = await nonExistingTokens.reduce<
			Promise<Erc4626CustomToken[]>
		>(async (acc, token) => {
			const {
				network: { id: networkId },
				address
			} = token;

			const icon = getCodebaseTokenIconPath({ token });
			let resultToken = { ...token, icon };

			const [metadata, assetAddress] = await Promise.all([
				safeLoadMetadata({ networkId, address }),
				safeLoadAssetAddress({ networkId, address })
			]);

			if (nonNullish(metadata)) {
				resultToken = { ...resultToken, ...metadata };
			}

			if (nonNullish(assetAddress)) {
				resultToken = { ...resultToken, assetAddress };

				const {
					decimals: assetDecimals,
					symbol: assetSymbol,
					icon: assetIcon
				} = (await safeLoadErc20Metadata({ networkId, address: assetAddress })) ?? {};

				resultToken = {
					...resultToken,
					...(nonNullish(assetIcon) ? { assetIcon } : {}),
					...(nonNullish(assetDecimals) ? { assetDecimals } : {}),
					...(nonNullish(assetSymbol) ? { assetSymbol } : {})
				};
			}

			return [...(await acc), resultToken];
		}, Promise.resolve([]));

		return [...existingTokens, ...customTokens];
	};

	return await loadCustomContracts();
};

const loadCustomTokenData = ({
	response: tokens,
	certified
}: {
	certified: boolean;
	response: Erc4626CustomToken[];
}) => {
	erc4626CustomTokensStore.setAll(tokens.map((token) => ({ data: token, certified })));
};

const onUpdateError = ({ error: err }: { error: unknown }) => {
	erc4626CustomTokensStore.resetAll();

	toastsError({
		msg: { text: get(i18n).init.error.erc4626_custom_tokens },
		err
	});
};

export const encodeErc4626Deposit = ({
	contractAddress,
	assets,
	receiver
}: {
	contractAddress: Erc4626ContractAddress;
	assets: bigint;
	receiver: EthAddress;
}): { to: string; data: string } => {
	const data = new Interface(ERC4626_ABI).encodeFunctionData('deposit', [assets, receiver]);

	return { to: contractAddress, data };
};

export const encodeErc4626Withdraw = ({
	contractAddress,
	assets,
	receiver,
	owner
}: {
	contractAddress: Erc4626ContractAddress;
	assets: bigint;
	receiver: EthAddress;
	owner: EthAddress;
}): { to: string; data: string } => {
	const data = new Interface(ERC4626_ABI).encodeFunctionData('withdraw', [assets, receiver, owner]);

	return { to: contractAddress, data };
};

export const encodeErc4626Redeem = ({
	contractAddress,
	shares,
	receiver,
	owner
}: {
	contractAddress: Erc4626ContractAddress;
	shares: bigint;
	receiver: EthAddress;
	owner: EthAddress;
}): { to: string; data: string } => {
	const data = new Interface(ERC4626_ABI).encodeFunctionData('redeem', [shares, receiver, owner]);

	return { to: contractAddress, data };
};

export const depositErc4626 = async ({
	identity,
	progress,
	vault,
	assetToken,
	amount,
	from,
	...feeData
}: {
	identity: NullishIdentity;
	vault: Vault;
	assetToken: Erc20Token;
	amount: bigint;
	from: EthAddress;
	progress?: (step: ProgressStepsStake) => void;
} & RequiredTransactionFeeData): Promise<void> => {
	const { network: sourceNetwork, address } = vault.token;
	const { id: networkId, chainId } = sourceNetwork;

	progress?.(ProgressStepsStake.APPROVE);

	const { transactionNeededApproval, nonce } = await approve({
		token: assetToken,
		from,
		to: address,
		amount,
		sourceNetwork,
		identity,
		shouldSwapWithApproval: true,
		...feeData
	});

	const nonceDeposit = transactionNeededApproval ? nonce + 1 : nonce;

	progress?.(ProgressStepsStake.STAKE);

	const { data } = encodeErc4626Deposit({
		contractAddress: address,
		assets: amount,
		receiver: from
	});

	const { safeEstimateGas } = infuraProviders(networkId);

	const depositGas = await safeEstimateGas({
		from,
		to: address,
		data
	});

	const transaction = prepare({
		data,
		to: address,
		amount: ZERO,
		nonce: nonceDeposit,
		chainId,
		...feeData,
		...(nonNullish(depositGas) ? { gas: depositGas } : {})
	});

	const rawTransaction = await signTransaction({
		identity,
		transaction,
		nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
	});

	const { sendTransaction } = infuraProviders(networkId);
	await sendTransaction(rawTransaction);

	progress?.(ProgressStepsStake.UPDATE_UI);

	await waitAndTriggerWallet();
};

const sendErc4626Unstake = async ({
	identity,
	progress,
	vault,
	data,
	from,
	...feeData
}: {
	identity: NullishIdentity;
	vault: Vault;
	data: string;
	from: EthAddress;
	progress?: (step: ProgressStepsUnstake) => void;
} & RequiredTransactionFeeData): Promise<void> => {
	const { network, address } = vault.token;
	const { id: networkId, chainId } = network;

	progress?.(ProgressStepsUnstake.UNSTAKE);

	const nonce = await getNonce({ from, networkId });

	const transaction = prepare({
		data,
		to: address,
		amount: ZERO,
		nonce,
		chainId,
		...feeData
	});

	const rawTransaction = await signTransaction({
		identity,
		transaction,
		nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
	});

	const { sendTransaction } = infuraProviders(networkId);
	await sendTransaction(rawTransaction);

	progress?.(ProgressStepsUnstake.UPDATE_UI);

	await waitAndTriggerWallet();
};

export const withdrawErc4626 = async ({
	vault,
	assets,
	from,
	...rest
}: {
	identity: NullishIdentity;
	vault: Vault;
	assets: bigint;
	from: EthAddress;
	progress?: (step: ProgressStepsUnstake) => void;
} & RequiredTransactionFeeData): Promise<void> => {
	const { data } = encodeErc4626Withdraw({
		contractAddress: vault.token.address,
		assets,
		receiver: from,
		owner: from
	});

	await sendErc4626Unstake({ vault, data, from, ...rest });
};

export const redeemErc4626 = async ({
	vault,
	shares,
	from,
	...rest
}: {
	identity: NullishIdentity;
	vault: Vault;
	shares: bigint;
	from: EthAddress;
	progress?: (step: ProgressStepsUnstake) => void;
} & RequiredTransactionFeeData): Promise<void> => {
	const { data } = encodeErc4626Redeem({
		contractAddress: vault.token.address,
		shares,
		receiver: from,
		owner: from
	});

	await sendErc4626Unstake({ vault, data, from, ...rest });
};

// ERC4626 metadata is fetched from Infura and doesn't depend on the IC certified flag.
// On the certified round we reuse the query round's response to skip redundant HTTP calls.
let lastCustomTokensResponse: Erc4626CustomToken[] | undefined;

export const processCustomTokens = async ({
	certified,
	...rest
}: LoadCustomTokenParams): Promise<void> => {
	try {
		if (certified && nonNullish(lastCustomTokensResponse)) {
			loadCustomTokenData({ response: lastCustomTokensResponse, certified });

			return;
		}

		const response = await loadCustomTokensWithMetadata({ ...rest, certified });
		lastCustomTokensResponse = response;

		loadCustomTokenData({ response, certified });
	} catch (err: unknown) {
		lastCustomTokensResponse = undefined;

		if (certified) {
			onUpdateError({ error: err });
		}
	}
};
