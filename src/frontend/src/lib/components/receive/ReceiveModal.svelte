<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import ReceiveAddressQRCodeContent from '$lib/components/receive/ReceiveAddressQRCodeContent.svelte';
	import ReceiveTitle from '$lib/components/receive/ReceiveTitle.svelte';
	import ButtonDone from '$lib/components/ui/ButtonDone.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { modalStore } from '$lib/stores/modal.store';
	import type { OptionAddress, Address } from '$lib/types/address';
	import type { Token } from '$lib/types/token';

	export let address: OptionAddress<Address> = undefined;
	export let addressToken: Token | undefined = undefined;
</script>

<Modal on:nnsClose={modalStore.close}>
	<ReceiveTitle slot="title" {addressToken} />

	<ContentWithToolbar>
		<ReceiveAddressQRCodeContent {address} {addressToken} />

		<slot name="content" />

		<ButtonDone on:click={modalStore.close} slot="toolbar" />
	</ContentWithToolbar>
</Modal>
