import type { CertifiedData } from '$lib/types/store';
import type { Option } from '$lib/types/utils';
import type { CkEthMinterDid } from '@icp-sdk/canisters/cketh';

export type OptionCertifiedMinterInfo = Option<CertifiedData<CkEthMinterDid.MinterInfo>>;
