import { MILLISECONDS_IN_SECOND, NANO_SECONDS_IN_SECOND } from '$lib/constants/app.constants';

export const nowInBigIntNanoSeconds = (): bigint => BigInt(Date.now()) * BigInt(1e6);

export const normalizeTimestampToSeconds = (timestamp: number | bigint): number => {
	const ts = Number(timestamp);

	return ts > 1e15
		? ts / Number(NANO_SECONDS_IN_SECOND)
		: ts > 1e12
			? ts / Number(MILLISECONDS_IN_SECOND)
			: ts;
};
