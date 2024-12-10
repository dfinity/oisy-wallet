export const mapDerivationPath = (derivationPath: string[]): number[][] =>
	derivationPath.map((s) => [...s].map((char) => char.charCodeAt(0)));
