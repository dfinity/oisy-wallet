import type { Option } from '$lib/types/utils';
import { BigNumber } from '@ethersproject/bignumber';

export type Balance = BigNumber;

export type OptionBalance = Option<Balance>;
