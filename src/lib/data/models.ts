const googleModels = [
	{
		id: "google/gemini-pro",
		name: "Gemini Pro",
		description: "The best model for understanding both text and images.",
		websiteUrl: "https://deepmind.google/technologies/gemini/#introduction",
		is_pro: false
	},
	{
		id: "google/gemini-2.5-pro-preview",
		name: "Gemini 2.5 Pro (Preview)",
		description: "The most capable Gemini model for a wide variety of multimodal tasks.",
		websiteUrl: "https://deepmind.google/technologies/gemini/#introduction",
		is_pro: false
	}
].map((model) => ({
	...model,
	userMessageToken: "User:",
	assistantMessageToken: "Assistant:",
	temperature: 0.2,
	topP: 1,
	frequencyPenalty: 0,
	presencePenalty: 0,
	maxTokens: 300
}));