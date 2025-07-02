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
	<div class="h-[100dvh]">
		<LandingPage />
	</div>
{:else}
	<div in:fade class="md:block md:overflow-y-auto">
		{@render children?.()}
	</div>
{/if}
