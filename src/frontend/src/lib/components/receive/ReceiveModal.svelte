<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import ReceiveQRCode from '$lib/components/receive/ReceiveQRCode.svelte';
	import ButtonDone from '$lib/components/ui/ButtonDone.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import Copy from '$lib/components/ui/Copy.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { OptionAddress, Address } from '$lib/types/address';
	import type { Token } from '$lib/types/token';

	export let address: OptionAddress<Address> = undefined;
	export let addressToken: Token | undefined = undefined;
</script>

<Modal on:nnsClose={modalStore.close}>
	<svelte:fragment slot="title">{$i18n.receive.text.receive}</svelte:fragment>

	<ContentWithToolbar>
		<p class="text-center font-bold">Address:</p>
		<p class="mx-auto mb-4 max-w-xs px-2 text-center font-normal">
			<output class="break-all">{address ?? ''}</output><Copy
				inline
				value={address ?? ''}
				text={$i18n.wallet.text.address_copied}
			/>
		</p>

		<ReceiveQRCode address={address ?? ''} {addressToken} />

		<slot name="content" />

		<ButtonDone on:click={modalStore.close} slot="toolbar" />
	</ContentWithToolbar>
</Modal>
