<script lang="ts">
	import { addressStore } from '$lib/stores/address.store';
	import { QRCode } from '@dfinity/gix-components';
	import IconETHQRCode from '$lib/components/icons/IconETHQRCode.svelte';
	import { debounce } from '@dfinity/utils';
	import { fade } from 'svelte/transition';

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
	class="p-2 rounded-sm bg-ghost-white"
	class:opacity-0={!render}
	style={`border: 1px dashed var(--color-vampire-black); max-width: var(--qrcode-max-width, 360px); margin: 0 auto; height: var(--qrcode-height);`}
>
	{#if render}
		<QRCode value={$addressStore ?? ''}>
			<svelte:fragment slot="logo">
				{#if size === 'big'}
					<div class="p-1.5 rounded-sm bg-ghost-white flex flex-col items-center justify-center">
						<IconETHQRCode />
					</div>
				{/if}
			</svelte:fragment>
		</QRCode>
	{/if}
</div>
