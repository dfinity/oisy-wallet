<script lang="ts">
	import type { EthFeePriority } from '$lib/enums/eth-fee-priority';
	import { observedPriority } from '$tests/eth/components/wallet-connect/eth-fee-context-stub.store';

	interface Props {
		priority?: EthFeePriority;
	}

	let { priority }: Props = $props();

	$effect(() => {
		observedPriority.set(priority);
	});
</script>
