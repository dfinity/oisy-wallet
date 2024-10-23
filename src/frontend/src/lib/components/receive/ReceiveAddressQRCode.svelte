<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import ReceiveAddressQRCodeContent from '$lib/components/receive/ReceiveAddressQRCodeContent.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { RECEIVE_TOKENS_MODAL_QR_CODE_OUTPUT } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Token } from '$lib/types/token';

	export let address: undefined | string;
	export let addressLabel: string | undefined = undefined;
	export let addressToken: Token | undefined;

	const dispatch = createEventDispatcher();
</script>

<ContentWithToolbar minHeight="50vh">
	<ReceiveAddressQRCodeContent
		{address}
		{addressLabel}
		{addressToken}
		testId={RECEIVE_TOKENS_MODAL_QR_CODE_OUTPUT}
	/>

	<Button
		colorStyle="secondary"
		fullWidth
		styleClass="mt-8"
		on:click={() => dispatch('icBack')}
		slot="toolbar"
	>
		{$i18n.core.text.back}
	</Button>
</ContentWithToolbar>
