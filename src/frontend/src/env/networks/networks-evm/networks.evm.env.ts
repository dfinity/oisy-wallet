export const EVM_NETWORKS_ENABLED =
	JSON.parse(import.meta.env.VITE_EVM_NETWORKS_ENABLED ?? false) === true;
