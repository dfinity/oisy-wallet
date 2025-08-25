import { ICP_TOKEN, TESTICP_TOKEN } from '$env/tokens/tokens.icp.env';
import type { IcToken } from '$icp/types/ic-token';
import { testnetsEnabled } from '$lib/derived/testnets.derived';
import { derived, type Readable } from 'svelte/store';

export const defaultIcpTokens: Readable<IcToken[]> = derived(
	[testnetsEnabled],
	([$testnetsEnabled]) => [ICP_TOKEN, ...($testnetsEnabled ? [TESTICP_TOKEN] : [])]
);
