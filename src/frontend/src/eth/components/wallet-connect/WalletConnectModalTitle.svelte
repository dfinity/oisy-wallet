<script lang="ts">
	import IconWalletConnectBlue from '$lib/components/icons/IconWalletConnectBlue.svelte';
</script>

<div class="flex items-center gap-1.5">
	<div class="flex"><IconWalletConnectBlue /><span class="hidden">WalletConnect</span></div>
	<slot />
</div>
