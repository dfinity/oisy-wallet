<script lang="ts">
	import { addressStoreNotLoaded } from '$lib/stores/address.store';
	import AddressQRCode from '$lib/components/address/AddressQRCode.svelte';
	import { nonNullish } from '@dfinity/utils';
	import {balance, balanceZero} from "$lib/derived/balances.derived";
</script>

<div
	class="relative"
	class:hidden={!$addressStoreNotLoaded && nonNullish($balance) && !$balanceZero}
>
	{#if !$addressStoreNotLoaded && $balanceZero}
		<div class="absolute qrcode-container">
			<AddressQRCode size="small" />
		</div>
	{/if}
</div>

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
