<script lang="ts">
	import { authNotSignedIn } from '$lib/derived/auth.derived';
</script>

<div class:pointer-events-none={$authNotSignedIn} class:blur-[1.5px]={$authNotSignedIn}>
	<slot />
</div>
