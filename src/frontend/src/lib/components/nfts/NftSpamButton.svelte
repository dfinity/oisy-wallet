<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import IconAlertOctagon from '$lib/components/icons/lucide/IconAlertOctagon.svelte';
	import NftActionButton from '$lib/components/nfts/NftActionButton.svelte';
	import {
		NFT_COLLECTION_ACTION_NOT_SPAM,
		NFT_COLLECTION_ACTION_SPAM
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

{#if nonNullish(token.section) && token.section === CustomTokenSection.SPAM}
	<NftActionButton
		label={$i18n.nfts.text.not_spam}
		onclick={() => updateNftSection({ section: undefined, token, $authIdentity })}
		testId={NFT_COLLECTION_ACTION_NOT_SPAM}
	>
		{#snippet icon()}
			<IconAlertOctagon size="18" />
		{/snippet}
	</NftActionButton>
{:else}
	<NftActionButton
		label={$i18n.nfts.text.spam}
		onclick={() => updateNftSection({ section: CustomTokenSection.SPAM, token, $authIdentity })}
		testId={NFT_COLLECTION_ACTION_SPAM}
	>
		{#snippet icon()}
			<IconAlertOctagon size="18" />
		{/snippet}
	</NftActionButton>
{/if}
