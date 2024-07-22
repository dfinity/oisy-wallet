<script lang="ts">
	import { i18n } from '$lib/stores/i18n.store';
	import { signIn } from '$lib/services/auth.services';
	import ButtonIC from '$lib/components/ui/ButtonIC.svelte';
	import IconHeaderICP from '$lib/components/icons/IconHeaderICP.svelte';
	import IconHeaderBTC from '$lib/components/icons/IconHeaderBTC.svelte';
	import IconHeaderETH from '$lib/components/icons/IconHeaderETH.svelte';
	import IconHeaderUSDC from '$lib/components/icons/IconHeaderUSDC.svelte';
</script>

<div class="flex -space-x-2.5 mt-6 xl:mt-12">
	<div><IconHeaderICP /></div>
	<div><IconHeaderBTC /></div>
	<div><IconHeaderETH /></div>
	<div><IconHeaderUSDC /></div>
</div>

<div class="mt-5 mb-10 pt-2">
	<h1 class="text-off-white text-4xl max-w-[22rem] text-center">
		{$i18n.auth.text.title}
	</h1>
</div>

<ButtonIC on:click={async () => await signIn({})} testId="login-button">
	{$i18n.auth.text.authenticate}
</ButtonIC>
