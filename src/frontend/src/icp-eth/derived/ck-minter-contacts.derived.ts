import { ETHEREUM_TOKEN_ID, SEPOLIA_TOKEN_ID } from '$env/tokens/tokens.eth.env';
import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
import { toCkMinterBuiltInContacts } from '$icp-eth/utils/ck-minter-contacts.utils';
import type { ContactUi } from '$lib/types/contact';
import type { TokenId } from '$lib/types/token';
import { isNullish, nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

const CK_MINTER_TOKEN_IDS: TokenId[] = [ETHEREUM_TOKEN_ID, SEPOLIA_TOKEN_ID];

export const ckMinterBuiltInContacts: Readable<ContactUi[]> = derived(
	[ckEthMinterInfoStore],
	([$ckEthMinterInfoStore]) => {
		if (isNullish($ckEthMinterInfoStore)) {
			return [];
		}

		return CK_MINTER_TOKEN_IDS.flatMap((tokenId, tokenIndex) => {
			const info = $ckEthMinterInfoStore[tokenId];
			if (!nonNullish(info)) {
				return [];
			}

			return toCkMinterBuiltInContacts({
				minterInfo: info,
				idOffset: BigInt(tokenIndex) * 100n
			});
		});
	}
);
