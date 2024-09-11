import type { CertifiedData } from '$lib/types/store';
import type { OptionalNullable } from '$lib/types/utils';
import type { MinterInfo } from '@dfinity/cketh';

export type OptionCertifiedMinterInfo = OptionalNullable<CertifiedData<MinterInfo>>;
