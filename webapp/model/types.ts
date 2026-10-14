import {ValueState} from "sap/ui/core/library";
interface PredefinedText {
	[key: string]: string;
}

interface PredefinedTexts {
	[language: string]: PredefinedText;
}

interface PredefinedTextsData {
	predefinedTexts: PredefinedTexts;
	predefinedTextsBulleted: PredefinedTexts;
	predefinedTextsExpanded: PredefinedTexts;
	predefinedTextsRephrased: PredefinedTexts;
	predefinedTextsSimplified: PredefinedTexts;
	predefinedTextsSummarized: PredefinedTexts;
}

interface ViewModelData {
	outputValue: string,
	outputValueState: ValueState,
	outputEnabled: boolean,
	buttonState: string,
	outputBusy: boolean,
	sendButtonEnabled: boolean
}

export {
	PredefinedTexts,
	PredefinedTextsData,
	ViewModelData
}