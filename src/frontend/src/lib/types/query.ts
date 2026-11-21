import type { QueryAndUpdateParams, QueryAndUpdateRequestParams } from '@dfinity/utils';

export type QueryAndUpdateOrHydrateParams<R, P, E = unknown> = Omit<
	QueryAndUpdateParams<R, E>,
	'request'
> & {
	certified: boolean;
	provided?: P[];
	request: (params: QueryAndUpdateRequestParams & { provided?: P[] }) => Promise<R>;
};
