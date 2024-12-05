import type { CertifiedData } from '$lib/types/store';
import type { Option } from '$lib/types/utils';

export const mapCertifiedData = <T>(certifiedData: Option<CertifiedData<T>>): Option<T> =>
	certifiedData === null ? null : certifiedData?.data;
