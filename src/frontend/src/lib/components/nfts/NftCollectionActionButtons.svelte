<script lang="ts">
	import { isNullish, nonNullish, toNullable } from '@dfinity/utils';
	import { saveCustomTokens as saveCustomErc1155Token } from '$eth/services/erc1155-custom-tokens.services';
	import { saveCustomTokens as saveCustomErc721Token } from '$eth/services/erc721-custom-tokens.services';
	import IconAlertOctagon from '$lib/components/icons/lucide/IconAlertOctagon.svelte';
	import IconEye from '$lib/components/icons/lucide/IconEye.svelte';
	import IconEyeOff from '$lib/components/icons/lucide/IconEyeOff.svelte';
	import NftCollectionActionButton from '$lib/components/nfts/NftCollectionActionButton.svelte';
	import {
		NFT_COLLECTION_ACTION_HIDE,
		NFT_COLLECTION_ACTION_NOT_SPAM,
		NFT_COLLECTION_ACTION_SPAM,
		NFT_COLLECTION_ACTION_UNHIDE
	} from '$lib/constants/test-ids.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { CustomTokenSection } from '$lib/enums/custom-token-section';
	import { i18n } from '$lib/stores/i18n.store';
	import type { NonFungibleToken } from '$lib/types/nft';

	interface Props {
		token: NonFungibleToken;
	}

	let { token }: Props = $props();

	const updateSection = async (section: CustomTokenSection | undefined) => {
		if (isNullish($authIdentity)) {
			return;
		}

		if (nonNullish(token)) {
			if (token.standard === 'erc721') {
				await saveCustomErc721Token({
					identity: $authIdentity,
					tokens: [
						{
							...token,
							enabled: true,
							section,
							...(section === CustomTokenSection.SPAM && { allowExternalContentSource: false })
						}
					]
				});
			}
			if (token.standard === 'erc1155') {
				await saveCustomErc1155Token({
					identity: $authIdentity,
					tokens: [
						{
							...token,
							enabled: true,
							section,
							...(section === CustomTokenSection.SPAM && { allowExternalContentSource: false })
						}
					]
				});
			}
		}
	};
</script>

<div class="flex gap-2">
	{#if nonNullish(token.section) && token.section === CustomTokenSection.SPAM}
		<NftCollectionActionButton
			label={$i18n.nfts.text.not_spam}
			onclick={() => updateSection(undefined)}
			testId={NFT_COLLECTION_ACTION_NOT_SPAM}
		>
			{#snippet icon()}
				<IconAlertOctagon size="18" />
			{/snippet}
		</NftCollectionActionButton>
	{:else}
		<NftCollectionActionButton
			label={$i18n.nfts.text.spam}
			onclick={() => updateSection(CustomTokenSection.SPAM)}
			testId={NFT_COLLECTION_ACTION_SPAM}
		>
			{#snippet icon()}
				<IconAlertOctagon size="18" />
			{/snippet}
		</NftCollectionActionButton>

		{#if nonNullish(token.section) && token.section === CustomTokenSection.HIDDEN}
			<NftCollectionActionButton
				colorStyle="primary"
				label={$i18n.nfts.text.unhide}
				onclick={() => updateSection(undefined)}
				testId={NFT_COLLECTION_ACTION_UNHIDE}
			>
				{#snippet icon()}
					<IconEye size="18" />
				{/snippet}
			</NftCollectionActionButton>
		{:else}
			<NftCollectionActionButton
				label={$i18n.nfts.text.hide}
				onclick={() => updateSection(CustomTokenSection.HIDDEN)}
				testId={NFT_COLLECTION_ACTION_HIDE}
			>
				{#snippet icon()}
					<IconEyeOff size="18" />
				{/snippet}
			</NftCollectionActionButton>
		{/if}
	{/if}
</div>
