<script lang="ts">
	import { MULTICALL_MAX_METHODS } from '$eth/constants/multicall.constants';
	import { getCalldataMethods } from '$eth/utils/transactions.utils';
	import WalletConnectModalValue from '$lib/components/wallet-connect/WalletConnectModalValue.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		data?: string;
	}

	let { data }: Props = $props();

	let methods = $derived(getCalldataMethods(data));

	// The list is capped, so a batch longer than the cap would otherwise end without saying it had.
	let capped = $derived(methods.length >= MULTICALL_MAX_METHODS);
</script>

{#if methods.length > 0}
	<WalletConnectModalValue label={$i18n.wallet_connect.text.methods} ref="methods">
		<ul class="flex list-none flex-col gap-1">
			{#each methods as { selector, depth }, index (index)}
				<li class:pl-4={depth > 0}>
					<span class="break-all font-mono text-sm">
						{selector ?? $i18n.wallet_connect.text.method_without_selector}
					</span>
				</li>
			{/each}
		</ul>

		{#if capped}
			<p class="mt-2 text-sm text-tertiary">{$i18n.wallet_connect.text.methods_capped}</p>
		{/if}
	</WalletConnectModalValue>
{/if}
