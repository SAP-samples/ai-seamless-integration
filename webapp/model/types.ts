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

export {
	PredefinedTexts,
	PredefinedTextsData
}