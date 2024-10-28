<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import ReceiveActions from '$lib/components/receive/ReceiveActions.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import Value from '$lib/components/ui/Value.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Network } from '$lib/types/network';
	import type { ReceiveQRCodeAction } from '$lib/types/receive';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	export let labelRef: string;
	export let address: string;
	export let network: Network;
	export let qrCodeAction: ReceiveQRCodeAction;
	export let copyAriaLabel: string;

	export let testId: string | undefined = undefined;
	export let copyButtonTestId: string | undefined = undefined;

	let text = false;
	$: text = nonNullish($$slots.text);
</script>

<div>
	<Value ref={labelRef} element="div">
		<svelte:fragment slot="label"><slot name="title" /></svelte:fragment>

		{#if text}
			<p class="mb-1.5 break-normal py-2 text-misty-rose">
				<slot name="text" />
			</p>
		{/if}

		<div
			class="flex items-center justify-between gap-4 rounded-lg bg-zumthor px-3 py-2"
			class:mt-2={!text}
		>
			<div class="h-8 w-8">
				<Logo
					src={network.iconBW}
					alt={replacePlaceholders($i18n.core.alt.logo, { $name: network.name })}
					color="white"
					size="sm"
				/>
			</div>

			<output id="ic-wallet-address" class="break-all text-sm" data-tid={testId}>{address}</output>

			<ReceiveActions on:click {address} {copyAriaLabel} {qrCodeAction} {copyButtonTestId} />
		</div>

		<slot />
	</Value>
</div>
