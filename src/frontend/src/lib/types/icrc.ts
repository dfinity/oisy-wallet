import type { CanisterIdText } from '$lib/types/canister';
import type { Token } from '$lib/types/token';

export type IcrcToken = IcrcCanisters & Token & IcrcFee;

export type IcrcFee = { fee: bigint };

export type IcrcCanisters = { ledgerCanisterId: CanisterIdText; indexCanisterId: CanisterIdText };
