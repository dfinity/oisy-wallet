<script lang="ts">
	import type { NonFungibleToken } from '$lib/types/nft';
	import { nonNullish } from '@dfinity/utils';
	import { CustomTokenSection } from '$lib/enums/custom-token-section';
	import NftActionButton from '$lib/components/nfts/NftActionButton.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { authIdentity } from '$lib/derived/auth.derived';
	import {
		NFT_COLLECTION_ACTION_NOT_SPAM,
		NFT_COLLECTION_ACTION_SPAM
	} from '$lib/constants/test-ids.constants';
	import IconAlertOctagon from '$lib/components/icons/lucide/IconAlertOctagon.svelte';
	import { updateNftSection } from '$lib/services/nft.services';
	import ConfirmButtonWithModal from '$lib/components/ui/ConfirmButtonWithModal.svelte';
	import { findNftsByToken } from '$lib/utils/nfts.utils';
	import { nftStore } from '$lib/stores/nft.store';

	interface Props {
		token: NonFungibleToken;
	}

	let { token }: Props = $props();

	const hasMultipleNfts = $derived(
		nonNullish($nftStore) ? findNftsByToken({ nfts: $nftStore, token }).length > 1 : false
	);
</script>

{#snippet spamButton(onclick: () => void)}
	<NftActionButton label={$i18n.nfts.text.spam} {onclick} testId={NFT_COLLECTION_ACTION_SPAM}>
		{#snippet icon()}
			<IconAlertOctagon size="18" />
		{/snippet}
	</NftActionButton>
{/snippet}

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
{:else if hasMultipleNfts}
	<ConfirmButtonWithModal
		onConfirm={() => updateNftSection({ section: CustomTokenSection.SPAM, token, $authIdentity })}
		button={spamButton}
	>
		<div class="flex w-full flex-col items-center text-center">
			<span
				class="m-3 inline-flex aspect-square w-[56px] rounded-full bg-warning-primary p-3 text-white"
			>
				<IconAlertOctagon size="32" />
			</span>
			<h4 class="my-3">Move collection to spam?</h4>
			<p class="text-sm"
				>This will move all NFTs of this collection to spam. They'll be hidden from your main view,
				but you can always find and restore them later.</p
			>
		</div>
	</ConfirmButtonWithModal>
{:else}
	{@render spamButton(() =>
		updateNftSection({ section: CustomTokenSection.SPAM, token, $authIdentity })
	)}
{/if}
