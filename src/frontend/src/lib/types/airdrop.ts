import type { Principal } from '@dfinity/principal';

export interface AirdropsResponse {
	airdrops: AirdropInfo[];
	lastTimestamp: bigint;
}

export interface AirdropInfo {
	name: string | undefined;
	ledger: Principal;
	timestamp: bigint;
	amount: bigint;
}

export interface AirdropResult {
	receivedAirdrop: boolean;
	receivedJackpot: boolean;
}
