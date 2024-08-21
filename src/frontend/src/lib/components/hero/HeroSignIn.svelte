<script lang="ts">
	import { i18n } from '$lib/stores/i18n.store';
	import { signIn } from '$lib/services/auth.services';
	import IconHeaderICP from '$lib/components/icons/IconHeaderICP.svelte';
	import IconHeaderBTC from '$lib/components/icons/IconHeaderBTC.svelte';
	import IconHeaderETH from '$lib/components/icons/IconHeaderETH.svelte';
	import ButtonAuthenticate from '$lib/components/ui/ButtonAuthenticate.svelte';
</script>

<div class="flex -space-x-2.5 mt-6 xl:mt-12">
	<IconHeaderICP />
	<IconHeaderBTC />
	<IconHeaderETH />
</div>

<div class="mt-5 mb-10 pt-2">
	<h1 class="text-off-white text-4xl text-center">
		{$i18n.auth.text.title}
	</h1>
</div>

<ButtonAuthenticate on:click={async () => await signIn({})}>
	{$i18n.auth.text.authenticate}
</ButtonAuthenticate>
