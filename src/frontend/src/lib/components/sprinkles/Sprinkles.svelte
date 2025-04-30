<script lang="ts">
	import Confetti from 'svelte-confetti';

	interface Props {
		type?: 'box' | 'page' | 'page-jackpot';
	}

	let { type = 'page' }: Props = $props();

	const colorArray = [
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
	];

	const colorArrayJackpot = [
		'url(/images/sprinkles/oisy-sprinkle-gold-01.svg)',
		'url(/images/sprinkles/oisy-sprinkle-gold-02.svg)',
		'url(/images/sprinkles/oisy-sprinkle-gold-03.svg)',
		'url(/images/sprinkles/oisy-sprinkle-curved-gold-01.svg)',
		'url(/images/sprinkles/oisy-sprinkle-curved-gold-02.svg)',
		'url(/images/sprinkles/oisy-sprinkle-curved-gold-03.svg)'
	];
</script>

{#if type === 'page' || type === 'page-jackpot'}
	<div class="box-confetti-page">
		<Confetti
			x={[-5, 5]}
			y={[0, 0.1]}
			iterationCount={2}
			delay={[0, 3500]}
			duration={2500}
			amount={300}
			fallDistance="100vh"
			colorArray={type === 'page-jackpot' ? colorArrayJackpot : colorArray}
			size={32}
		/>
	</div>
{:else}
	<div class="box-confetti-container">
		<Confetti
			x={[-1, 1]}
			y={[0, 0]}
			iterationCount={5}
			delay={[0, 1500]}
			duration={1500}
			amount={100}
			fallDistance="300px"
			{colorArray}
			size={32}
		/>
	</div>
{/if}

<style lang="scss">
	.box-confetti-page {
		position: fixed;
		top: -50px;
		left: 0;
		height: 100vh;
		width: 100vw;
		display: flex;
		justify-content: center;
		overflow: hidden;
		pointer-events: none;
		z-index: 1000;
	}

	.box-confetti-container {
		position: absolute;
		top: -50px;
		left: 0;
		height: calc(100% + 50px);
		width: 100%;
		display: flex;
		justify-content: center;
		overflow: hidden;
		pointer-events: none;
		clip-path: inset(50px 0 0 0);
	}
</style>
