<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import { Modal } from '@dfinity/gix-components';
	import Value from '$lib/components/ui/Value.svelte';
	import Copy from '$lib/components/ui/Copy.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import {
		icpAccountIdentifierTextStore,
		icrcAccountIdentifierStore
	} from '$icp/derived/ic.derived';
</script>

<Modal on:nnsClose={modalStore.close}>
	<svelte:fragment slot="title">Receive</svelte:fragment>

	<div>
		<Value ref="wallet-address" element="div">
			<svelte:fragment slot="label">Wallet address</svelte:fragment>
			<p class="text-misty-rose break-normal py-2">
				Use for all tokens when receiving from wallets, users or other apps that support this
				address format.
			</p>

			<div class="flex justify-between gap-4 items-center pb-2">
				<output id="ic-wallet-address" class="break-normal"
					>{$icrcAccountIdentifierStore ?? ''}</output
				><Copy
					inline
					value={$icrcAccountIdentifierStore ?? ''}
					text="Wallet address copied to clipboard."
				/>
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
				<output id="ic-wallet-address" class="break-all"
					>{$icpAccountIdentifierTextStore ?? ''}</output
				><Copy
					inline
					value={$icpAccountIdentifierTextStore ?? ''}
					text="ICP Account ID copied to clipboard."
				/>
			</div>
		</Value>
	</div>

	<button class="primary full center text-center mt-8 mb-6" on:click={modalStore.close}>Done</button
	>
</Modal>
