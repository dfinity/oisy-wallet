<script lang="ts">
	import { QRCode } from '@dfinity/gix-components';
	import { debounce, nonNullish } from '@dfinity/utils';
	import { fade } from 'svelte/transition';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Token } from '$lib/types/token';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	export let address: string;
	export let addressToken: Token | undefined = undefined;

	let symbol: string | undefined;
	$: symbol = addressToken?.symbol;

	let render = true;

	const rerender = debounce(() => {
		render = false;
		setTimeout(() => (render = true), 0);
	});
</script>

<svelte:window on:resize={rerender} />

<div
	class="mx-auto mb-8 aspect-square h-80 max-h-[44vh] max-w-[100%] rounded-xl bg-white p-4"
	class:opacity-0={!render}
	in:fade
>
	{#if render}
		<article
			aria-label={replacePlaceholders($i18n.wallet.alt.qrcode_address, {
				$token: symbol ?? ''
			})}
		>
			<QRCode value={address}>
				<svelte:fragment slot="logo">
					{#if nonNullish(addressToken)}
						<div class="flex items-center justify-center rounded-lg bg-primary p-2">
							<TokenLogo data={addressToken} />
						</div>
					{/if}
				</svelte:fragment>
			</QRCode>
		</article>
	{/if}
</div>
