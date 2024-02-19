<script lang="ts">
	import { AIRDROP, AIRDROP_COMPLETED } from '$airdrop/constants/airdrop.constants';
	import Admin from './Admin.svelte';
	import AdminGuard from './AdminGuard.svelte';
</script>

{#if AIRDROP && !AIRDROP_COMPLETED}
	<AdminGuard>
		<Admin />
	</AdminGuard>
{/if}
