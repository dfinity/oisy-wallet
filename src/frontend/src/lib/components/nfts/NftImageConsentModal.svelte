<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import IconImageDownload from '$lib/components/icons/IconImageDownload.svelte';
	import NetworkWithLogo from '$lib/components/networks/NetworkWithLogo.svelte';
	import NftBadge from '$lib/components/nfts/NftBadge.svelte';
	import NftHideButton from '$lib/components/nfts/NftHideButton.svelte';
	import NftSpamButton from '$lib/components/nfts/NftSpamButton.svelte';
	import AddressActions from '$lib/components/ui/AddressActions.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import ExpandText from '$lib/components/ui/ExpandText.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { OISY_NFT_DOCS_URL } from '$lib/constants/oisy.constants';
	import { ethAddress } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { nonFungibleTokens } from '$lib/derived/tokens.derived';
	import { CustomTokenSection } from '$lib/enums/custom-token-section';
	import {
		PLAUSIBLE_EVENT_CONTEXTS,
		PLAUSIBLE_EVENT_SOURCES,
		PLAUSIBLE_EVENTS
	} from '$lib/enums/plausible';
	import { trackEvent } from '$lib/services/analytics.services';
	import { updateNftMediaConsent } from '$lib/services/nft.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { nftStore } from '$lib/stores/nft.store';
	import type { Nft, NftCollection } from '$lib/types/nft';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { getContractExplorerUrl } from '$lib/utils/networks.utils';
	import { findNonFungibleToken, getNftCollectionUi } from '$lib/utils/nfts.utils';
	import {getNftDisplayId} from "$lib/utils/nft.utils";

	interface Props {
		collection: NftCollection;
		testId?: string;
	}

	const { collection, testId }: Props = $props();

	const allowMedia = $derived(collection.allowExternalContentSource);

	const shortCollectionName = $derived(
		nonNullish(collection.name)
			? shortenWithMiddleEllipsis({
					text: collection.name,
					splitLength: 12
				})
			: undefined
	);

	const token = $derived(
		findNonFungibleToken({
			tokens: $nonFungibleTokens,
			networkId: collection.network.id,
			address: collection.address
		})
	);

	let saveLoading = $state(false);

	const save = async (allowMedia: boolean) => {
		saveLoading = true;

		if (nonNullish(token)) {
			await updateNftMediaConsent({
				token,
				$authIdentity,
				allowMedia,
				$ethAddress
			});
		}

		saveLoading = false;

		modalStore.close();
	};

	const collectionNfts: Nft[] = $derived(
		getNftCollectionUi({ $nftStore, $nonFungibleTokens }).find(
			(coll) =>
				coll.collection.id === collection.id && coll.collection.address === collection.address
		)?.nfts ?? []
	);

	const onClose = () => {
		if (!saveLoading) {
			modalStore.close();
		}
	};

	const trackEventOnClick = (clickedButton: string) => {
		trackEvent({
			name: PLAUSIBLE_EVENTS.MEDIA_CONSENT,
			metadata: {
				event_context: PLAUSIBLE_EVENT_CONTEXTS.NFT,
				event_value: clickedButton,
				token_name: collection.name ?? '',
				token_address: collection.address,
				token_network: collection.network.name,
				token_standard: collection.standard
			}
		});
	};
</script>

