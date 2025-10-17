<script lang="ts">
	import { Spinner } from '@dfinity/gix-components';
	import type { Snippet } from 'svelte';
	import SignerCenteredContent from '$lib/components/signer/SignerCenteredContent.svelte';

	interface Props {
		children?: Snippet;
	}

	let { children }: Props = $props();
</script>

<SignerCenteredContent>
	<div class="text-brand-primary">
		<Spinner inline />
	</div>
	<span>{@render children?.()}</span>
</SignerCenteredContent>
