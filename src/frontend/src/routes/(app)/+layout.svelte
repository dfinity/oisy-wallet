<script lang="ts">
	import AuthGuard from '$lib/components/auth/AuthGuard.svelte';
	import LoadersGuard from '$lib/components/core/LoadersGuard.svelte';
	import Hero from '$lib/components/hero/Hero.svelte';
	import { pageToken } from '$lib/derived/page-token.derived';
	import { token } from '$lib/stores/token.store';

	$: token.set($pageToken);
</script>

<Hero />

<main class="pb-5 pt-8 sm:pb-12">
	<AuthGuard>
		<LoadersGuard>
			<slot />
		</LoadersGuard>
	</AuthGuard>
</main>
