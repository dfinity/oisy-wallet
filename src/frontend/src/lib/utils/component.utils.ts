import { mount, unmount, type Component } from 'svelte';

type ComponentProps<T> = T extends new (options: { target: Element; props?: infer P }) => never
	? P extends undefined
		? {}
		: P
	: {};

export const componentToHtml = <T extends Component>({
	Component,
	props
}: {
	Component: T;
	props?: ComponentProps<T>;
}): string => {
	const container = document.createElement('div');

	try {
		const component = mount(Component, {
			target: container,
			props
		});

		const html = container.innerHTML;

		unmount(component);

		return html;
	} catch (error) {
		console.error('Error rendering component to HTML:', error);
		return '';
	} finally {
		container.remove();
	}
};
