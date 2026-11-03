<script lang="ts">
	import type { Snippet } from 'svelte';
	import LandingPage from '$lib/components/auth/LandingPage.svelte';
	import { authNotSignedIn } from '$lib/derived/auth.derived';
	import { fade } from '$lib/utils/transitions.utils';

	interface Props {
		children?: Snippet;
	}

	let { children }: Props = $props();
</script>

{#if $authNotSignedIn}
	<LandingPage />
{:else}
	<div data-app-view in:fade>
		{@render children?.()}
	</div>
{/if}
