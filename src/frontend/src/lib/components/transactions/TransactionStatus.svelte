<script lang="ts">
	import { i18n } from '$lib/stores/i18n.store';
	import type { TransactionStatus } from '$lib/types/transaction';
	import { fade } from '$lib/utils/transitions.utils';

	interface Props {
		status: TransactionStatus;
	}

	let { status }: Props = $props();

	let pending = $derived(status === 'pending');

	let unconfirmed = $derived(status === 'unconfirmed');
</script>

{#if pending || unconfirmed}
	<span class="text-warning-subtle-30 ml-2" in:fade>
		{pending ? $i18n.transaction.status.pending : $i18n.transaction.status.unconfirmed}
	</span>
{/if}
