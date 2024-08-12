<script lang="ts">
	import { i18n } from '$lib/stores/i18n.store';
	import Header from '$lib/components/ui/Header.svelte';
	import { fade } from 'svelte/transition';
</script>

<Header>{$i18n.transactions.text.title}</Header>

<p class="mt-4 text-dark opacity-50" in:fade>
	{$i18n.transactions.text.sign_in}
</p>
