<script lang="ts">
	import { debounce, nonNullish } from '@dfinity/utils';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import QrCode from '$lib/components/ui/QrCode.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Token } from '$lib/types/token';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { fade } from '$lib/utils/transitions.utils';

	interface Props {
		address: string;
		addressToken?: Token;
		// `compact` for screens where the QR code shares the space with the address and its context.
		size?: 'compact' | 'default';
	}

	let { address, addressToken, size = 'default' }: Props = $props();

	let symbol = $derived(addressToken?.symbol);

	let render = $state(true);

	const rerender = debounce(() => {
		render = false;
		setTimeout(() => (render = true), 0);
	});
</script>

<svelte:window onresize={rerender} />

<div
	class="mx-auto aspect-square max-w-[100%] rounded-xl bg-white"
	class:h-56={size === 'compact'}
	class:h-80={size === 'default'}
	class:max-h-[36vh]={size === 'compact'}
	class:max-h-[44vh]={size === 'default'}
	class:mb-4={size === 'compact'}
	class:mb-8={size === 'default'}
	class:opacity-0={!render}
	class:p-3={size === 'compact'}
	class:p-4={size === 'default'}
	in:fade
>
	{#if render}
		<article
			aria-label={replacePlaceholders($i18n.wallet.alt.qrcode_address, {
				$token: symbol ?? ''
			})}
		>
			<QrCode value={address}>
				{#snippet logo()}
					{#if nonNullish(addressToken)}
						<div class="flex items-center justify-center rounded-lg bg-primary p-2">
							<TokenLogo data={addressToken} />
						</div>
					{/if}
				{/snippet}
			</QrCode>
		</article>
	{/if}
</div>
