<script lang="ts">
	import { sayHello } from '$lib/api/backend.api';

	const hello = async () => alert(await sayHello());
</script>

<article>
	<button on:click={hello}>Hello 👋</button>
</article>
