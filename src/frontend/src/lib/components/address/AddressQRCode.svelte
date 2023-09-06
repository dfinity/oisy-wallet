<script lang="ts">
	import { addressStore } from '$lib/stores/address.store';
	import { QRCode } from '@dfinity/gix-components';
	import eth from '$lib/assets/eth.svg';
	import { debounce } from '@dfinity/utils';
	import { fade } from 'svelte/transition';
	import Img from '$lib/components/ui/Img.svelte';

	export let size: 'small' | 'big' = 'big';

	let render = true;

	const rerender = debounce(() => {
		render = false;
		setTimeout(() => (render = true), 0);
	});
</script>

<svelte:window on:resize={rerender} />

<div
	transition:fade
	class="p-2 rounded-sm bg-off-white"
	class:opacity-0={!render}
	style={`border: 1px dashed var(--color-vampire-black); max-width: var(--qrcode-max-width, 360px); margin: 0 auto; height: var(--qrcode-height);`}
>
	{#if render}
		<QRCode value={$addressStore ?? ''}>
			<svelte:fragment slot="logo">
				{#if size === 'big'}
					<div class="p-1.5 rounded-sm bg-off-white flex flex-col items-center justify-center">
						<Img src={eth} />
					</div>
				{/if}
			</svelte:fragment>
		</QRCode>
	{/if}
</div>
