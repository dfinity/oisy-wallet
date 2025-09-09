<script lang="ts">
	import { fade } from 'svelte/transition';
	import { i18n } from '$lib/stores/i18n.store';
	import type { TransactionStatus } from '$lib/types/transaction';

	interface Props {
		status: TransactionStatus;
	}

	let { status }: Props = $props();

	let pending: boolean = $derived(status === 'pending');

	let unconfirmed: boolean = $derived(status === 'unconfirmed');
</script>

{#if pending || unconfirmed}
	<span class="text-warning-subtle-30 ml-2" in:fade>
		{pending ? $i18n.transaction.status.pending : $i18n.transaction.status.unconfirmed}
	</span>
{/if}
