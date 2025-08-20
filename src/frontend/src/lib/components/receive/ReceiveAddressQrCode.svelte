<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import ReceiveAddressQrCodeContent from '$lib/components/receive/ReceiveAddressQrCodeContent.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { RECEIVE_TOKENS_MODAL_QR_CODE_OUTPUT } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Network } from '$lib/types/network';
	import type { ReceiveQRCodeAction } from '$lib/types/receive';
	import type { Token } from '$lib/types/token';

	export let address: undefined | string;
	export let addressLabel: string | undefined = undefined;
	export let addressToken: Token | undefined;

	export let network: Network;
	export let qrCodeAction: ReceiveQRCodeAction;
	export let copyAriaLabel: string;
	export let testId: string | undefined = undefined;

	const dispatch = createEventDispatcher();
</script>

<ContentWithToolbar styleClass="min-h-50vh" {testId}>
	<ReceiveAddressQrCodeContent
		{address}
		{addressLabel}
		{addressToken}
		{copyAriaLabel}
		{network}
		{qrCodeAction}
		testId={RECEIVE_TOKENS_MODAL_QR_CODE_OUTPUT}
		on:click
	/>

	{#snippet toolbar()}
		<Button colorStyle="secondary-light" fullWidth onclick={() => dispatch('icBack')}>
			{$i18n.core.text.back}
		</Button>
	{/snippet}
</ContentWithToolbar>
