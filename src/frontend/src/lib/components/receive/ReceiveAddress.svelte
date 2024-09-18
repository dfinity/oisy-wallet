<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import ReceiveActions from '$lib/components/receive/ReceiveActions.svelte';
	import Value from '$lib/components/ui/Value.svelte';

	export let labelRef: string;
	export let address: string;
	export let qrCodeAriaLabel: string;
	export let copyAriaLabel: string;

	let text = false;
	$: text = nonNullish($$slots.text);
</script>

<div>
	<Value ref={labelRef} element="div">
		<svelte:fragment slot="label"><slot name="title" /></svelte:fragment>

		{#if text}
			<p class="break-normal py-2 text-misty-rose">
				<slot name="text" />
			</p>
		{/if}

		<div class="flex items-start justify-between gap-4">
			<output id="ic-wallet-address" class="break-all">{address}</output>

			<ReceiveActions on:click {qrCodeAriaLabel} {address} {copyAriaLabel} />
		</div>

		<slot />
	</Value>
</div>
