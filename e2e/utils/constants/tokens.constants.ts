import { ETHEREUM_TOKEN, ICP_TOKEN } from '../../../src/frontend/src/env/tokens.env';
import type { RequiredToken } from '../../../src/frontend/src/lib/types/token';

export const tokens: [RequiredToken, ...RequiredToken[]] = [ICP_TOKEN, ETHEREUM_TOKEN];
