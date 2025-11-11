import type { MetamaskProvider } from '$eth/types/metamask';

declare global {
	declare interface Window {
		ethereum: MetamaskProvider;
	}
}

declare global {
	interface BigInt {
		toJSON(): Number;
	}
}

BigInt.prototype.toJSON = function () {
	return `${Number(this)}n`;
};
