<script lang="ts">
	import ReceiveQRCode from '$lib/components/receive/ReceiveQRCode.svelte';
	import Copy from '$lib/components/ui/Copy.svelte';
	import { createEventDispatcher } from 'svelte';
	import { icpAccountIdentifierText, icrcAccountIdentifierText } from '$icp/derived/ic.derived';

	export let qrCodeAddressType: undefined | 'icrc' | 'icp';

	const dispatch = createEventDispatcher();

	let address: string | undefined;
	$: address = qrCodeAddressType === 'icp' ? $icpAccountIdentifierText : $icrcAccountIdentifierText;
</script>

<div class="mb-6 container">
	<p class="font-bold text-center">Address:</p>
	<p class="mb-4 font-normal text-center">
		<output class="break-all">{address}</output><Copy
			inline
			value={address ?? ''}
			text="Address copied to clipboard."
		/>
	</p>

	<ReceiveQRCode --qrcode-max-width="300px" address={address ?? ''} />

	<button class="secondary full center text-center mt-8" on:click={() => dispatch('icBack')}
		>Back</button
	>
</div>

<style lang="scss">
	.container {
		min-height: 470px;
	}
</style>
