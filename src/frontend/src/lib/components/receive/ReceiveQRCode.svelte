<script lang="ts">
	import { QRCode } from '@dfinity/gix-components';
	import { debounce, nonNullish } from '@dfinity/utils';
	import { fade } from 'svelte/transition';
	import eth from '$icp-eth/assets/eth.svg';
	import Logo from '$lib/components/ui/Logo.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Token } from '$lib/types/token';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	export let address: string;
	export let addressToken: Token | undefined;

	let icon: string | undefined;
	let name: string;

	$: ({ icon, name } = addressToken ?? { icon: undefined, name: '' });

	let render = true;

	const rerender = debounce(() => {
		render = false;
		setTimeout(() => (render = true), 0);
	});
</script>

<svelte:window on:resize={rerender} />

<div in:fade class="qr-container p-4" class:opacity-0={!render}>
	{#if render}
		<QRCode value={address}>
			<svelte:fragment slot="logo">
				{#if nonNullish(icon)}
					<div class="flex items-center justify-center rounded-lg bg-white p-2">
						<Logo
							src={icon}
							alt={replacePlaceholders($i18n.core.alt.logo, {
								$name: name
							})}
							size="md"
						/>
					</div>
				{/if}
			</svelte:fragment>
		</QRCode>
	{/if}
</div>

<style lang="scss">
	.qr-container {
		max-width: var(--qrcode-max-width, 300px);
		margin: 0 auto;
		height: var(--qrcode-height);
	}
</style>
