<script lang="ts">
	import type { Snippet } from 'svelte';
	import BtcLoaderWallets from '$btc/components/core/BtcLoaderWallets.svelte';
	import IcLoaderWallets from '$icp/components/core/IcLoaderWallets.svelte';
	import SolLoaderWallets from '$sol/components/core/SolLoaderWallets.svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<IcLoaderWallets>
	<BtcLoaderWallets>
		<SolLoaderWallets>
			{@render children()}
		</SolLoaderWallets>
	</BtcLoaderWallets>
</IcLoaderWallets>
