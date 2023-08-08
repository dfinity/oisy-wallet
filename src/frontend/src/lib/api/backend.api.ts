import { getBackendActor } from '$lib/utils/actor.utils';

export const sayHello = async (): Promise<string> => {
	const random = crypto.getRandomValues(new Uint32Array(1))[0];

	const actor = await getBackendActor();
	return actor.greet(`${random}`);
};
