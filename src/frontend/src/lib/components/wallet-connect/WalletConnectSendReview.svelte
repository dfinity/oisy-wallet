<script lang="ts">
	import { formatEtherShort } from '$lib/utils/format.utils';
	import { nonNullish } from '@dfinity/utils';
	import SendData from '$lib/components/send/SendData.svelte';
	import type { WalletConnectEthSendTransactionParams } from '$lib/types/wallet-connect';
	import type { BigNumber } from '@ethersproject/bignumber';
	import { createEventDispatcher } from 'svelte';

	export let firstTransaction: WalletConnectEthSendTransactionParams;
	export let amount: BigNumber;
	export let destination: string;

	const dispatch = createEventDispatcher();
</script>

<SendData amount={formatEtherShort(amount)} {destination} />

{#if nonNullish(firstTransaction.gasLimit)}
	<p class="font-bold">Gas limit</p>
	<p class="mb-2 font-normal">
		{BigInt(firstTransaction.gasLimit).toString()}
	</p>
{/if}

{#if nonNullish(firstTransaction.gasPrice)}
	<p class="font-bold">Gas price</p>
	<p class="mb-2 font-normal">
		{BigInt(firstTransaction.gasPrice).toString()}
	</p>
{/if}

<div class="flex justify-end gap-1 mt-4">
	<button class="primary" on:click={() => dispatch('icReject')}>Reject</button>
	<button class="primary" on:click={() => dispatch('icApprove')}> Approve </button>
</div>
