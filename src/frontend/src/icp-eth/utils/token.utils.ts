import {
	GLDT_LEDGER_CANISTER_ID,
	VCHF_LEDGER_CANISTER_ID,
	VEUR_LEDGER_CANISTER_ID
} from '$env/networks/networks.icrc.env';
import { GOLDAO_LEDGER_CANISTER_ID } from '$env/tokens/tokens.sns.env';
import { isTokenIcrc } from '$icp/utils/icrc.utils';
import type { Token } from '$lib/types/token';

export const isGLDTToken = (token: Token): boolean =>
	isTokenIcrc(token) &&
	token.symbol === 'GLDT' &&
	token.ledgerCanisterId === GLDT_LEDGER_CANISTER_ID;

export const isGoldaoToken = (token: Token): boolean =>
	isTokenIcrc(token) &&
	token.symbol === 'GOLDAO' &&
	token.ledgerCanisterId === GOLDAO_LEDGER_CANISTER_ID;

export const isVCHFToken = (token: Token): boolean =>
	isTokenIcrc(token) &&
	token.symbol === 'VCHF' &&
	token.ledgerCanisterId === VCHF_LEDGER_CANISTER_ID;

export const isVEURToken = (token: Token): boolean =>
	isTokenIcrc(token) &&
	token.symbol === 'VEUR' &&
	token.ledgerCanisterId === VEUR_LEDGER_CANISTER_ID;
