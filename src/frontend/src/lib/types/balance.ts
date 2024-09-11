import { BigNumber } from '@ethersproject/bignumber';

export type Balance = BigNumber;

export type NullableBalance = Balance | null;

export type OptionalNullableBalance = NullableBalance | undefined;
