<script lang="ts">
	import AddressQRCode from '$lib/components/address/AddressQRCode.svelte';
	import { addressNotLoaded } from '$lib/derived/address.derived';
</script>

{#if !$addressNotLoaded}
	<div class="qrcode-container">
		<AddressQRCode size="small" />
	</div>
{/if}

<style lang="scss">
	@use '../../../../../../node_modules/@dfinity/gix-components/dist/styles/mixins/media';

	.qrcode-container {
		bottom: 0;

		--size: 110px;

		width: var(--size);
		max-height: var(--size);
		--qrcode-max-width: var(--size);
		--qrcode-height: var(--size);

		@include media.min-width(small) {
			--size: 160px;
		}
	}
</style>
