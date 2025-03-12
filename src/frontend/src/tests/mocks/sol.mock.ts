import type { SolAddress } from '$lib/types/address';
import { parseSolAddress } from '$lib/validation/address.validation';

export const mockSolAddress: SolAddress = parseSolAddress(
	'AeZDiNSSTvGxxD92vao15YRV7f4c4Q1GfcKnwezXucZa'
);

export const mockSolAddress2: SolAddress = parseSolAddress(
	'4GsmSut5stEKJHsGfiTeP5c6VbPyt4KmtCQ9TAM56JR8'
);

export const mockAtaAddress: SolAddress = parseSolAddress(
	'HoTxtcVxVKNqhkV1pLGfqhajbSi3se6wKm3y7CJwLULd'
);

export const mockAtaAddress2: SolAddress = parseSolAddress(
	'4nzwUd9Hz1UsqSictRfj18stbX1iSZotqzRHpznvA7iz'
);

export const mockAtaAddress3: SolAddress = parseSolAddress(
	'2MGjrMLivLM1GxDx9Tak5k1g9RH2We3SV1rVMWgUjm2L'
);

export const mockSplAddress: SolAddress = parseSolAddress(
	'CcExVbJ17Pec4SyiAsxXQZKCDSqdv3r9cNTLNrFRrbta'
);
