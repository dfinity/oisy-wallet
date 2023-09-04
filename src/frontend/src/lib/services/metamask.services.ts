import { metamaskStore } from '$lib/stores/metamask.store';
import detectEthereumProvider from '@metamask/detect-provider';

export const initMetamaskSupport = async () => {
	const provider = await detectEthereumProvider({
		mustBeMetaMask: true,
		silent: true
	});
	metamaskStore.set(provider?.isMetaMask ?? false);
};
