<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import ReceiveQRCode from '$lib/components/receive/ReceiveQRCode.svelte';
	import Copy from '$lib/components/ui/Copy.svelte';
	import { RECEIVE_TOKENS_MODAL_QR_CODE_OUTPUT } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';

	export let address: undefined | string;
	export let addressLabel: string | undefined = undefined;

	const dispatch = createEventDispatcher();
</script>

<div class="stretch min-h-[50vh]">
	<p class="text-center font-bold">{addressLabel ?? $i18n.wallet.text.address}:</p>
	<p class="mb-4 px-2 text-center font-normal">
		<output class="break-all" data-tid={RECEIVE_TOKENS_MODAL_QR_CODE_OUTPUT}>{address}</output><Copy
			inline
			value={address ?? ''}
			text={$i18n.wallet.text.address_copied}
		/>
	</p>

	<ReceiveQRCode address={address ?? ''} />
</div>

<button class="secondary full center mt-8 text-center" on:click={() => dispatch('icBack')}
	>{$i18n.core.text.back}</button
>
