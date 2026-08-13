<script lang="ts">
	import type { Snippet } from 'svelte';
	import SignerCenteredContent from '$lib/components/signer/SignerCenteredContent.svelte';
	import LoaderSpinner from '$lib/components/ui/LoaderSpinner.svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<SignerCenteredContent>
	<div class="text-brand-primary">
		<LoaderSpinner inline />
	</div>
	<span>{@render children()}</span>
</SignerCenteredContent>
