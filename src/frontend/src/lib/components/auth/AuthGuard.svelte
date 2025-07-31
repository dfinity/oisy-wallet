<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fade } from 'svelte/transition';
	import LandingPage from '$lib/components/auth/LandingPage.svelte';
	import { authNotSignedIn } from '$lib/derived/auth.derived';

	interface Props {
		children?: Snippet;
	}

	let { children }: Props = $props();
</script>

{#if $authNotSignedIn}
	<LandingPage />
{:else}
	<div class="md:block md:overflow-y-auto" in:fade>
		{@render children?.()}
	</div>
{/if}
