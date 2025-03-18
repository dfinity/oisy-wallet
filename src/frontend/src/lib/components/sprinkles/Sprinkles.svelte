<script lang="ts">
	import Confetti from 'svelte-confetti';
</script>

<div
	style="
      position: fixed;
      top: -50px;
      left: 0;
      height: 100vh;
      width: 100vw;
      display: flex;
      justify-content: center;
      overflow: hidden;
      pointer-events: none;
      z-index: 1000;"
>
	<Confetti
		x={[-5, 5]}
		y={[0, 0.1]}
		iterationCount={2}
		delay={[0, 3500]}
		duration={2500}
		amount={300}
		fallDistance="100vh"
		colorArray={[
			'url(/images/sprinkles/oisy-sprinkle-01.svg)',
			'url(/images/sprinkles/oisy-sprinkle-02.svg)',
			'url(/images/sprinkles/oisy-sprinkle-03.svg)',
			'url(/images/sprinkles/oisy-sprinkle-04.svg)',
			'url(/images/sprinkles/oisy-sprinkle-05.svg)',
			'url(/images/sprinkles/oisy-sprinkle-06.svg)',
			'url(/images/sprinkles/oisy-sprinkle-curved-01.svg)',
			'url(/images/sprinkles/oisy-sprinkle-curved-02.svg)',
			'url(/images/sprinkles/oisy-sprinkle-curved-03.svg)',
			'url(/images/sprinkles/oisy-sprinkle-curved-04.svg)',
			'url(/images/sprinkles/oisy-sprinkle-curved-05.svg)',
			'url(/images/sprinkles/oisy-sprinkle-curved-06.svg)'
		]}
		size={32}
	/>
</div>
