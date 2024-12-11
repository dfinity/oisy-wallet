<script lang="ts">
	import Confetti from 'svelte-confetti';
	import snow1 from '$lib/assets/snow-1.svg';
	import snow2 from '$lib/assets/snow-2.svg';
	import snow3 from '$lib/assets/snow-3.svg';

	const colorArray = [`url(${snow1})`, `url(${snow2})`, `url(${snow3})`];
</script>

<div class="fixed -top-12 left-0 flex h-screen w-screen justify-center overflow-hidden text-white">
	<Confetti
		x={[-5, 5]}
		y={[0, 0.1]}
		delay={[500, 2000]}
		infinite
		duration={5000}
		amount={200}
		fallDistance="100vh"
		{colorArray}
	/>
</div>
