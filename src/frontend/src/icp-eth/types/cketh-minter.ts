import type { CertifiedData } from '$lib/types/store';
import type { Option } from '$lib/types/utils';
import type { MinterInfo } from '@icp-sdk/canisters/cketh';

export type OptionCertifiedMinterInfo = Option<CertifiedData<MinterInfo>>;
