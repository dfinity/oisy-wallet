<script lang="ts">
	import type { NonFungibleToken } from '$lib/types/nft';
	import { nonNullish } from '@dfinity/utils';
	import { CustomTokenSection } from '$lib/enums/custom-token-section';
	import NftActionButton from '$lib/components/nfts/NftActionButton.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { authIdentity } from '$lib/derived/auth.derived';
	import {
		NFT_COLLECTION_ACTION_HIDE,
		NFT_COLLECTION_ACTION_UNHIDE
	} from '$lib/constants/test-ids.constants';
	import { updateNftSection } from '$lib/services/nft.services';
	import IconEye from '$lib/components/icons/lucide/IconEye.svelte';
	import IconEyeOff from '$lib/components/icons/lucide/IconEyeOff.svelte';

	interface Props {
		token: NonFungibleToken;
	}

	let { token }: Props = $props();
</script>

{#if token.section !== CustomTokenSection.SPAM}
	{#if nonNullish(token.section) && token.section === CustomTokenSection.HIDDEN}
		<NftActionButton
			colorStyle="primary"
			label={$i18n.nfts.text.unhide}
			onclick={() => updateNftSection({ section: undefined, token, $authIdentity })}
			testId={NFT_COLLECTION_ACTION_UNHIDE}
		>
			{#snippet icon()}
				<IconEye size="18" />
			{/snippet}
		</NftActionButton>
	{:else}
		<NftActionButton
			label={$i18n.nfts.text.hide}
			onclick={() => updateNftSection({ section: CustomTokenSection.HIDDEN, token, $authIdentity })}
			testId={NFT_COLLECTION_ACTION_HIDE}
		>
			{#snippet icon()}
				<IconEyeOff size="18" />
			{/snippet}
		</NftActionButton>
	{/if}
{/if}
