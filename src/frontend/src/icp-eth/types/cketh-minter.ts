import type { CertifiedData } from '$lib/types/store';
import type { Option } from '$lib/types/utils';
import type { MinterInfo } from '@dfinity/cketh';

export type OptionCertifiedMinterInfo = Option<CertifiedData<MinterInfo>>;
