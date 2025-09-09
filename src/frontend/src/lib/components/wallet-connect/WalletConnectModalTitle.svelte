<script lang="ts">
	import type { Snippet } from 'svelte';
	import IconWalletConnectBlue from '$lib/components/icons/IconWalletConnectBlue.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		children?: Snippet;
	}

	let { children }: Props = $props();
</script>

<div class="flex items-center gap-1.5">
	<div class="flex">
		<IconWalletConnectBlue /><span class="hidden">{$i18n.wallet_connect.text.name}</span>
	</div>
	{@render children?.()}
</div>
