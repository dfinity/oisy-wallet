export interface TestUtil {
	setup: () => void;
	teardown: () => void;
	tests: () => void;
}

declare global {
	interface BigInt {
		toJSON(): string;
	}
}

BigInt.prototype.toJSON = function () {
	return `${Number(this)}n`;
};
