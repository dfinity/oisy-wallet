<script lang="ts">
	import Listener from '$lib/components/core/Listener.svelte';

	import { token } from '$lib/stores/token.store';
	import LoaderTransactions from '$lib/components/loaders/LoaderTransactions.svelte';
</script>

<Listener token={$token}>
	<LoaderTransactions>
		<slot />
	</LoaderTransactions>
</Listener>
