<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import { nftStore } from '$lib/stores/nft.store';
	import type { Nft } from '$lib/types/nft';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { nonFungibleTokens } from '$lib/derived/tokens.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import { i18n } from '$lib/stores/i18n.store';
	import NetworkWithLogo from '$lib/components/networks/NetworkWithLogo.svelte';
	import {
		findNonFungibleToken,
		getAllowMediaForNft,
		getNftCollectionUi
	} from '$lib/utils/nfts.utils';
	import AddressActions from '$lib/components/ui/AddressActions.svelte';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import IconImageDownload from '$lib/components/icons/IconImageDownload.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { nonNullish } from '@dfinity/utils';
	import { getContractExplorerUrl } from '$lib/utils/networks.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { saveCustomTokens as saveErc1155CustomTokens } from '$eth/services/erc1155-custom-tokens.services';
	import { saveCustomTokens as saveErc721CustomTokens } from '$eth/services/erc721-custom-tokens.services';

	interface Props {
		nft: Nft;
		testId?: string;
	}

	const { nft, testId }: Props = $props();

	const hasConsent = $derived(
		getAllowMediaForNft({
			tokens: $nonFungibleTokens,
			networkId: nft.collection.network.id,
			address: nft.collection.address
		}) ?? false
	);

	const shortCollectionName = $derived(
		nonNullish(nft.collection.name)
			? shortenWithMiddleEllipsis({
				text: nft.collection.name,
				splitLength: 12
			})
			: undefined
	);

	const token = $derived(
		findNonFungibleToken({
			tokens: $nonFungibleTokens,
			networkId: nft.collection.network.id,
			address: nft.collection.address
		})
	);

	const save = async () => {
		if (nonNullish(token) && nonNullish($authIdentity)) {
			if (token.standard === 'erc721') {
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
			} else if (token.standard === 'erc1155') {
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
	};

	const collectionNfts: Nft[] = $derived(
		getNftCollectionUi({ $nftStore, $nonFungibleTokens }).find(
			(coll) =>
				coll.collection.id === nft.collection.id &&
				coll.collection.address === nft.collection.address
		)?.nfts ?? []
	);
</script>

<Modal on:nnsClose={() => modalStore.close()} {testId}>
	<ContentWithToolbar>
		<div class="my-5 flex flex-col items-center justify-center gap-6 text-center">
			<span class="flex text-warning-primary">
				<IconImageDownload />
			</span>
			{#if nonNullish(shortCollectionName)}
				<h3
				>{@html replacePlaceholders($i18n.nfts.text.review_title, {
					$collectionName: shortCollectionName
				})}</h3
				>
			{/if}
		</div>

		<p class="mb-5">
			{$i18n.nfts.text.review_description}
			<ExternalLink
				iconAsLast
				styleClass="font-bold ml-2"
				href="https://docs.oisy.com/using-oisy-wallet/how-tos/nfts"
				ariaLabel={$i18n.nfts.text.learn_more}
				iconSize="18">{$i18n.nfts.text.learn_more}</ExternalLink
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
			><NetworkWithLogo network={nft.collection.network} /></span
			>
			</div>
			<div class="flex w-full justify-between">
				<span class="text-tertiary">{$i18n.nfts.text.collection_address}</span>
				<span>
					<output data-tid={`${testId}-collectionAddress`}
					>{shortenWithMiddleEllipsis({ text: nft.collection.address })}</output
					>
					<AddressActions
						copyAddress={nft.collection.address}
						copyAddressText={replacePlaceholders($i18n.nfts.text.address_copied, {
							$address: nft.collection.address
						})}
						externalLink={getContractExplorerUrl({
							network: nft.collection.network,
							contractAddress: nft.collection.address
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
				<Button colorStyle="primary" onclick={() => save()} testId={`${testId}-saveButton`}
				>{hasConsent ? $i18n.nfts.text.disable_media : $i18n.nfts.text.enable_media}</Button
				>
			</div>
		{/snippet}
	</ContentWithToolbar>
</Modal>
