<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { nonFungibleCustomTokens } from '$eth/derived/tokens.derived';
	import { saveCustomTokens as saveCustomErc1155Token } from '$eth/services/erc1155-custom-tokens.services';
	import { saveCustomTokens as saveCustomErc721Token } from '$eth/services/erc721-custom-tokens.services';
	import IconAlertOctagon from '$lib/components/icons/lucide/IconAlertOctagon.svelte';
	import IconEye from '$lib/components/icons/lucide/IconEye.svelte';
	import IconEyeOff from '$lib/components/icons/lucide/IconEyeOff.svelte';
	import NftCollectionActionButton from '$lib/components/nfts/NftCollectionActionButton.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { CustomTokenSection } from '$lib/enums/custom-token-section';
	import type { NftCollection } from '$lib/types/nft';
	import { findNonFungibleToken } from '$lib/utils/nfts.utils';

	interface Props {
		collection: NftCollection;
	}

	let { collection }: Props = $props();

	const token = $derived(
		findNonFungibleToken({
			tokens: $nonFungibleCustomTokens,
			address: collection.address,
			networkId: collection.network.id
		})
	);

	const updateSection = async (section: CustomTokenSection | undefined) => {
		if (isNullish($authIdentity)) {
			return;
		}

		if (nonNullish(token)) {
			if (token.standard === 'erc721') {
				await saveCustomErc721Token({
					identity: $authIdentity,
					tokens: [{ ...token, section }]
				});
			}
			if (token.standard === 'erc1155') {
				await saveCustomErc1155Token({
					identity: $authIdentity,
					tokens: [{ ...token, section }]
				});
			}
		}
	};
</script>

<div class="flex gap-2">
	{#if nonNullish(token)}
		{#if token.section === CustomTokenSection.SPAM}
			<NftCollectionActionButton label="Not spam" onclick={() => updateSection(undefined)}>
				{#snippet icon()}
					<IconAlertOctagon size="18" />
				{/snippet}
			</NftCollectionActionButton>
		{:else}
			<NftCollectionActionButton label="Spam" onclick={() => updateSection(CustomTokenSection.SPAM)}>
				{#snippet icon()}
					<IconAlertOctagon size="18" />
				{/snippet}
			</NftCollectionActionButton>

			{#if token.section !== CustomTokenSection.HIDDEN}
				<NftCollectionActionButton
					label="Hide"
					onclick={() => updateSection(CustomTokenSection.HIDDEN)}
				>
					{#snippet icon()}
						<IconEyeOff size="18" />
					{/snippet}
				</NftCollectionActionButton>
			{:else}
				<NftCollectionActionButton
					colorStyle="primary"
					label="Unhide"
					onclick={() => updateSection(undefined)}
				>
					{#snippet icon()}
						<IconEye size="18" />
					{/snippet}
				</NftCollectionActionButton>
			{/if}
		{/if}
	{/if}
</div>
