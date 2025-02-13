<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { fade } from 'svelte/transition';
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
	import ReceiveActions from '$lib/components/receive/ReceiveActions.svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import Value from '$lib/components/ui/Value.svelte';
	import { RECEIVE_TOKENS_MODAL_ADDRESS_LABEL } from '$lib/constants/test-ids.constants';
	import type { Network } from '$lib/types/network';
	import type { ReceiveQRCodeAction } from '$lib/types/receive';
	import type { OptionString } from '$lib/types/string';

	export let labelRef: string;
	export let address: OptionString;
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
			<p class="mb-1.5 py-2 break-normal text-tertiary">
				<slot name="text" />
			</p>
		{/if}

		<div
			class="gap-4 rounded-lg px-3 py-2 flex items-center justify-between bg-brand-subtle-20"
			class:mt-3={!text}
			data-tid={testId}
		>
			<div class="h-8 w-8">
				<NetworkLogo {network} blackAndWhite color="white" size="sm" />
			</div>

			{#if nonNullish(address)}
				<output
					id="ic-wallet-address"
					class="text-sm break-all"
					data-tid={RECEIVE_TOKENS_MODAL_ADDRESS_LABEL}
					in:fade>{address}</output
				>
			{:else}
				<span class="w-full"><SkeletonText /></span>
			{/if}

			{#if nonNullish(address)}
				<div in:fade>
					<ReceiveActions on:click {address} {copyAriaLabel} {qrCodeAction} {copyButtonTestId} />
				</div>
			{:else}
				<div class="min-w-20">&ZeroWidthSpace;</div>
			{/if}
		</div>

		<slot />
	</Value>
</div>
