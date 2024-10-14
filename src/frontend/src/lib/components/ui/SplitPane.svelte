<main
	class="relative mx-auto max-w-screen-2.5xl pt-8 sm:flex sm:w-full sm:flex-row lg:w-auto lg:pt-0"
>
	<div
		class="invisible absolute -translate-x-full transition-all duration-200 ease-in-out sm:visible sm:relative sm:block sm:min-w-44 sm:translate-x-0 md:transition-none lg:fixed lg:top-0 lg:mt-24"
	>
		<slot name="menu" />
	</div>

	<div class="mx-auto px-5 transition-all duration-500 ease-linear sm:box-content sm:w-sm">
		<slot />
	</div>
</main>
