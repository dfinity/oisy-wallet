<script lang="ts">
	import type { NonFungibleToken } from '$lib/types/nft';
	import { nonNullish } from '@dfinity/utils';
	import { CustomTokenSection } from '$lib/enums/custom-token-section';
	import NftActionButton from '$lib/components/nfts/NftActionButton.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { authIdentity } from '$lib/derived/auth.derived';
	import {
		NFT_COLLECTION_ACTION_HIDE,
		NFT_COLLECTION_ACTION_NOT_SPAM,
		NFT_COLLECTION_ACTION_SPAM,
		NFT_COLLECTION_ACTION_UNHIDE
	} from '$lib/constants/test-ids.constants';
	import IconAlertOctagon from '$lib/components/icons/lucide/IconAlertOctagon.svelte';
	import { updateNftSection } from '$lib/services/nft.services';
	import IconEye from '$lib/components/icons/lucide/IconEye.svelte';
	import IconEyeOff from '$lib/components/icons/lucide/IconEyeOff.svelte';
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

{#snippet hideButton(onclick: () => void)}
	<NftActionButton label={$i18n.nfts.text.hide} {onclick} testId={NFT_COLLECTION_ACTION_HIDE}>
		{#snippet icon()}
			<IconEyeOff size="18" />
		{/snippet}
	</NftActionButton>
{/snippet}

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
	{:else if hasMultipleNfts}
		<ConfirmButtonWithModal
			onConfirm={() =>
				updateNftSection({ section: CustomTokenSection.HIDDEN, token, $authIdentity })}
			button={hideButton}
		>
			<div class="flex w-full flex-col items-center text-center">
				<span
					class="m-3 inline-flex aspect-square w-[56px] rounded-full bg-brand-primary p-3 text-white"
				>
					<IconEyeOff size="32" />
				</span>
				<h4 class="my-3">Move collection to spam?</h4>
				<p class="text-sm"
					>This will move all NFTs of this collection to spam. They'll be hidden from your main
					view, but you can always find and restore them later.</p
				>
			</div>
		</ConfirmButtonWithModal>
	{:else}
		{@render hideButton(() =>
			updateNftSection({ section: CustomTokenSection.HIDDEN, token, $authIdentity })
		)}
	{/if}
{/if}
