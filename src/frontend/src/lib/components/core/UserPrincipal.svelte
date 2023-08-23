<script lang="ts">
	import { signOut } from '$lib/services/auth.services';
	import IconIcLogo from '$lib/components/icons/IconIcLogo.svelte';
	import { authStore } from '$lib/stores/auth.store';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
</script>

<button class="primary" on:click={signOut}>
	<IconIcLogo />
	<span class="text-dark-slate-blue font-bold text-xs"
		>{shortenWithMiddleEllipsis($authStore?.identity?.getPrincipal().toText() ?? '')}</span
	>
</button>
