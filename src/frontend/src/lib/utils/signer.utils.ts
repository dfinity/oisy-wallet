export const mapDerivationPath = (derivationPath: string[]): Uint8Array[] =>
	derivationPath.map((s) => Uint8Array.from([...s].map((char) => char.charCodeAt(0))));
