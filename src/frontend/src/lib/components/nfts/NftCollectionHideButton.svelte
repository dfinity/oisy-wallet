<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { saveCustomTokens as saveCustomErc1155Token } from '$eth/services/erc1155-custom-tokens.services';
	import { saveCustomTokens as saveCustomErc721Token } from '$eth/services/erc721-custom-tokens.services';
	import IconEyeOff from '$lib/components/icons/lucide/IconEyeOff.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { nonFungibleTokens } from '$lib/derived/tokens.derived';
	import { CustomTokenSection } from '$lib/enums/custom-token-section';
	import type { NftCollection } from '$lib/types/nft';
	import type { NonEmptyArray } from '$lib/types/utils';
	import { findNonFungibleToken } from '$lib/utils/nfts.utils';
	import type { SaveErc721CustomToken } from '$eth/types/erc721-custom-token';

	interface Props {
		collection: NftCollection;
	}

	let { collection }: Props = $props();

	const handleClick = async () => {
		if (isNullish($authIdentity)) {
			return;
		}

		const token = findNonFungibleToken({
			tokens: $nonFungibleTokens,
			address: collection.address,
			networkId: collection.network.id
		});

		if(nonNullish(token)) {
			if (token.standard === 'erc721') {
				await saveCustomErc721Token({
					identity: $authIdentity,
					tokens: [{ ...token, section: CustomTokenSection.HIDDEN }] as NonEmptyArray<SaveErc721CustomToken>
				});
			}
			if (token.standard === 'erc1155') {
				await saveCustomErc1155Token({
					identity: $authIdentity,
					tokens: [{ ...token, section: CustomTokenSection.HIDDEN }]
				});
			}
		}
	}

</script>

<Button
	colorStyle="tertiary-alt"
	innerStyleClass="h-5"
	onclick={handleClick}
	paddingSmall
	styleClass="rounded-lg border-brand-subtle-30 p-2"
>
	<span class="flex items-center gap-1">
		<IconEyeOff size="18" />
		<span class="flex px-[2px] font-semibold">Hide</span>
	</span>
</Button>
