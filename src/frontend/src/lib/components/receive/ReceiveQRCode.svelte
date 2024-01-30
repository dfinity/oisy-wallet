<script lang="ts">
	import { QRCode } from '@dfinity/gix-components';
	import { debounce } from '@dfinity/utils';
	import { fade } from 'svelte/transition';

	export let address: string;

	let render = true;

	const rerender = debounce(() => {
		render = false;
		setTimeout(() => (render = true), 0);
	});
</script>

<svelte:window on:resize={rerender} />

<div in:fade class="p-4 rounded-sm bg-off-white" class:opacity-0={!render}>
	{#if render}
		<QRCode value={address} />
	{/if}
</div>

<style lang="scss">
	div {
		border: 2px solid var(--color-dark);
		max-width: var(--qrcode-max-width, 300px);
		margin: 0 auto;
		height: var(--qrcode-height);
		border-radius: 10px;
		background: white;
	}
</style>
