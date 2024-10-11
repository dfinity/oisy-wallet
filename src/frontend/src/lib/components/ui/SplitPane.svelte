<main class="relative mx-auto max-w-screen-2.5xl pt-8 sm:flex sm:flex-row">
	<div
		class="invisible absolute -translate-x-full transition-all duration-200 ease-in-out sm:visible sm:relative sm:block sm:min-w-44 sm:translate-x-0"
	>
		<slot name="menu" />
	</div>

	<div class="main-content mx-auto px-5 transition-all duration-500 ease-linear sm:w-3/4">
		<slot />
	</div>

	<div
		class="hidden -translate-x-full transition-all duration-500 ease-in-out md:translate-x-0 lg:relative lg:block lg:min-w-44"
	></div>
</main>
