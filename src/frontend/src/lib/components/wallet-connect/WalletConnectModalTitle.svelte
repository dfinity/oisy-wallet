<script lang="ts">
	import IconWalletConnectBlue from '$lib/components/icons/IconWalletConnectBlue.svelte';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<div class="flex items-center gap-1.5">
	<div class="flex">
		<IconWalletConnectBlue /><span class="hidden">{$i18n.wallet_connect.text.name}</span>
	</div>
	<slot />
</div>
