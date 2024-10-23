<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import ReceiveQRCode from '$lib/components/receive/ReceiveQRCode.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import Copy from '$lib/components/ui/Copy.svelte';
	import { RECEIVE_TOKENS_MODAL_QR_CODE_OUTPUT } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Token } from '$lib/types/token';

	export let address: undefined | string;
	export let addressLabel: string | undefined = undefined;
	export let addressToken: Token | undefined;

	const dispatch = createEventDispatcher();
</script>

<ContentWithToolbar minHeight="50vh">
	<p class="text-center font-bold">{addressLabel ?? $i18n.wallet.text.address}:</p>
	<p class="mb-4 px-2 text-center font-normal">
		<output class="break-all" data-tid={RECEIVE_TOKENS_MODAL_QR_CODE_OUTPUT}>{address}</output><Copy
			inline
			value={address ?? ''}
			text={$i18n.wallet.text.address_copied}
		/>
	</p>

	<ReceiveQRCode address={address ?? ''} {addressToken} />

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
