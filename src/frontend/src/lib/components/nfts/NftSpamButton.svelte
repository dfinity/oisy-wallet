<script lang="ts">
	import { Html } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import IconAlertOctagon from '$lib/components/icons/lucide/IconAlertOctagon.svelte';
	import NftActionButton from '$lib/components/nfts/NftActionButton.svelte';
	import ConfirmButtonWithModal from '$lib/components/ui/ConfirmButtonWithModal.svelte';
	import { TRACK_NFT_SPAM_HIDE_ACTION } from '$lib/constants/analytics.constants';
	import {
		CONFIRMATION_MODAL,
		NFT_COLLECTION_ACTION_NOT_SPAM,
		NFT_COLLECTION_ACTION_SPAM
	} from '$lib/constants/test-ids.constants';
	import { ethAddress } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { CustomTokenSection } from '$lib/enums/custom-token-section';
	import { trackEvent } from '$lib/services/analytics.services';
	import { updateNftSection } from '$lib/services/nft.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { nftStore } from '$lib/stores/nft.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { NonFungibleToken } from '$lib/types/nft';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { findNftsByToken } from '$lib/utils/nfts.utils';

	interface Props {
		token: NonFungibleToken;
		source: string;
	}

	let { token, source }: Props = $props();

	const hasMultipleNfts = $derived(
		nonNullish($nftStore) ? findNftsByToken({ nfts: $nftStore, token }).length > 1 : false
	);

	let loading = $state(false);

	const updateSection = async (section?: CustomTokenSection) => {
		loading = true;
		try {
			trackEvent({
				name: TRACK_NFT_SPAM_HIDE_ACTION,
				metadata: {
					source,
					collection_name: token.name,
					collection_address: token.address,
					network: token.network.name,
					standard: token.standard,
					action: nonNullish(section) ? 'spam' : 'unspam'
				}
			});
			await updateNftSection({ section, token, $authIdentity, $ethAddress });
		} catch (_: unknown) {
			toastsError({ msg: { text: $i18n.nfts.text.could_not_update_section } });
		} finally {
			loading = false;
		}
	};
</script>

{#snippet spamButton(onclick: () => void)}
	<NftActionButton
		label={$i18n.nfts.text.spam}
		{loading}
		{onclick}
		testId={NFT_COLLECTION_ACTION_SPAM}
	>
		{#snippet icon()}
			<IconAlertOctagon size="18" />
		{/snippet}
	</NftActionButton>
{/snippet}

{#if nonNullish(token.section) && token.section === CustomTokenSection.SPAM}
	<NftActionButton
		label={$i18n.nfts.text.not_spam}
		{loading}
		onclick={() => updateSection()}
		testId={NFT_COLLECTION_ACTION_NOT_SPAM}
	>
		{#snippet icon()}
			<IconAlertOctagon size="18" />
		{/snippet}
	</NftActionButton>
{:else if hasMultipleNfts}
	<ConfirmButtonWithModal
		button={spamButton}
		onConfirm={() => updateSection(CustomTokenSection.SPAM)}
		testId={CONFIRMATION_MODAL}
	>
		<div class="flex w-full flex-col items-center text-center">
			<span
				class="mb-3 inline-flex aspect-square w-[56px] rounded-full bg-warning-primary p-3 text-white"
			>
				<IconAlertOctagon size="32" />
			</span>
			<h4 class="my-3">
				{replacePlaceholders($i18n.nfts.text.spam_warning, { $collection: token.name })}
			</h4>
			<p class="text-sm">
				<Html
					text={replacePlaceholders($i18n.nfts.text.spam_warning_text, { $collection: token.name })}
				/>
			</p>
		</div>
	</ConfirmButtonWithModal>
{:else}
	{@render spamButton(() => updateSection(CustomTokenSection.SPAM))}
{/if}
