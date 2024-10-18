import { ETHEREUM_TOKEN, ICP_TOKEN } from '../../../src/frontend/src/env/tokens.env';
import type { RequiredTokenWithLinkedData } from '../../../src/frontend/src/lib/types/token';

export const tokens: [RequiredTokenWithLinkedData, ...RequiredTokenWithLinkedData[]] = [
	ICP_TOKEN,
	ETHEREUM_TOKEN
];
