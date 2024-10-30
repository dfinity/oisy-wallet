<script lang="ts">
	import { BTC_MAINNET_TOKEN } from '$env/tokens.btc.env';
	import { ETHEREUM_TOKEN } from '$env/tokens.env';
	import icpDark from '$eth/assets/icp_dark.svg';
	import Logo from '$lib/components/ui/Logo.svelte';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<div class="py-12">
	<div class="mb-5 flex justify-center p-2">
		<span class="-mr-4">
			<Logo color="white" ring size="lg" src={icpDark}></Logo>
		</span>
		<span class="-mr-4">
			<Logo color="white" ring size="lg" src={ETHEREUM_TOKEN.icon}></Logo>
		</span>
		<Logo color="white" ring size="lg" src={BTC_MAINNET_TOKEN.icon}></Logo>
	</div>

	<div class="space-y-4">
		<p class="m-0 text-center text-lg font-bold">{$i18n.tokens.text.all_tokens_with_zero_hidden}</p>
		<p class="text-secondary m-0 text-center opacity-50">{$i18n.tokens.text.buy_or_receive}</p>
	</div>
</div>
