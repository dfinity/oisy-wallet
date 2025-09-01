<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import type { Nft } from '$lib/types/nft';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { modalStore } from '$lib/stores/modal.store';
	import { i18n } from '$lib/stores/i18n.store';
	import NetworkWithLogo from '$lib/components/networks/NetworkWithLogo.svelte';
	import { getNftCollectionUi } from '$lib/utils/nfts.utils';
	import AddressActions from '$lib/components/ui/AddressActions.svelte';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import IconImageDownload from '$lib/components/icons/IconImageDownload.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { nftStore } from '$lib/stores/nft.store';
	import { nonFungibleTokens } from '$lib/derived/tokens.derived';
	import { nonNullish } from '@dfinity/utils';
	import { getContractExplorerUrl } from '$lib/utils/networks.utils';

	interface Props {
		nft: Nft;
	}

	const { nft }: Props = $props();

	const shortCollectionName = $derived(
		nonNullish(nft.collection.name)
			? shortenWithMiddleEllipsis({
					text: nft.collection.name,
					splitLength: 12
				})
			: undefined
	);
</script>

<Modal on:nnsClose={() => modalStore.close()}>
	<ContentWithToolbar>
		<div class="my-5 flex flex-col items-center justify-center gap-6 text-center">
			<span class="flex text-warning-primary">
				<IconImageDownload />
			</span>
			<h3>Review media sources for <br />"{shortCollectionName}"</h3>
		</div>

		<p class="mb-5">
			Heads up! These images are from an unverified source. Enabling them could share your IP
			address with a third party and poses a potential security risk. <ExternalLink
				iconAsLast
				styleClass="font-bold ml-2"
				href="#"
				ariaLabel="learn more"
				iconSize="18">Learn more</ExternalLink
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
					<output>{shortenWithMiddleEllipsis({ text: nft.collection.address })}</output>
					<AddressActions
						copyAddress={nft.collection.address}
						copyAddressText={$i18n.nfts.text.address_copied}
						externalLink={getContractExplorerUrl({
							network: nft.collection.network,
							contractAddress: nft.collection.address
						})}
						externalLinkAriaLabel={$i18n.nfts.text.open_explorer}
					/>
				</span>
			</div>
			<div class="flex w-full justify-between">
				<span class="text-tertiary">{$i18n.nfts.text.display_preference}</span><span
					>Media enabled</span
				>
			</div>
			<div class="flex w-full justify-between">
				<span class="text-tertiary">{$i18n.nfts.text.media_urls}</span>
				<span class="flex-col justify-items-end">
					{#each getNftCollectionUi( { $nftStore, $nonFungibleTokens } ).find((coll) => coll.collection.id === nft.collection.id && coll.collection.address === nft.collection.address)?.nfts ?? [] as nft}
						<span class="flex">
							#{nft.id} &nbsp;
							<output class="text-tertiary"
								>{shortenWithMiddleEllipsis({ text: nft.imageUrl, splitLength: 20 })}</output
							>
							<AddressActions
								copyAddress={nft.imageUrl}
								copyAddressText={$i18n.nfts.text.address_copied}
								externalLink={nft.imageUrl}
								externalLinkAriaLabel={$i18n.nfts.text.open_in_new_tab}
							/>
						</span>
					{/each}
				</span>
			</div>
		</div>

		{#snippet toolbar()}
			<div class="flex w-full gap-3">
				<ButtonCancel onclick={() => modalStore.close()} />
				<Button colorStyle="primary">Disable media</Button>
			</div>
		{/snippet}
	</ContentWithToolbar>
</Modal>
