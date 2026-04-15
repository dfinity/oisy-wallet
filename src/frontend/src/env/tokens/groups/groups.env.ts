import { AMDON_TOKEN_GROUP } from '$env/tokens/groups/groups.amdon.env';
import { ARB_TOKEN_GROUP } from '$env/tokens/groups/groups.arb.env';
import { ARMON_TOKEN_GROUP } from '$env/tokens/groups/groups.armon.env';
import { BABAON_TOKEN_GROUP } from '$env/tokens/groups/groups.babaon.env';
import { BIDUON_TOKEN_GROUP } from '$env/tokens/groups/groups.biduon.env';
import { BOB_TOKEN_GROUP } from '$env/tokens/groups/groups.bob.env';
import { BONK_TOKEN_GROUP } from '$env/tokens/groups/groups.bonk.env';
import { BTC_TOKEN_GROUP } from '$env/tokens/groups/groups.btc.env';
import { CBBTC_TOKEN_GROUP } from '$env/tokens/groups/groups.cbbtc.env';
import { COPXON_TOKEN_GROUP } from '$env/tokens/groups/groups.copxon.env';
import { EEMON_TOKEN_GROUP } from '$env/tokens/groups/groups.eemon.env';
import { EFAON_TOKEN_GROUP } from '$env/tokens/groups/groups.efaon.env';
import { ETH_TOKEN_GROUP } from '$env/tokens/groups/groups.eth.env';
import { EURC_TOKEN_GROUP } from '$env/tokens/groups/groups.eurc.env';
import { GLDT_TOKEN_GROUP } from '$env/tokens/groups/groups.gldt.env';
import { IAUON_TOKEN_GROUP } from '$env/tokens/groups/groups.iauon.env';
import { IVVON_TOKEN_GROUP } from '$env/tokens/groups/groups.ivvon.env';
import { LINK_TOKEN_GROUP } from '$env/tokens/groups/groups.link.env';
import { MUON_TOKEN_GROUP } from '$env/tokens/groups/groups.muon.env';
import { NVDAON_TOKEN_GROUP } from '$env/tokens/groups/groups.nvdaon.env';
import { OCT_TOKEN_GROUP } from '$env/tokens/groups/groups.oct.env';
import { PBRON_TOKEN_GROUP } from '$env/tokens/groups/groups.pbron.env';
import { PEPE_TOKEN_GROUP } from '$env/tokens/groups/groups.pepe.env';
import { SHIB_TOKEN_GROUP } from '$env/tokens/groups/groups.shib.env';
import { SLVON_TOKEN_GROUP } from '$env/tokens/groups/groups.slvon.env';
import { SPX_TOKEN_GROUP } from '$env/tokens/groups/groups.spx.env';
import { UNI_TOKEN_GROUP } from '$env/tokens/groups/groups.uni.env';
import { USDC_TOKEN_GROUP } from '$env/tokens/groups/groups.usdc.env';
import { USDT_TOKEN_GROUP } from '$env/tokens/groups/groups.usdt.env';
import { WBTC_TOKEN_GROUP } from '$env/tokens/groups/groups.wbtc.env';
import { WETH_TOKEN_GROUP } from '$env/tokens/groups/groups.weth.env';
import { WSTETH_TOKEN_GROUP } from '$env/tokens/groups/groups.wsteth.env';
import { XAUT_TOKEN_GROUP } from '$env/tokens/groups/groups.xaut.env';
import { ZCHF_TOKEN_GROUP } from '$env/tokens/groups/groups.zchf.env';
import type { TokenGroupData } from '$lib/types/token-group';
import { nonNullish } from '@dfinity/utils';

const TOKEN_GROUPS: TokenGroupData[] = [
	AMDON_TOKEN_GROUP,
	ARB_TOKEN_GROUP,
	ARMON_TOKEN_GROUP,
	BABAON_TOKEN_GROUP,
	BIDUON_TOKEN_GROUP,
	BOB_TOKEN_GROUP,
	BONK_TOKEN_GROUP,
	BTC_TOKEN_GROUP,
	CBBTC_TOKEN_GROUP,
	COPXON_TOKEN_GROUP,
	EEMON_TOKEN_GROUP,
	EFAON_TOKEN_GROUP,
	ETH_TOKEN_GROUP,
	EURC_TOKEN_GROUP,
	IAUON_TOKEN_GROUP,
	IVVON_TOKEN_GROUP,
	LINK_TOKEN_GROUP,
	MUON_TOKEN_GROUP,
	NVDAON_TOKEN_GROUP,
	OCT_TOKEN_GROUP,
	PBRON_TOKEN_GROUP,
	PEPE_TOKEN_GROUP,
	SHIB_TOKEN_GROUP,
	SLVON_TOKEN_GROUP,
	SPX_TOKEN_GROUP,
	UNI_TOKEN_GROUP,
	USDC_TOKEN_GROUP,
	USDT_TOKEN_GROUP,
	WBTC_TOKEN_GROUP,
	WETH_TOKEN_GROUP,
	WSTETH_TOKEN_GROUP,
	XAUT_TOKEN_GROUP,
	ZCHF_TOKEN_GROUP
];

export const TOKEN_GROUPS_BY_SYMBOL: Record<string, TokenGroupData> = TOKEN_GROUPS.reduce(
	(acc, group) =>
		nonNullish(group.id.description)
			? {
					...acc,
					[group.id.description]: group
				}
			: acc,
	{}
);
