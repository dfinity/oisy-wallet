import { SUPPORTED_EVM_NETWORKS } from '$env/networks/networks-evm/networks.evm.env';
import { SUPPORTED_ETHEREUM_NETWORKS } from '$env/networks/networks.eth.env';
import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import {
	SOLANA_DEVNET_NETWORK_ID,
	SOLANA_MAINNET_NETWORK_ID
} from '$env/networks/networks.sol.env';
import type { SaveErc1155CustomToken } from '$eth/types/erc1155-custom-token';
import type { SaveErc20CustomToken } from '$eth/types/erc20-custom-token';
import type { SaveErc4626CustomToken } from '$eth/types/erc4626-custom-token';
import type { SaveErc721CustomToken } from '$eth/types/erc721-custom-token';
import {
	MANAGE_TOKENS_MODAL_ROUTE,
	TRACK_COUNT_MANAGE_TOKENS_DISABLE_SUCCESS,
	TRACK_COUNT_MANAGE_TOKENS_ENABLE_SUCCESS,
	TRACK_COUNT_MANAGE_TOKENS_SAVE_ERROR
} from '$lib/constants/analytics.constants';
import {
	PLAUSIBLE_EVENT_RESULT_STATUSES,
	PLAUSIBLE_EVENT_SOURCE_LOCATIONS
} from '$lib/enums/plausible';
import { ProgressStepsAddToken } from '$lib/enums/progress-steps';
import { trackEvent } from '$lib/services/analytics.services';
import { saveCustomTokens } from '$lib/services/save-custom-tokens.services';
import {
	trackTokenManage,
	type TokenManageEventModifier,
	type TokenManageEventToken,
	type TokenManageSourceLocation
} from '$lib/services/token-manage-analytics.services';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError, toastsShow } from '$lib/stores/toasts.store';
import type { SaveCustomTokenWithKey } from '$lib/types/custom-token';
import type { NullishIdentity } from '$lib/types/identity';
import type { Token } from '$lib/types/token';
import type { TokenToggleable } from '$lib/types/token-toggleable';
import type { NonEmptyArray } from '$lib/types/utils';
import {
	errorDetailToString,
	isVersionMismatchError,
	mapIcErrorMetadata
} from '$lib/utils/error.utils';
import type { SaveSplCustomToken } from '$sol/types/spl-custom-token';
import { isNullish, nonNullish } from '@dfinity/utils';
import type { Identity } from '@icp-sdk/core/agent';
import { get } from 'svelte/store';

interface ManageTokensSaveParams {
	progress?: (step: ProgressStepsAddToken) => void;
	modalNext?: () => void;
	onSuccess?: () => void;
	onError?: () => void;
	identity: NullishIdentity;
	tokenManageModifier?: TokenManageEventModifier;
	tokenManageSourceLocation?: TokenManageSourceLocation;
}

export interface SaveTokensParams<T> {
	progress?: (step: ProgressStepsAddToken) => void;
	identity: Identity;
	tokens: NonEmptyArray<T>;
}

type SaveTokensToken =
	| SaveCustomTokenWithKey
	| SaveErc20CustomToken
	| SaveSplCustomToken
	| SaveErc721CustomToken
	| SaveErc1155CustomToken
	| SaveErc4626CustomToken
	| TokenToggleable<Token>;

const mapTokenManageNetwork = <T extends SaveTokensToken>({
	token,
	network
}: {
	token: T;
	network?: Token['network'];
}): string | undefined => {
	if (nonNullish(network)) {
		return network.id.description;
	}

	if (!('networkKey' in token)) {
		return;
	}

	if (
		token.networkKey === 'Icrc' ||
		token.networkKey === 'ExtV2' ||
		token.networkKey === 'Dip721' ||
		token.networkKey === 'IcPunks' ||
		token.networkKey === 'Icrc7'
	) {
		return ICP_NETWORK_ID.description;
	}

	if (token.networkKey === 'SplMainnet') {
		return SOLANA_MAINNET_NETWORK_ID.description;
	}

	if (token.networkKey === 'SplDevnet') {
		return SOLANA_DEVNET_NETWORK_ID.description;
	}

	if (
		token.networkKey !== 'Erc20' &&
		token.networkKey !== 'Erc721' &&
		token.networkKey !== 'Erc1155' &&
		token.networkKey !== 'Erc4626'
	) {
		return;
	}

	const evmNetwork = [...SUPPORTED_ETHEREUM_NETWORKS, ...SUPPORTED_EVM_NETWORKS].find(
		({ chainId }) => chainId === token.chainId
	);

	return evmNetwork?.id.description;
};

const mapTokenManageToken = <T extends SaveTokensToken>({
	token,
	tokenId,
	network
}: {
	token: T;
	tokenId?: Token['id'];
	network?: Token['network'];
}): TokenManageEventToken | undefined => {
	const address =
		'address' in token
			? token.address
			: 'ledgerCanisterId' in token
				? token.ledgerCanisterId
				: 'canisterId' in token
					? token.canisterId
					: tokenId?.description;

	const tokenNetwork = mapTokenManageNetwork({ token, network });

	if (isNullish(address) || isNullish(tokenNetwork)) {
		return;
	}

	return {
		network: tokenNetwork,
		address,
		...('symbol' in token && nonNullish(token.symbol) && { symbol: token.symbol }),
		...('name' in token && nonNullish(token.name) && { name: token.name })
	};
};

