<script lang="ts">
	import connected from '$lib/assets/connected.svg';
	import Img from '$lib/components/ui/Img.svelte';
</script>

<h2 class="text-center mb-10">You’re all set!</h2>

<div class="flex justify-center min-h-[120px]">
	<Img
		src={connected}
		role="presentation"
		alt="An image displaying two dApps with wireframes and a checkbox indicating that they are connected"
	/>
</div>

<p class="text-center mt-10 font-bold">Continue on the app website</p>
