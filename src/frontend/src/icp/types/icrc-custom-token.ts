import type { IcToken } from '$icp/types/ic-token';
import type { CustomToken } from '$lib/types/custom-token';
import type { Option } from '$lib/types/utils';

export type IcrcCustomToken = CustomToken<IcToken>;

export type OptionIcrcCustomToken = Option<IcrcCustomToken>;
