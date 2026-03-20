import type { CertifiedData } from '$lib/types/store';
import type { Nullish } from '@dfinity/zod-schemas';
import type { CkEthMinterDid } from '@icp-sdk/canisters/cketh';

export type OptionCertifiedMinterInfo = Nullish<CertifiedData<CkEthMinterDid.MinterInfo>>;
