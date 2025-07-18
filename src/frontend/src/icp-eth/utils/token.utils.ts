import { isTokenIcrc } from '$icp/utils/icrc.utils';
import type { Token } from '$lib/types/token';

export const isGLDTToken = (token: Token): boolean => isTokenIcrc(token) && token.symbol === 'GLDT';

export const isVCHFToken = (token: Token): boolean => isTokenIcrc(token) && token.symbol === 'VCHF';

export const isVEURToken = (token: Token): boolean => isTokenIcrc(token) && token.symbol === 'VEUR';
