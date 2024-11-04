<script lang="ts">
	import { Spinner } from '@dfinity/gix-components';
	import SignerCenteredContent from '$lib/components/signer/SignerCenteredContent.svelte';
</script>

<SignerCenteredContent>
	<div class="text-brand-primary">
		<Spinner inline />
	</div>
	<span><slot /></span>
</SignerCenteredContent>
