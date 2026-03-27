import type { CertifiedData } from '$lib/types/store';
import type { Nullish } from '@dfinity/zod-schemas';

export const mapCertifiedData = <T>(certifiedData: Nullish<CertifiedData<T>>): Nullish<T> =>
	certifiedData === null ? null : certifiedData?.data;
