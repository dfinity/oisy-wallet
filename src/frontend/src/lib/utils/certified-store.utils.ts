import type { CertifiedData } from '$lib/types/store';
import type { Option } from '$lib/types/utils';

export const mapCertifiedData = <T>(certifiedData: Option<CertifiedData<T>>): Option<T> =>
	// eslint-disable-next-line local-rules/use-nullish-checks -- We need to check for null explicitly, since it is the scope of this function.
	certifiedData === null ? null : certifiedData?.data;
