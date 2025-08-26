import type { SaveUserToken } from '$eth/services/erc20-user-tokens.services';
import type { SaveErc1155CustomToken } from '$eth/types/erc1155-custom-token';
import type { SaveErc721CustomToken } from '$eth/types/erc721-custom-token';
import {
	MANAGE_TOKENS_MODAL_ROUTE,
	TRACK_COUNT_MANAGE_TOKENS_DISABLE_SUCCESS,
	TRACK_COUNT_MANAGE_TOKENS_ENABLE_SUCCESS,
	TRACK_COUNT_MANAGE_TOKENS_SAVE_ERROR
} from '$lib/constants/analytics.contants';
import { ProgressStepsAddToken } from '$lib/enums/progress-steps';
import { trackEvent } from '$lib/services/analytics.services';
import { nullishSignOut } from '$lib/services/auth.services';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { SaveCustomTokenWithKey } from '$lib/types/custom-token';
import type { OptionIdentity } from '$lib/types/identity';
import type { Token } from '$lib/types/token';
import type { TokenToggleable } from '$lib/types/token-toggleable';
import type { NonEmptyArray } from '$lib/types/utils';
import { mapIcErrorMetadata } from '$lib/utils/error.utils';
import type { SaveSplCustomToken } from '$sol/types/spl-custom-token';
import type { Identity } from '@dfinity/agent';
import { isNullish, nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export interface ManageTokensSaveParams {
	progress?: (step: ProgressStepsAddToken) => void;
	modalNext?: () => void;
	onSuccess?: () => void;
	onError?: () => void;
	identity: OptionIdentity;
}

export interface SaveTokensParams<T> {
	progress?: (step: ProgressStepsAddToken) => void;
	identity: Identity;
	tokens: NonEmptyArray<T>;
}

export const saveTokens = async <
	T extends
		| SaveUserToken
		| SaveCustomTokenWithKey
		| SaveSplCustomToken
		| SaveErc721CustomToken
		| SaveErc1155CustomToken
		| TokenToggleable<Token>
>({
	tokens,
	save,
	progress,
	modalNext,
	onSuccess,
	onError,
	identity
}: {
	tokens: T[];
	save: (params: SaveTokensParams<T>) => Promise<void>;
} & ManageTokensSaveParams) => {
	const $i18n = get(i18n);

	if (isNullish(identity)) {
		await nullishSignOut();
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
		});
	} catch (err: unknown) {
		toastsError({
			msg: { text: $i18n.tokens.error.unexpected },
			err
		});

		onError?.();

		trackEvent({
			name: TRACK_COUNT_MANAGE_TOKENS_SAVE_ERROR,
			metadata: mapIcErrorMetadata(err)
		});
	}
};
