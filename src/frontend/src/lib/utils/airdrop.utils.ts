import type { Info } from '$declarations/airdrop/airdrop.did';
import { OISY_URL } from '$lib/constants/oisy.constants';
import { fromNullable } from '@dfinity/utils';

export const airdropCodeUrl = (code: string | undefined): string =>
	`${OISY_URL}/?code=${code ?? ''}`;

export const hasAirdropInvites = (airdrop: Info | undefined): boolean =>
	(fromNullable(airdrop?.children ?? [])?.length ?? 0) > 0;

export const allAirdropInvitesRedeemed = (airdrop: Info | undefined): boolean =>
	hasAirdropInvites(airdrop) &&
	(fromNullable(airdrop?.children ?? []) ?? []).find(([_, state]) => !state) === undefined;

export const isAirdropTransferred = (airdrop: Info | undefined): boolean =>
	airdrop?.tokens_transferred === true;

export const isAirdropOver = (airdrop: Info | undefined): boolean =>
	isAirdropTransferred(airdrop) &&
	(allAirdropInvitesRedeemed(airdrop) || !hasAirdropInvites(airdrop));
