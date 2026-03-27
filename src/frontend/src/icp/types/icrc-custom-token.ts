import type { IcToken } from '$icp/types/ic-token';
import type { CustomToken } from '$lib/types/custom-token';
import type { Nullish } from '@dfinity/zod-schemas';

export type IcrcCustomToken = CustomToken<IcToken>;

export type OptionIcrcCustomToken = Nullish<IcrcCustomToken>;
