<script lang="ts">
	import icpDark from '$eth/assets/icp_dark.svg';
	import bitcoin from '$icp/assets/bitcoin.svg';
	import eth from '$icp-eth/assets/eth.svg';
	import Logo from '$lib/components/ui/Logo.svelte';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<div class="py-12">
	<div class="mb-5 p-2 flex justify-center">
		<span class="-mr-4 z-0">
			<Logo ring size="lg" src={icpDark}></Logo>
		</span>
		<span class="-mr-4 z-1">
			<Logo ring size="lg" src={eth}></Logo>
		</span>
		<span class="z-2">
			<Logo ring size="lg" src={bitcoin}></Logo>
		</span>
	</div>

	<div class="space-y-4">
		<p class="m-0 text-lg font-bold text-center">{$i18n.tokens.text.all_tokens_with_zero_hidden}</p>
		<p class="m-0 text-center text-black opacity-50">{$i18n.tokens.text.buy_or_receive}</p>
	</div>
</div>
