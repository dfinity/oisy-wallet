<script lang="ts">
	import IconHeaderTokens from '$lib/components/icons/IconHeaderTokens.svelte';
	import ButtonAuthenticate from '$lib/components/ui/ButtonAuthenticate.svelte';
	import { signIn } from '$lib/services/auth.services';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<div class="mt-6 flex xl:mt-12">
	<IconHeaderTokens />
</div>

<div class="mb-7 mt-5 pt-2">
	<h1 class="text-center text-4xl">
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
