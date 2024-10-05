<script lang="ts">
	import BtcLoaderWallets from '$btc/components/core/BtcLoaderWallets.svelte';
	import IcLoaderWallets from '$icp/components/core/IcLoaderWallets.svelte';
</script>

<IcLoaderWallets>
	<BtcLoaderWallets>
		<slot />
	</BtcLoaderWallets>
</IcLoaderWallets>
