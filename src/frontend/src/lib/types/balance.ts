import { BigNumber } from '@ethersproject/bignumber';
import type { OptionalNullable } from './utils';

export type Balance = BigNumber;

export type OptionBalance = OptionalNullable<Balance>;
