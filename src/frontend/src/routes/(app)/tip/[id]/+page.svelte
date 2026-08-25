<script lang="ts">
	import { page } from '$app/state';
	import TipClaim from '$lib/components/tip/TipClaim.svelte';

	// An `(app)` route rather than a `(public)` one, deliberately. The claim needs
	// an authenticated agent and the app's token stores, and the app layout already
	// renders the landing view for a visitor who is not signed in — which is
	// exactly the backdrop the design puts this modal on. A public route would
	// have to bootstrap auth on its own.
	//
	// Only the id is in the path. The claim code stays in the fragment, which
	// browsers never send to a server or put in a `Referer` header.
	const tipId = $derived(page.params.id ?? '');
</script>

<TipClaim {tipId} />
