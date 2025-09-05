<script lang="ts">
	import bitcoin from '$btc/assets/bitcoin.svg';
	import icpDark from '$icp/assets/icp-dark.svg';
	import eth from '$icp-eth/assets/eth.svg';
	import Logo from '$lib/components/ui/Logo.svelte';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<div class="py-12">
	<div class="mb-5 flex justify-center p-2">
		<span class="z-0 -mr-4">
			<Logo ring size="lg" src={icpDark}></Logo>
		</span>
		<span class="z-1 -mr-4">
			<Logo ring size="lg" src={eth}></Logo>
		</span>
		<span class="z-2">
			<Logo ring size="lg" src={bitcoin}></Logo>
		</span>
	</div>

	<div class="space-y-4">
		<p class="m-0 text-center text-lg font-bold">{$i18n.tokens.text.all_tokens_with_zero_hidden}</p>
		<p class="m-0 text-center text-tertiary">{$i18n.tokens.text.buy_or_receive}</p>
	</div>
</div>
