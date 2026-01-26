import type { CustomToken as BackendCustomToken } from '$declarations/backend/backend.did';
import { loadNetworkCustomTokens } from '$lib/services/custom-tokens.services';
import { toastsError } from '$lib/stores/toasts.store';
import type { CustomToken, LoadCustomTokenParams } from '$lib/types/custom-token';
import type { Token } from '$lib/types/token';
import { nonNullish, type QueryAndUpdateRequestParams } from '@dfinity/utils';

export const mapBackendTokens = async <
	Variant extends BackendCustomToken,
	T extends CustomToken<Token>
>({
	tokens,
	filterCustomToken,
	mapCustomToken,
	errorMsg,
	...params
}: LoadCustomTokenParams & {
	filterCustomToken: (token: BackendCustomToken) => token is Variant;
	mapCustomToken: (
		params: { token: Variant } & QueryAndUpdateRequestParams
	) => Promise<T | undefined>;
	errorMsg: string;
}): Promise<T[]> => {
	const backendCustomTokens: BackendCustomToken[] =
		tokens ?? (await loadNetworkCustomTokens(params));

	const customTokenPromises = backendCustomTokens.reduce<Promise<T | undefined>[]>((acc, token) => {
		if (filterCustomToken(token)) {
			acc.push(
				mapCustomToken({
					token,
					identity: params.identity,
					certified: params.certified
				})
			);
		}

		return acc;
	}, []);

	const customTokens = await Promise.allSettled(customTokenPromises);

	return customTokens.reduce<T[]>((acc, result) => {
		if (result.status === 'fulfilled' && nonNullish(result.value)) {
			acc.push(result.value);
		}

		if (result.status === 'rejected' && params.certified) {
			toastsError({
				msg: { text: errorMsg },
				err: result.reason
			});
		}

		return acc;
	}, []);
};
