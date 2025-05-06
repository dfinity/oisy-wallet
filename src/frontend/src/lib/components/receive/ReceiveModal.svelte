<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import type { Snippet } from 'svelte';
	import { isNullish } from '@dfinity/utils';
	import ReceiveAddressQRCodeContent from '$lib/components/receive/ReceiveAddressQRCodeContent.svelte';
	import ReceiveTitle from '$lib/components/receive/ReceiveTitle.svelte';
	import ButtonDone from '$lib/components/ui/ButtonDone.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { RECEIVE_TOKENS_MODAL_COPY_ADDRESS_BUTTON } from '$lib/constants/test-ids.constants';
	import { modalStore } from '$lib/stores/modal.store';
	import { token } from '$lib/stores/token.store';
	import type { OptionAddress, Address } from '$lib/types/address';
	import type { Network } from '$lib/types/network';
	import type { Token } from '$lib/types/token';

	interface Props {
		content?: Snippet;
		address?: OptionAddress<Address>;
		addressToken?: Token | undefined;
		network: Network;
		copyAriaLabel: string;
	}

	let { content, address, addressToken, network, copyAriaLabel }: Props = $props();

    let title: string | undefined;
    $: title = isNullish($token) ? network.name : addressToken?.symbol;
</script>

<Modal on:nnsClose={modalStore.close}>
	<ReceiveTitle slot="title" {title} />

	<ContentWithToolbar>
		<ReceiveAddressQRCodeContent
			copyButtonTestId={RECEIVE_TOKENS_MODAL_COPY_ADDRESS_BUTTON}
			{address}
			{addressToken}
			{network}
			{copyAriaLabel}
			qrCodeAction={{ enabled: false }}
		/>

		{@render content?.()}

		<ButtonDone onclick={modalStore.close} slot="toolbar" />
	</ContentWithToolbar>
</Modal>
