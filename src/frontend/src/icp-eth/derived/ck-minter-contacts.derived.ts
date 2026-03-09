import { ETHEREUM_TOKEN_ID, SEPOLIA_TOKEN_ID } from '$env/tokens/tokens.eth.env';
import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
import { toCkMinterBuiltInContacts } from '$icp-eth/utils/ck-minter-contacts.utils';
import type { ContactUi } from '$lib/types/contact';
import { isNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const ckMinterBuiltInContacts: Readable<ContactUi[]> = derived(
	[ckEthMinterInfoStore],
	([$ckEthMinterInfoStore]) => {
		if (isNullish($ckEthMinterInfoStore)) {
			return [];
		}

		return [ETHEREUM_TOKEN_ID, SEPOLIA_TOKEN_ID].flatMap((tokenId, tokenIndex) => {
			const info = $ckEthMinterInfoStore[tokenId];

			if (isNullish(info)) {
				return [];
			}

			return toCkMinterBuiltInContacts({
				minterInfo: info,
				idOffset: BigInt(tokenIndex) * 1_000n
			});
		});
	}
);
