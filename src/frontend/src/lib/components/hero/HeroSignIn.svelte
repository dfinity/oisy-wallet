<script lang="ts">
	import ButtonAuthenticate from '$lib/components/ui/ButtonAuthenticate.svelte';
	import { signIn } from '$lib/services/auth.services';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<div class="mb-7 mt-5 pt-2">
	<h1 class="text-4xl">
		{$i18n.auth.text.title_part_1}<br /><span class="text-primary"
			>{$i18n.auth.text.title_part_2}</span
		>
	</h1>
</div>

<ButtonAuthenticate on:click={async () => await signIn({})} />
