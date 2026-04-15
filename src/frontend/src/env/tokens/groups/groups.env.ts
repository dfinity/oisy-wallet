import type { TokenGroupData } from '$lib/types/token-group';
import { AMDON_TOKEN_GROUP } from './groups.amdon.env';
import { ARB_TOKEN_GROUP } from './groups.arb.env';
import { ARMON_TOKEN_GROUP } from './groups.armon.env';
import { BABAON_TOKEN_GROUP } from './groups.babaon.env';
import { BIDUON_TOKEN_GROUP } from './groups.biduon.env';
import { BOB_TOKEN_GROUP } from './groups.bob.env';
import { BONK_TOKEN_GROUP } from './groups.bonk.env';
import { BTC_TOKEN_GROUP } from './groups.btc.env';
import { CBBTC_TOKEN_GROUP } from './groups.cbbtc.env';
import { COPXON_TOKEN_GROUP } from './groups.copxon.env';
import { EEMON_TOKEN_GROUP } from './groups.eemon.env';
import { EFAON_TOKEN_GROUP } from './groups.efaon.env';
import { ETH_TOKEN_GROUP } from './groups.eth.env';
import { EURC_TOKEN_GROUP } from './groups.eurc.env';
import { IAUON_TOKEN_GROUP } from './groups.iauon.env';
import { IVVON_TOKEN_GROUP } from './groups.ivvon.env';
import { LINK_TOKEN_GROUP } from './groups.link.env';
import { MUON_TOKEN_GROUP } from './groups.muon.env';
import { NVDAON_TOKEN_GROUP } from './groups.nvdaon.env';
import { OCT_TOKEN_GROUP } from './groups.oct.env';
import { PBRON_TOKEN_GROUP } from './groups.pbron.env';
import { PEPE_TOKEN_GROUP } from './groups.pepe.env';
import { SHIB_TOKEN_GROUP } from './groups.shib.env';
import { SLVON_TOKEN_GROUP } from './groups.slvon.env';
import { SPX_TOKEN_GROUP } from './groups.spx.env';
import { UNI_TOKEN_GROUP } from './groups.uni.env';
import { USDC_TOKEN_GROUP } from './groups.usdc.env';
import { USDT_TOKEN_GROUP } from './groups.usdt.env';
import { WBTC_TOKEN_GROUP } from './groups.wbtc.env';
import { WETH_TOKEN_GROUP } from './groups.weth.env';
import { WSTETH_TOKEN_GROUP } from './groups.wsteth.env';
import { XAUT_TOKEN_GROUP } from './groups.xaut.env';
import { ZCHF_TOKEN_GROUP } from './groups.zchf.env';

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
	(acc, group) => ({
		...acc,
		[group.symbol]: group
	}),
	{}
);
