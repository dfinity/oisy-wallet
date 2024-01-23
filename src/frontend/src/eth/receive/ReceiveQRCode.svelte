<script lang="ts">
	import { QRCode } from '@dfinity/gix-components';
	import { debounce } from '@dfinity/utils';
	import { fade } from 'svelte/transition';
	import { networkAddress } from '$lib/derived/network.derived';

	let render = true;

	const rerender = debounce(() => {
		render = false;
		setTimeout(() => (render = true), 0);
	});
</script>

<svelte:window on:resize={rerender} />

<div
	in:fade
	class="p-4 rounded-sm bg-off-white"
	class:opacity-0={!render}
	style={`border: 1px dashed var(--color-dark); max-width: var(--qrcode-max-width, 360px); margin: 0 auto; height: var(--qrcode-height);`}
>
	{#if render}
		<QRCode value={$networkAddress ?? ''} />
	{/if}
</div>
