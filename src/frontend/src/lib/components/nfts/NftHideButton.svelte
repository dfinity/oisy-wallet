<script lang="ts">
	import { Html } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import IconAlertOctagon from '$lib/components/icons/lucide/IconAlertOctagon.svelte';
	import IconEye from '$lib/components/icons/lucide/IconEye.svelte';
	import IconEyeOff from '$lib/components/icons/lucide/IconEyeOff.svelte';
	import NftActionButton from '$lib/components/nfts/NftActionButton.svelte';
	import ConfirmButtonWithModal from '$lib/components/ui/ConfirmButtonWithModal.svelte';
	import {
		NFT_COLLECTION_ACTION_HIDE,
		NFT_COLLECTION_ACTION_NOT_SPAM,
		NFT_COLLECTION_ACTION_SPAM,
		NFT_COLLECTION_ACTION_UNHIDE
	} from '$lib/constants/test-ids.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { CustomTokenSection } from '$lib/enums/custom-token-section';
	import { updateNftSection } from '$lib/services/nft.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { nftStore } from '$lib/stores/nft.store';
	import type { NonFungibleToken } from '$lib/types/nft';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { findNftsByToken } from '$lib/utils/nfts.utils';

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
			button={hideButton}
			onConfirm={() =>
				updateNftSection({ section: CustomTokenSection.HIDDEN, token, $authIdentity })}
		>
			<div class="flex w-full flex-col items-center text-center">
				<span
					class="mb-3 inline-flex aspect-square w-[56px] rounded-full bg-brand-primary p-3 text-white"
				>
					<IconEyeOff size="32" />
				</span>
				<h4 class="my-3">
					{replacePlaceholders($i18n.nfts.text.hide_warning, { $collection: token.name })}
				</h4>
				<p class="text-sm">
					<Html
						text={replacePlaceholders($i18n.nfts.text.hide_warning_text, {
							$collection: token.name
						})}
					/>
				</p>
			</div>
		</ConfirmButtonWithModal>
	{:else}
		{@render hideButton(() =>
			updateNftSection({ section: CustomTokenSection.HIDDEN, token, $authIdentity })
		)}
	{/if}
{/if}
