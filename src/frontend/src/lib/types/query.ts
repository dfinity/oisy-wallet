import type { LoadCustomTokenParams } from '$lib/types/custom-token';
import type { QueryAndUpdateParams } from '@dfinity/utils';

export type QueryAndUpdateOrHydrateParams<R, E = unknown> = Omit<
	QueryAndUpdateParams<R, E>,
	'request' | 'onUpdateError'
> &
	Required<Pick<QueryAndUpdateParams<R, E>, 'onUpdateError'>> & {
		request: (params: LoadCustomTokenParams) => Promise<R>;
	} & LoadCustomTokenParams;
