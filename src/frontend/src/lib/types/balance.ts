import { BigNumber } from '@ethersproject/bignumber';
import type { Option } from './utils';

export type Balance = BigNumber;

export type OptionBalance = Option<Balance>;
