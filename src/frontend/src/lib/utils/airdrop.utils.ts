import { OISY_URL } from '$lib/constants/oisy.constants';

export const airdropCodeUrl = (code: string | undefined): string =>
	`${OISY_URL}/?code=${code ?? ''}`;
