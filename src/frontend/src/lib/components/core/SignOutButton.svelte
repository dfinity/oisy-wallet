<script lang="ts">
	import { signOut } from '$lib/services/auth.services';
</script>

<button class="primary m-2" on:click={signOut}>Sign-out</button>
