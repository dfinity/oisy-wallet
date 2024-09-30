<script lang="ts">
	import { fade } from 'svelte/transition';
	import Header from '$lib/components/ui/Header.svelte';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<Header>{$i18n.transactions.text.title}</Header>

<p class="text-secondary mt-4 opacity-50" in:fade>
	{$i18n.transactions.text.sign_in}
</p>
