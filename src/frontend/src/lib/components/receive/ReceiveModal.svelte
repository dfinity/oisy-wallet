<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import ReceiveAddressQRCodeContent from '$lib/components/receive/ReceiveAddressQRCodeContent.svelte';
	import ButtonDone from '$lib/components/ui/ButtonDone.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { OptionAddress, Address } from '$lib/types/address';
	import type { Network } from '$lib/types/network';
	import type { Token } from '$lib/types/token';

	export let address: OptionAddress<Address> = undefined;
	export let addressToken: Token | undefined = undefined;

	export let network: Network;
	export let qrCodeAriaLabel: string;
	export let copyAriaLabel: string;
</script>

<Modal on:nnsClose={modalStore.close}>
	<svelte:fragment slot="title">{$i18n.receive.text.receive}</svelte:fragment>

	<ContentWithToolbar>
		<ReceiveAddressQRCodeContent
			{address}
			{addressToken}
			{network}
			{qrCodeAriaLabel}
			{copyAriaLabel}
		>
			<slot name="text" slot="text" />
		</ReceiveAddressQRCodeContent>

		<slot name="content" />

		<ButtonDone on:click={modalStore.close} slot="toolbar" />
	</ContentWithToolbar>
</Modal>
