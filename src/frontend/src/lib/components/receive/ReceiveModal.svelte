<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import { isNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import ReceiveAddressQrCodeContent from '$lib/components/receive/ReceiveAddressQrCodeContent.svelte';
	import ReceiveTitle from '$lib/components/receive/ReceiveTitle.svelte';
	import ButtonDone from '$lib/components/ui/ButtonDone.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { RECEIVE_TOKENS_MODAL_COPY_ADDRESS_BUTTON } from '$lib/constants/test-ids.constants';
	import { pageToken } from '$lib/derived/page-token.derived';
	import { modalStore } from '$lib/stores/modal.store';
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

	const title = $derived(isNullish($pageToken) ? network.name : addressToken?.symbol);
</script>

<Modal on:nnsClose={modalStore.close}>
	{#snippet title()}
		<ReceiveTitle {title} />
	{/snippet}

	<ContentWithToolbar>
		<ReceiveAddressQrCodeContent
			{address}
			{addressToken}
			{copyAriaLabel}
			copyButtonTestId={RECEIVE_TOKENS_MODAL_COPY_ADDRESS_BUTTON}
			{network}
			qrCodeAction={{ enabled: false }}
		/>

		{@render content?.()}

		{#snippet toolbar()}
			<ButtonDone onclick={modalStore.close} />
		{/snippet}
	</ContentWithToolbar>
</Modal>
