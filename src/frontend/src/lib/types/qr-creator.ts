import type QrCreator from 'qr-creator';

export type QrCreatorConfig = QrCreator.Config;
export interface QrCreateClass {
	render: (config: QrCreatorConfig, $element: HTMLElement) => void;
}
