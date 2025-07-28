<script lang="ts">
	import BtcLoaderWallets from '$btc/components/core/BtcLoaderWallets.svelte';
	import IcLoaderWallets from '$icp/components/core/IcLoaderWallets.svelte';
	import SolLoaderWallets from '$sol/components/core/SolLoaderWallets.svelte';
	import type { Snippet } from 'svelte';

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
