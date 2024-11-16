import type { HideInfoKey } from '$lib/utils/info.utils';

export type CkHideInfoKey = Extract<
	HideInfoKey,
	| 'oisy_ic_hide_icp_info'
	| 'oisy_ic_hide_bitcoin_info'
	| 'oisy_ic_hide_ethereum_info'
	| 'oisy_ic_hide_erc20_info'
>;
