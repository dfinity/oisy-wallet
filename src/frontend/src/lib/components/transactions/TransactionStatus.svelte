<script lang="ts">
	import { fade } from 'svelte/transition';
	import { i18n } from '$lib/stores/i18n.store';
	import type { TransactionStatus } from '$lib/types/transaction';

	export let status: TransactionStatus;

	let pending: boolean;
	$: pending = status === 'pending';

	let unconfirmed: boolean;
	$: unconfirmed = status === 'unconfirmed';
</script>

{#if pending || unconfirmed}
	<span class="text-warning-subtle-30 ml-2" in:fade>
		{pending ? $i18n.transaction.status.pending : $i18n.transaction.status.unconfirmed}
	</span>
{/if}
