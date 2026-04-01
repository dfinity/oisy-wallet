import type { Origin } from '@dfinity/oisy-wallet-signer';
import { isNullish } from '@dfinity/utils';
import type { Nullish } from '@dfinity/zod-schemas';

const UNKNOWN_ORIGIN = 'unknown';

export const mapDerivationPath = (derivationPath: string[]): Uint8Array[] =>
	derivationPath.map((s) => Uint8Array.from([...s].map((char) => char.charCodeAt(0))));

export const mapSignerOriginHost = (origin: Nullish<Origin>): string => {
	if (isNullish(origin)) {
		return UNKNOWN_ORIGIN;
	}

	try {
		return new URL(origin).host;
	} catch {
		return UNKNOWN_ORIGIN;
	}
};
