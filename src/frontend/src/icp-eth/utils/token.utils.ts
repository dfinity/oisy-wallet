import { GLDT_LEDGER_CANISTER_ID } from '$env/networks/networks.icrc.env';
import { isTokenIcrc } from '$icp/utils/icrc.utils';
import type { Token } from '$lib/types/token';

export const isGLDTToken = (token: Token): boolean =>
	isTokenIcrc(token) &&
	token.symbol === 'GLDT' &&
	token.ledgerCanisterId === GLDT_LEDGER_CANISTER_ID;

export const isVCHFToken = (token: Token): boolean => isTokenIcrc(token) && token.symbol === 'VCHF';

export const isVEURToken = (token: Token): boolean => isTokenIcrc(token) && token.symbol === 'VEUR';
