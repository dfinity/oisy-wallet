<script lang="ts">
	import { fade } from 'svelte/transition';
</script>

<div class="mt-5 rounded-xl bg-primary p-5 first-of-type:mt-0" in:fade>
	<h4 class="mb-5"><slot name="title" /></h4>
	<slot />
</div>
