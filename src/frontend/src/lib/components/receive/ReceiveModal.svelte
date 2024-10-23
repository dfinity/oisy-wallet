<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import ReceiveAddressQRCodeContent from '$lib/components/receive/ReceiveAddressQRCodeContent.svelte';
	import ReceiveTitle from '$lib/components/receive/ReceiveTitle.svelte';
	import ButtonDone from '$lib/components/ui/ButtonDone.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { modalStore } from '$lib/stores/modal.store';
	import type { OptionAddress, Address } from '$lib/types/address';
	import type { Network } from '$lib/types/network';
	import type { Token } from '$lib/types/token';

	export let address: OptionAddress<Address> = undefined;
	export let addressToken: Token | undefined = undefined;

	export let network: Network;
	export let copyAriaLabel: string;
	export let qrCodeAriaLabel: string;
</script>

<Modal on:nnsClose={modalStore.close}>
	<ReceiveTitle slot="title" {addressToken} />

	<ContentWithToolbar>
		<ReceiveAddressQRCodeContent
			{address}
			{addressToken}
			{network}
			{copyAriaLabel}
			{qrCodeAriaLabel}
		>
			<slot name="text" slot="text" />
		</ReceiveAddressQRCodeContent>

		<slot name="content" />

		<ButtonDone on:click={modalStore.close} slot="toolbar" />
	</ContentWithToolbar>
</Modal>
