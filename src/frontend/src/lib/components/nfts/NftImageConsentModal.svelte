<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import { saveCustomTokens as saveErc1155CustomTokens } from '$eth/services/erc1155-custom-tokens.services';
	import { saveCustomTokens as saveErc721CustomTokens } from '$eth/services/erc721-custom-tokens.services';
	import { isTokenErc1155 } from '$eth/utils/erc1155.utils';
	import { isTokenErc721 } from '$eth/utils/erc721.utils';
	import IconImageDownload from '$lib/components/icons/IconImageDownload.svelte';
	import NetworkWithLogo from '$lib/components/networks/NetworkWithLogo.svelte';
	import AddressActions from '$lib/components/ui/AddressActions.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { nonFungibleTokens } from '$lib/derived/tokens.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { nftStore } from '$lib/stores/nft.store';
	import type { Nft, NftCollection } from '$lib/types/nft';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { getContractExplorerUrl } from '$lib/utils/networks.utils';
	import {
		findNonFungibleToken,
		getAllowMediaForNft,
		getNftCollectionUi
	} from '$lib/utils/nfts.utils';

	interface Props {
		collection: NftCollection;
		testId?: string;
	}

	const { collection, testId }: Props = $props();

	const hasConsent = $derived(
		getAllowMediaForNft({
			tokens: $nonFungibleTokens,
			networkId: collection.network.id,
			address: collection.address
		}) ?? false
	);

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

	const save = async () => {
		saveLoading = true;
		if (nonNullish(token) && nonNullish($authIdentity)) {
			if (isTokenErc721(token)) {
				await saveErc721CustomTokens({
					tokens: [
						{
							...token,
							allowExternalContentSource: !hasConsent,
							enabled: true // must be true otherwise we couldnt see it at this point
						}
					],
					identity: $authIdentity
				});
			} else if (isTokenErc1155(token)) {
				await saveErc1155CustomTokens({
					tokens: [
						{
							...token,
							allowExternalContentSource: !hasConsent,
							enabled: true // must be true otherwise we couldnt see it at this point
						}
					],
					identity: $authIdentity
				});
			}
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
</script>

<Modal onClose={() => (!saveLoading ? modalStore.close() : undefined)} {testId}>
	<ContentWithToolbar>
		<div class="my-5 flex flex-col items-center justify-center gap-6 text-center">
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
				href="https://docs.oisy.com/using-oisy-wallet/how-tos/nfts"
				iconAsLast
				iconSize="18"
				styleClass="font-bold ml-2">{$i18n.nfts.text.learn_more}</ExternalLink
			>
		</p>

		<div class="flex flex-col gap-2 text-sm">
			<div class="flex w-full justify-between">
				<span class="text-tertiary">{$i18n.nfts.text.collection_name}</span><span
					>{shortCollectionName}</span
				>
			</div>
			<div class="flex w-full justify-between">
				<span class="text-tertiary">{$i18n.networks.network}</span><span
					><NetworkWithLogo network={collection.network} /></span
				>
			</div>
			<div class="flex w-full justify-between">
				<span class="text-tertiary">{$i18n.nfts.text.collection_address}</span>
				<span>
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
			<div class="flex w-full justify-between">
				<span class="text-tertiary" data-tid={`${testId}-displayPreferences`}
					>{$i18n.nfts.text.display_preference}</span
				><span>{hasConsent ? $i18n.nfts.text.media_enabled : $i18n.nfts.text.media_disabled}</span>
			</div>
			<div class="flex w-full justify-between">
				<span class="text-tertiary">{$i18n.nfts.text.media_urls}</span>
				<span class="flex-col justify-items-end" data-tid={`${testId}-nfts-media`}>
					{#each collectionNfts as nft, index (`${nft.id}-${index}`)}
						{#if nonNullish(nft?.imageUrl)}
							<span class="flex">
								#{nft.id} &nbsp;
								<output class="text-tertiary"
									>{shortenWithMiddleEllipsis({ text: nft.imageUrl, splitLength: 20 })}</output
								>
								<AddressActions
									copyAddress={nft.imageUrl}
									copyAddressText={replacePlaceholders($i18n.nfts.text.address_copied, {
										$address: nft.imageUrl
									})}
									externalLink={nft.imageUrl}
									externalLinkAriaLabel={$i18n.nfts.text.open_in_new_tab}
								/>
							</span>
						{/if}
					{/each}
				</span>
			</div>
		</div>

		{#snippet toolbar()}
			<div class="flex w-full gap-3">
				<ButtonCancel onclick={() => modalStore.close()} testId={`${testId}-cancelButton`} />
				<Button
					colorStyle="primary"
					loading={saveLoading}
					onclick={() => save()}
					testId={`${testId}-saveButton`}
					>{hasConsent ? $i18n.nfts.text.disable_media : $i18n.nfts.text.enable_media}</Button
				>
			</div>
		{/snippet}
	</ContentWithToolbar>
</Modal>
