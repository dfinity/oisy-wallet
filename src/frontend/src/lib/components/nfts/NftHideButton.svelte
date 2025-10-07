<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import IconEye from '$lib/components/icons/lucide/IconEye.svelte';
	import IconEyeOff from '$lib/components/icons/lucide/IconEyeOff.svelte';
	import NftActionButton from '$lib/components/nfts/NftActionButton.svelte';
	import {
		NFT_COLLECTION_ACTION_HIDE,
		NFT_COLLECTION_ACTION_UNHIDE
	} from '$lib/constants/test-ids.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { CustomTokenSection } from '$lib/enums/custom-token-section';
	import { updateNftSection } from '$lib/services/nft.services';
	import { i18n } from '$lib/stores/i18n.store';
	import type { NonFungibleToken } from '$lib/types/nft';

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
