<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getCalldataMethods } from '$eth/utils/transactions.utils';
	import WalletConnectModalValue from '$lib/components/wallet-connect/WalletConnectModalValue.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		data?: string;
	}

	let { data }: Props = $props();

	// `capped` comes from the traversal rather than from the length of what it returned: a batch that
	// ends exactly on the cap left nothing out and must not say it did.
	let { methods, capped } = $derived(getCalldataMethods(data));

	// Levels of indentation the list will render before it stops widening.
	const MAX_NESTING_INDENT = 4;
</script>

{#if methods.length > 0}
	<WalletConnectModalValue label={$i18n.wallet_connect.text.methods} ref="methods">
		<ul class="flex list-none flex-col gap-1">
			{#each methods as { selector, name, depth }, index (index)}
				<!-- Indented by how deep the call actually sits, so a call nested inside a batched
				     wrapper does not read as a sibling of that wrapper. -->
				<li style:padding-left="{Math.min(depth, MAX_NESTING_INDENT)}rem">
					<!-- A call is named only where the review read its arguments, so the selector stays
					     beside the name rather than being replaced by it: the name says what OISY
					     recognised, the four bytes say what was actually sent. -->
					{#if nonNullish(name)}
						<span class="text-sm">{name}</span>
						<span class="break-all font-mono text-sm text-tertiary">({selector})</span>
					{:else}
						<span class="break-all font-mono text-sm">
							{selector ?? $i18n.wallet_connect.text.method_without_selector}
						</span>
					{/if}
				</li>
			{/each}
		</ul>

		{#if capped}
			<p class="mt-2 text-sm text-tertiary">{$i18n.wallet_connect.text.methods_capped}</p>
		{/if}
	</WalletConnectModalValue>
{/if}
