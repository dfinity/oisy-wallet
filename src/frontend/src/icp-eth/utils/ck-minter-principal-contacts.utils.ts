import {
	IC_CKBTC_MINTER_CANISTER_ID,
	LOCAL_CKBTC_MINTER_CANISTER_ID,
	STAGING_CKBTC_MINTER_CANISTER_ID
} from '$env/tokens/tokens-icrc/tokens.icrc.ck.btc.env';
import {
	IC_CKETH_MINTER_CANISTER_ID,
	LOCAL_CKETH_MINTER_CANISTER_ID,
	STAGING_CKETH_MINTER_CANISTER_ID
} from '$env/tokens/tokens-icrc/tokens.icrc.ck.eth.env';
import { CK_ETHEREUM_MINTER_DISPLAY_NAME } from '$icp-eth/utils/ck-minter-contacts.utils';
import { ZERO } from '$lib/constants/app.constants';
import type { OptionCanisterIdText } from '$lib/types/canister';
import type { ContactUi } from '$lib/types/contact';
import { nonNullish } from '@dfinity/utils';

export const CKBTC_MINTER_DISPLAY_NAME = 'ckBTC Minter';

const BUILT_IN_PRINCIPAL_CONTACT_ID_BASE = -200_000n;

const CK_MINTER_PRINCIPAL_DEFS: {
	name: string;
	canisterId: OptionCanisterIdText;
}[] = [
	{ name: CKBTC_MINTER_DISPLAY_NAME, canisterId: IC_CKBTC_MINTER_CANISTER_ID },
	{ name: CK_ETHEREUM_MINTER_DISPLAY_NAME, canisterId: IC_CKETH_MINTER_CANISTER_ID },
	...(nonNullish(STAGING_CKBTC_MINTER_CANISTER_ID)
		? [
				{
					name: `${CKBTC_MINTER_DISPLAY_NAME} (Testnet)`,
					canisterId: STAGING_CKBTC_MINTER_CANISTER_ID
				}
			]
		: []),
	...(nonNullish(STAGING_CKETH_MINTER_CANISTER_ID)
		? [
				{
					name: `${CK_ETHEREUM_MINTER_DISPLAY_NAME} (Testnet)`,
					canisterId: STAGING_CKETH_MINTER_CANISTER_ID
				}
			]
		: []),
	...(nonNullish(LOCAL_CKBTC_MINTER_CANISTER_ID)
		? [
				{
					name: `${CKBTC_MINTER_DISPLAY_NAME} (Local)`,
					canisterId: LOCAL_CKBTC_MINTER_CANISTER_ID
				}
			]
		: []),
	...(nonNullish(LOCAL_CKETH_MINTER_CANISTER_ID)
		? [
				{
					name: `${CK_ETHEREUM_MINTER_DISPLAY_NAME} (Local)`,
					canisterId: LOCAL_CKETH_MINTER_CANISTER_ID
				}
			]
		: [])
];

export const ckMinterPrincipalBuiltInContacts: ContactUi[] = CK_MINTER_PRINCIPAL_DEFS.reduce<
	ContactUi[]
>((contacts, { name, canisterId }, index) => {
	if (nonNullish(canisterId)) {
		contacts.push({
			id: BUILT_IN_PRINCIPAL_CONTACT_ID_BASE - BigInt(index),
			name,
			addresses: [{ address: canisterId, addressType: 'Icrcv2' }],
			updateTimestampNs: ZERO
		});
	}

	return contacts;
}, []);