const tokenManageModifier = <T extends SaveTokensToken>({
	token,
	modifier
}: {
	token: T;
	modifier?: TokenManageEventModifier;
}): TokenManageEventModifier => modifier ?? (token.enabled ? 'enable' : 'disable');

const trackTokenManageResults = <T extends SaveTokensToken>({
	tokens,
	modifier,
	sourceLocation,
	resultStatus,
	error,
	errorCode
}: {
	tokens: T[];
	modifier?: TokenManageEventModifier;
	sourceLocation: TokenManageSourceLocation;
	resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES;
	error?: string;
	errorCode?: string;
}) => {
	tokens.forEach((token) => {
		const tokenId = 'id' in token ? token.id : undefined;
		const network = 'network' in token ? token.network : undefined;
		const tokenManageToken = mapTokenManageToken({ token, tokenId, network });

		if (isNullish(tokenManageToken)) {
			return;
		}

		trackTokenManage({
			modifier: tokenManageModifier({ token, modifier }),
			token: tokenManageToken,
			sourceLocation,
			resultStatus,
			...(nonNullish(error) && { error }),
			...(nonNullish(errorCode) && { errorCode })
		});
	});
};

export const saveTokens = async <
	T extends
		| SaveCustomTokenWithKey
		| SaveErc20CustomToken
		| SaveSplCustomToken
		| SaveErc721CustomToken
		| SaveErc1155CustomToken
		| SaveErc4626CustomToken
		| TokenToggleable<Token>
>({
	tokens,
	save,
	progress,
	modalNext,
	onSuccess,
	onError,
	identity,
	tokenManageModifier: modifier,
	tokenManageSourceLocation = PLAUSIBLE_EVENT_SOURCE_LOCATIONS.MANAGE_TOKENS
}: {
	tokens: T[];
	save: (params: SaveTokensParams<T>) => Promise<void>;
} & ManageTokensSaveParams) => {
	const $i18n = get(i18n);

	if (isNullish(identity)) {
		return;
	}

	if (tokens.length === 0) {
		toastsError({
			msg: { text: $i18n.tokens.manage.error.empty }
		});
		return;
	}

	modalNext?.();

	try {
		await save({
			progress,
			identity,
			tokens: tokens as NonEmptyArray<T>
		});

		progress?.(ProgressStepsAddToken.DONE);

		if (nonNullish(onSuccess)) {
			setTimeout(() => onSuccess(), 750);
		}

		tokens.forEach((token) => {
			const { enabled } = token;
			const address = 'address' in token ? token.address : undefined;
			const ledgerCanisterId = 'ledgerCanisterId' in token ? token.ledgerCanisterId : undefined;
			const indexCanisterId = 'indexCanisterId' in token ? token.indexCanisterId : undefined;
			const tokenId = 'id' in token ? token.id : undefined;
			const tokenSymbol = 'symbol' in token ? token.symbol : undefined;
			const network = 'network' in token ? token.network : undefined;

			trackEvent({
				name: enabled
					? TRACK_COUNT_MANAGE_TOKENS_ENABLE_SUCCESS
					: TRACK_COUNT_MANAGE_TOKENS_DISABLE_SUCCESS,
				metadata: {
					...(nonNullish(address) && { address }),
					...(nonNullish(ledgerCanisterId) && { ledgerCanisterId }),
					...(nonNullish(indexCanisterId) && { indexCanisterId }),
					...(nonNullish(tokenId) && { tokenId: `${tokenId.description}` }),
					...(nonNullish(tokenSymbol) && { tokenSymbol }),
					...(nonNullish(network) && { networkId: `${network.id.description}` }),
					...{ source: MANAGE_TOKENS_MODAL_ROUTE }
				}
			});

			trackTokenManageResults({
				tokens: [token],
				modifier,
				sourceLocation: tokenManageSourceLocation,
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS
			});
		});
	} catch (err: unknown) {
		const versionMismatch = isVersionMismatchError(err);

		if (versionMismatch) {
			toastsShow({
				text: $i18n.tokens.error.version_mismatch,
				level: 'warn'
			});
		} else {
			toastsError({
				msg: { text: $i18n.tokens.error.unexpected },
				err
			});
		}

		onError?.();

		trackEvent({
			name: TRACK_COUNT_MANAGE_TOKENS_SAVE_ERROR,
			metadata: mapIcErrorMetadata(err)
		});

		trackTokenManageResults({
			tokens,
			modifier,
			sourceLocation: tokenManageSourceLocation,
			resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
			error: errorDetailToString(err),
			...(versionMismatch && { errorCode: 'version_mismatch' })
		});
	}
};

export const saveCustomTokensWithKey = async ({
	tokens,
	...rest
}: {
	tokens: SaveCustomTokenWithKey[];
} & ManageTokensSaveParams) => {
	await saveTokens({
		...rest,
		tokens,
		save: saveCustomTokens
	});
};
