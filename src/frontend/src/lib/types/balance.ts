import { BigNumber } from '@ethersproject/bignumber';
import type { Nullable, OptionalNullable } from './utils';

export type Balance = BigNumber;

export type NullableBalance = Nullable<Balance>;

export type OptionalNullableBalance = OptionalNullable<Balance>;
