<script lang="ts">
	import { icpAccountIdentifierText, icrcAccountIdentifierText } from '$icp/derived/ic.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import Hr from '$lib/components/ui/Hr.svelte';
	import Copy from '$lib/components/ui/Copy.svelte';
	import Value from '$lib/components/ui/Value.svelte';
	import { IconQRCodeScanner } from '@dfinity/gix-components';
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	const displayQRCode = (addressType: 'icrc' | 'icp') => dispatch('icQRCode', addressType);
</script>

<div>
	<Value ref="wallet-address" element="div">
		<svelte:fragment slot="label">Wallet address</svelte:fragment>
		<p class="text-misty-rose break-normal py-2">
			Use for all tokens when receiving from wallets, users or other apps that support this address
			format.
		</p>

		<div class="flex justify-between gap-4 items-center pb-2">
			<output id="ic-wallet-address" class="break-normal">{$icrcAccountIdentifierText ?? ''}</output
			>

			<div class="flex gap-2">
				<button
					aria-label="Display wallet address as a QR code"
					on:click={() => displayQRCode('icrc')}><IconQRCodeScanner /></button
				>
				<Copy
					inline
					value={$icrcAccountIdentifierText ?? ''}
					text="Wallet address copied to clipboard."
				/>
			</div>
		</div>
	</Value>
</div>

<Hr />

<div class="pt-6">
	<Value ref="wallet-address" element="div">
		<svelte:fragment slot="label">ICP Account ID</svelte:fragment>
		<p class="text-misty-rose break-normal py-2">
			Use for ICP deposits from exchanges or other wallets that only support Account IDs.
		</p>

		<div class="flex justify-between gap-4 items-center">
			<output id="ic-wallet-address" class="break-all">{$icpAccountIdentifierText ?? ''}</output>

			<div class="flex gap-2">
				<button
					aria-label="Display ICP Account ID as a QR code"
					on:click={() => displayQRCode('icp')}><IconQRCodeScanner /></button
				>

				<Copy
					inline
					value={$icpAccountIdentifierText ?? ''}
					text="ICP Account ID copied to clipboard."
				/>
			</div>
		</div>
	</Value>
</div>

<button class="primary full center text-center mt-8 mb-6" on:click={modalStore.close}>Done</button>
