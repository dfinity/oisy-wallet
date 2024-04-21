import type { CertifiedData } from '$lib/types/store';
import type { MinterInfo } from '@dfinity/cketh';

export type OptionCertifiedMinterInfo = CertifiedData<MinterInfo> | undefined | null;
