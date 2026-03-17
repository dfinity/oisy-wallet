import type { CertifiedData } from '$lib/types/store';
import type { Nullish } from '@dfinity/zod-schemas';

export type OptionCertifiedMinterInfo = Nullish<CertifiedData<MinterInfo>>;
