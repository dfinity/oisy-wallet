<script lang="ts">
	import IconHeaderTokens from '$lib/components/icons/IconHeaderTokens.svelte';
	import ButtonAuthenticate from '$lib/components/ui/ButtonAuthenticate.svelte';
	import { signIn } from '$lib/services/auth.services';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<div class="flex mt-6 xl:mt-12">
	<IconHeaderTokens />
</div>

<div class="mt-5 mb-7 pt-2">
	<h1 class="text-4xl text-center">
		{$i18n.auth.text.title_part_1}<br /><span class="text-primary"
			>{$i18n.auth.text.title_part_2}</span
		>
	</h1>
</div>

<ButtonAuthenticate on:click={async () => await signIn({})}>
	{$i18n.core.text.open}
	<span>|</span>
	{$i18n.core.text.create}
</ButtonAuthenticate>
