<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { erc1155CustomTokens } from '$eth/derived/erc1155.derived';
	import { erc721CustomTokens } from '$eth/derived/erc721.derived';
	import { saveCustomTokens as saveCustomErc1155Token } from '$eth/services/erc1155-custom-tokens.services';
	import { saveCustomTokens as saveCustomErc721Token } from '$eth/services/erc721-custom-tokens.services';
	import IconAlertOctagon from '$lib/components/icons/lucide/IconAlertOctagon.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { nonFungibleTokens } from '$lib/derived/tokens.derived';
	import { CustomTokenSection } from '$lib/enums/custom-token-section';
	import type { NftCollection } from '$lib/types/nft';
	import { findNonFungibleToken } from '$lib/utils/nfts.utils';

	interface Props {
		collection: NftCollection;
	}

	let { collection }: Props = $props();
</script>

<Button
	colorStyle="tertiary-alt"
	innerStyleClass="h-5"
	onclick={async () => {
		if (isNullish($authIdentity)) {
			return;
		}

		const token = findNonFungibleToken({
			tokens: [...$erc721CustomTokens, ...$erc1155CustomTokens],
			address: collection.address,
			networkId: collection.network.id
		});

		if (nonNullish(token)) {
			if (token.standard === 'erc721') {
				await saveCustomErc721Token({
					identity: $authIdentity,
					tokens: [{ ...token, enabled: true, section: CustomTokenSection.SPAM }]
				});
			}
			if (token.standard === 'erc1155') {
				await saveCustomErc1155Token({
					identity: $authIdentity,
					tokens: [{ ...token, enabled: true, section: CustomTokenSection.SPAM }]
				});
			}
		}
	}}
	paddingSmall
	styleClass="rounded-lg border-brand-subtle-30 p-2"
>
	<span class="flex items-center gap-1">
		<IconAlertOctagon size="18" />
		<span class="flex px-[2px] font-semibold">Spam</span>
	</span>
</Button>
