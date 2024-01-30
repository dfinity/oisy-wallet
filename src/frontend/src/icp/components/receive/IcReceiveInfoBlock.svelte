<script lang="ts">
	import Copy from '$lib/components/ui/Copy.svelte';
	import { IconQRCodeScanner } from '@dfinity/gix-components';
	import Value from '$lib/components/ui/Value.svelte';

	export let labelRef: string;
	export let address: string;
	export let qrCodeAriaLabel: string;
	export let copyAriaLabel: string;
</script>

<div>
	<Value ref={labelRef} element="div">
		<svelte:fragment slot="label"><slot name="title" /></svelte:fragment>
		<p class="text-misty-rose break-normal py-2">
			<slot name="text" />
		</p>

		<div class="flex justify-between gap-4 items-center">
			<output id="ic-wallet-address" class="break-all">{address}</output>

			<div class="flex gap-2">
				<button
					aria-label={qrCodeAriaLabel}
					class="text-blue hover:text-dark-blue active:text-dark-blue"
					on:click><IconQRCodeScanner /></button
				>

				<Copy inline value={address} text={copyAriaLabel} />
			</div>
		</div>
	</Value>
</div>
