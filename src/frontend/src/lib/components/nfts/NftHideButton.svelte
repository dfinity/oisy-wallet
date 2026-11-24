<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import IconEye from '$lib/components/icons/lucide/IconEye.svelte';
	import IconEyeOff from '$lib/components/icons/lucide/IconEyeOff.svelte';
	import NftActionButton from '$lib/components/nfts/NftActionButton.svelte';
	import ConfirmButtonWithModal from '$lib/components/ui/ConfirmButtonWithModal.svelte';
	import Html from '$lib/components/ui/Html.svelte';
	import IconSwap from '$lib/components/ui/IconSwap.svelte';
	import {
		CONFIRMATION_MODAL,
		NFT_COLLECTION_ACTION_HIDE,
		NFT_COLLECTION_ACTION_UNHIDE
	} from '$lib/constants/test-ids.constants';
	import { ethAddress } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { CustomTokenSection } from '$lib/enums/custom-token-section';
	import { PLAUSIBLE_EVENT_CONTEXTS, PLAUSIBLE_EVENTS } from '$lib/enums/plausible';
	import { trackEvent } from '$lib/services/analytics.services';
	import { updateNftSection } from '$lib/services/nft.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { nftStore } from '$lib/stores/nft.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { NonFungibleToken } from '$lib/types/nft';
	import { escapeHtml } from '$lib/utils/html.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { getNftIdentifier } from '$lib/utils/nft.utils';
	import { findNftsByToken } from '$lib/utils/nfts.utils';

	interface Props {
		token: NonFungibleToken;
		source: string;
	}

	let { token, source }: Props = $props();

	const hasMultipleNfts = $derived(
		nonNullish($nftStore) ? findNftsByToken({ nfts: $nftStore, token }).length > 1 : false
	);

	const trackNftCategorizeEvent = ({
		value,
		status
	}: {
		value?: CustomTokenSection;
		status: string;
	}) => {
		trackEvent({
			name: PLAUSIBLE_EVENTS.NFT_CATEGORIZE,
			metadata: {
				event_context: PLAUSIBLE_EVENT_CONTEXTS.NFT,
				event_subcontext: 'collection',
				event_value: nonNullish(value) ? 'hide' : 'show',
				location_source: source,
				token_name: token.name,
				token_address: getNftIdentifier(token),
				token_network: token.network.name,
				token_standard: token.standard.code,
				result_status: status
			}
		});
	};

	let loading = $state(false);
	const hidden = $derived(token.section === CustomTokenSection.HIDDEN);
	let hiddenBeforeLoading = $state(false);
	const displayedHidden = $derived(loading ? hiddenBeforeLoading : hidden);

	const updateSection = async (section?: CustomTokenSection) => {
		hiddenBeforeLoading = hidden;
		loading = true;

		try {
			await updateNftSection({ section, token, $authIdentity, $ethAddress });

			trackNftCategorizeEvent({ value: section, status: 'success' });
		} catch (_: unknown) {
			trackNftCategorizeEvent({ value: section, status: 'error' });

			toastsError({ msg: { text: $i18n.nfts.text.could_not_update_section } });
		} finally {
			loading = false;
		}
	};
</script>

{#if token.section !== CustomTokenSection.SPAM}
	<ConfirmButtonWithModal
		onConfirm={() => updateSection(CustomTokenSection.HIDDEN)}
		testId={CONFIRMATION_MODAL}
	>
		{#snippet button(confirmHide: () => void)}
			<NftActionButton
				colorStyle={hidden ? 'primary' : undefined}
				label={hidden ? $i18n.nfts.text.unhide : $i18n.nfts.text.hide}
				{loading}
				onclick={() =>
					hidden
						? updateSection()
						: hasMultipleNfts
							? confirmHide()
							: updateSection(CustomTokenSection.HIDDEN)}
				testId={hidden ? NFT_COLLECTION_ACTION_UNHIDE : NFT_COLLECTION_ACTION_HIDE}
			>
				{#snippet icon()}
					<IconSwap swapped={displayedHidden}>
						{#snippet icon()}<IconEyeOff size="18" />{/snippet}
						{#snippet swappedIcon()}<IconEye size="18" />{/snippet}
					</IconSwap>
				{/snippet}
			</NftActionButton>
		{/snippet}
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
						$collection: escapeHtml(token.name)
					})}
				/>
			</p>
		</div>
	</ConfirmButtonWithModal>
{/if}
