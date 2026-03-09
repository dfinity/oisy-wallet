import type { OptionEthAddress } from '$eth/types/address';
import type { OptionCertifiedMinterInfo } from '$icp-eth/types/cketh-minter';
import {
	toCkErc20HelperContractAddress,
	toCkEthHelperContractAddress,
	toCkMinterAddress
} from '$icp-eth/utils/cketh.utils';
import { ZERO } from '$lib/constants/app.constants';
import type { ContactUi } from '$lib/types/contact';
import { nonNullish } from '@dfinity/utils';

const CK_MINTER_CONTRACT_DEFS: {
	name: string;
	addressFn: (minterInfo: OptionCertifiedMinterInfo) => OptionEthAddress;
}[] = [
	{ name: 'ckETH Minter Helper Contract', addressFn: toCkEthHelperContractAddress },
	{ name: 'ckERC20 Minter Helper Contract', addressFn: toCkErc20HelperContractAddress },
	{ name: 'CK Ethereum Minter', addressFn: toCkMinterAddress }
];

const BUILT_IN_CONTACT_ID_BASE = -100_000n;

/**
 * Builds built-in `ContactUi` entries for CK minter contract addresses derived from minter info.
 *
 * These act as "system contacts" so that minter addresses get resolved automatically
 * wherever contacts are displayed (transaction lists, modals, WalletConnect, etc.).
 */
export const toCkMinterBuiltInContacts = ({
	minterInfo,
	idOffset = ZERO
}: {
	minterInfo: OptionCertifiedMinterInfo;
	idOffset?: bigint;
}): ContactUi[] =>
	CK_MINTER_CONTRACT_DEFS.reduce<ContactUi[]>((contacts, { name, addressFn }, index) => {
		const address = addressFn(minterInfo);

		if (nonNullish(address)) {
			contacts.push({
				id: BUILT_IN_CONTACT_ID_BASE - idOffset - BigInt(index),
				name,
				addresses: [{ address, addressType: 'Eth' }],
				updateTimestampNs: ZERO
			});
		}

		return contacts;
	}, []);