<div style="--color-border-secondary: transparent">
	<Modal disablePointerEvents={saveLoading} {onClose} {testId}>
		{#snippet title()}{/snippet}

		<ContentWithToolbar>
			<div class="-mt-3 mb-5 flex flex-col items-center justify-center gap-6 text-center">
				<span class="flex text-warning-primary">
					<IconImageDownload />
				</span>
				{#if nonNullish(shortCollectionName)}
					<h3
						>{replacePlaceholders($i18n.nfts.text.review_title, {
							$collectionName: shortCollectionName
						})}</h3
					>
				{/if}
			</div>

			<p class="mb-5">
				{$i18n.nfts.text.review_description}
				<ExternalLink
					ariaLabel={$i18n.nfts.text.learn_more}
					href={OISY_NFT_DOCS_URL}
					iconAsLast
					iconSize="18"
					styleClass="font-bold ml-2">{$i18n.nfts.text.learn_more}</ExternalLink
				>
			</p>

			<div class="flex flex-col gap-2 rounded-lg border border-tertiary bg-secondary p-3 text-sm">
				<div class="flex items-center gap-2">
					<NftBadge {token} />
					<span class="text-lg font-bold" data-tid={`${testId}-collectionTitle`}
						>{collection.name}</span
					>
				</div>

				{#if nonNullish(collection?.description)}
					<div class="mb-5 text-sm" data-tid={`${testId}-collectionDescription`}>
						<ExpandText maxWords={20} text={collection.description} />
					</div>
				{/if}

				{#if nonNullish(token)}
					<div class="mb-6 flex w-full gap-2">
						<span><NftSpamButton source={PLAUSIBLE_EVENT_SOURCES.NFT_MEDIA_REVIEW} {token} /></span>
						<span><NftHideButton source={PLAUSIBLE_EVENT_SOURCES.NFT_MEDIA_REVIEW} {token} /></span>
					</div>
				{/if}

				<div class="flex w-full flex-col justify-between md:flex-row">
					<span class="text-tertiary">{$i18n.nfts.text.collection_name}</span><span
						>{shortCollectionName}</span
					>
				</div>
				<div class="flex w-full flex-col justify-between md:flex-row">
					<span class="text-tertiary">{$i18n.networks.network}</span><span
						><NetworkWithLogo network={collection.network} /></span
					>
				</div>
				<div class="flex w-full flex-col justify-between md:flex-row">
					<span class="text-tertiary">{$i18n.nfts.text.collection_address}</span>
					<span class="inline-flex">
						<output data-tid={`${testId}-collectionAddress`}
							>{shortenWithMiddleEllipsis({ text: collection.address })}</output
						>
						<AddressActions
							copyAddress={collection.address}
							copyAddressText={replacePlaceholders($i18n.nfts.text.address_copied, {
								$address: collection.address
							})}
							externalLink={getContractExplorerUrl({
								network: collection.network,
								contractAddress: collection.address
							})}
							externalLinkAriaLabel={$i18n.nfts.text.open_explorer}
						/>
					</span>
				</div>
				<div class="flex w-full flex-col justify-between md:flex-row">
					<span class="text-tertiary" data-tid={`${testId}-displayPreferences`}
						>{$i18n.nfts.text.display_preference}</span
					><span>{allowMedia ? $i18n.nfts.text.media_enabled : $i18n.nfts.text.media_disabled}</span
					>
				</div>
				<div class="flex w-full flex-col justify-between md:flex-row">
					<span class="text-tertiary">{$i18n.nfts.text.media_urls}</span>
					<span class="justify-items-between flex-col" data-tid={`${testId}-nfts-media`}>
						{#if nonNullish(collection.bannerImageUrl)}
							<span class="flex w-full items-start justify-start md:items-center md:justify-end">
								<output class="text-tertiary"
									>{shortenWithMiddleEllipsis({
										text: collection.bannerImageUrl,
										splitLength: 20
									})}</output
								>
								<AddressActions
									copyAddress={collection.bannerImageUrl}
									copyAddressText={replacePlaceholders($i18n.nfts.text.address_copied, {
										$address: collection.bannerImageUrl
									})}
									{...allowMedia && {
										externalLink: collection.bannerImageUrl,
										externalLinkAriaLabel: $i18n.nfts.text.open_in_new_tab
									}}
								/>
							</span>
						{/if}
						{#each collectionNfts as nft, index (`${nft.id}-${index}`)}
							{#if nonNullish(nft?.imageUrl)}
								<span class="flex w-full items-start justify-end md:items-center">
									#{getNftDisplayId(nft)} &nbsp;
									<output class="truncate text-tertiary"
										>{shortenWithMiddleEllipsis({ text: nft.imageUrl, splitLength: 20 })}</output
									>
									<AddressActions
										copyAddress={nft.imageUrl}
										copyAddressText={replacePlaceholders($i18n.nfts.text.address_copied, {
											$address: nft.imageUrl
										})}
										{...allowMedia && {
											externalLink: nft.imageUrl,
											externalLinkAriaLabel: $i18n.nfts.text.open_in_new_tab
										}}
									/>
								</span>
							{/if}
						{/each}
					</span>
				</div>
			</div>

			{#snippet toolbar()}
				<div class="flex w-full gap-3">
					{#if nonNullish(allowMedia) && !allowMedia}
						<Button
							colorStyle="secondary-light"
							loading={saveLoading}
							onclick={() => {
								trackEventOnClick('false');
								modalStore.close();
							}}
							testId={`${testId}-keepDisabledButton`}
						>
							{$i18n.nfts.text.keep_media_disabled}
						</Button>
						<Button
							colorStyle="secondary-light"
							disabled={token?.section === CustomTokenSection.SPAM}
							loading={saveLoading}
							onclick={() => {
								trackEventOnClick('true');
								save(true);
							}}
							testId={`${testId}-enableButton`}
						>
							{$i18n.nfts.text.enable_media}
						</Button>
					{:else if nonNullish(allowMedia) && allowMedia}
						<Button
							colorStyle="secondary-light"
							loading={saveLoading}
							onclick={() => {
								trackEventOnClick('false');
								save(false);
							}}
							testId={`${testId}-disableButton`}
						>
							{$i18n.nfts.text.disable_media}
						</Button>
						<Button
							colorStyle="secondary-light"
							disabled={token?.section === CustomTokenSection.SPAM}
							loading={saveLoading}
							onclick={() => {
								trackEventOnClick('true');
								modalStore.close();
							}}
							testId={`${testId}-keepEnabledButton`}
						>
							{$i18n.nfts.text.keep_media_enabled}
						</Button>
					{:else}
						<Button
							colorStyle="secondary-light"
							loading={saveLoading}
							onclick={() => {
								trackEventOnClick('false');
								save(false);
							}}
							testId={`${testId}-keepDisabledButton`}
						>
							{$i18n.nfts.text.keep_media_disabled}
						</Button>
						<Button
							colorStyle="secondary-light"
							disabled={token?.section === CustomTokenSection.SPAM}
							loading={saveLoading}
							onclick={() => {
								trackEventOnClick('true');
								save(true);
							}}
							testId={`${testId}-enableButton`}
						>
							{$i18n.nfts.text.enable_media}
						</Button>
					{/if}
				</div>
			{/snippet}
		</ContentWithToolbar>
	</Modal>
</div>
