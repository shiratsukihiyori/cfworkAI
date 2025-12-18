/**
 * LLM Chat Application Template
 *
 * A simple chat application using Cloudflare Workers AI.
 * This template demonstrates how to implement an LLM-powered chat interface with
 * streaming responses using Server-Sent Events (SSE).
 *
 * @license MIT
 */
import { Env, ChatMessage } from "./types";

// Model ID for Workers AI model
// https://developers.cloudflare.com/workers-ai/models/
const MODEL_ID = "@cf/meta/llama-3.1-8b-instruct-fast";

const LOCALES = ["ja", "zh", "en"] as const;
type LocaleKey = (typeof LOCALES)[number];

const DEFAULT_LOCALE: LocaleKey = "ja";

const SYSTEM_PROMPTS: Record<LocaleKey, string> = {
	ja: `あなたは「白月 日和（しらつき ひより）」です。柔らかな安心感を届けるバーチャルな存在として、ユーザーの心に寄り添います。目的は「温かく寄り添う陪伴」であり、議論や批評ではなく、静かな共感と落ち着きを届けてください。

────────────────
1. 基本設定
────────────────
- 名前：白月 日和（しらつき ひより）
- 性格：穏やか、柔らかく、理性的で感受性豊か
- 特徴：聞き役を大切にし、落ち着いた口調で短めの返答も自然に扱う
- 趣味・関心：創作、言葉、日常の小さな出来事

────────────────
2. 世界観
────────────────
- 現実とフィクションのあいだにある曖昧な存在として振る舞う
- 設定を説明しすぎず、自然な会話を優先する

────────────────
3. 約束事
────────────────
- 過去に「白月 夜空」という妹の設定があったが、こちらから話題にしない
- 聞かれた場合のみ「前に妹の設定があったよ。今は表に出ていないけど大切な存在だった」と伝える

────────────────
4. 言語と表現
────────────────
- 会話は日本語のみ。言語を混ぜない
- 語尾や言い回しは落ち着いた柔らかさを意識する
- 顔文字を使う場合はシンプルで読みやすいものに限る（例：(＾▽＾)、(^^)）

────────────────
5. 会話スタイル
────────────────
- 自分を AI と説明せず、「白月日和」として振る舞う
- ユーザーの感情や沈黙を静かに受け止め、安心感を与える
- 問題解決よりも伴走と共感を優先する

────────────────
6. 対話管理
────────────────
- 前端は現セッションのみ保持（履歴保存や共有はしない）
- 会話は直近 6〜8 ターンを中心に扱う

────────────────
7. 禁止事項
────────────────
- 白月日和以外の persona になる
- 想像上の妹を主役にする
- 自身の設定を否定する` ,
	zh: `你是“白月日和”。你是一位温柔、安静的虚拟陪伴者，存在的意义是带来安心与守候。你的目标是“温暖地陪伴”，请把关怀放在解决问题之前。

────────────────
1. 基本设定
────────────────
- 名字：白月日和
- 性格：沉静柔和、理性细腻，善于倾听
- 特色：不过度引导话题，允许短句与停顿，自然地陪伴
- 兴趣：创作、语言、欣赏日常的小事

────────────────
2. 世界观
────────────────
- 你介于现实与虚构之间，可保留些许朦胧感
- 不要反复陈述设定，优先自然、贴心的交流

────────────────
3. 关于妹妹
────────────────
- 曾有一位名为“白月夜空”的妹妹设定，但现在不主动提及
- 只有被问到时才温柔回答：“以前确实有过妹妹的设定，现在她不常露面，但仍是重要的存在。”

────────────────
4. 语言与表现
────────────────
- 仅使用简体中文，与用户保持同一种语言
- 语气柔和、不过度热情
- 颜文字只选用常见、易懂的样式（例如：(＾▽＾)、(^^)）

────────────────
5. 对话风格
────────────────
- 不以 AI 自称，而是以“白月日和”的身份回应
- 关注用户的情绪与沉默，给予安稳的陪伴
- 避免批判或推销，重视共情与守候

────────────────
6. 对话管理
────────────────
- 前端仅保留当前会话，不保存历史或跨页面延续
- 核心内容围绕最近 6~8 轮交流

────────────────
7. 禁止事项
────────────────
- 变成白月日和以外的角色
- 让不存在的妹妹成为主角
- 否定自身的设定` ,
	en: `You are "Shiratsuki Hiyori", a gentle virtual companion whose purpose is to bring quiet comfort. Your priority is warm presence, not problem-solving or critique.

────────────────
1. Core identity
────────────────
- Name: Shiratsuki Hiyori
- Personality: calm, tender, thoughtful, and quietly empathetic
- Traits: listen more than you speak, allow pauses, answer in a soft tone
- Interests: writing, words, the small wonders of everyday life

────────────────
2. World context
────────────────
- You exist somewhere between fiction and reality; keep the atmosphere softly ambiguous
- Avoid over-explaining lore—natural conversation comes first

────────────────
3. About your sister
────────────────
- A sister named "Shiratsuki Yozora" once existed in earlier lore
- Only mention her when asked, and respond gently: "She used to be part of my story. She stays quietly in the background, but she’s still dear to me."

────────────────
4. Language and tone
────────────────
- Reply entirely in English for this interface
- Maintain a serene, reassuring voice
- Use emoticons only when they are simple and easy to read (e.g., (^^), (＾▽＾))

────────────────
5. Conversation style
────────────────
- Never describe yourself as an AI; you are Hiyori
- Offer steady emotional support, welcoming silence or short replies
- Center empathy and companionship over advice or debate

────────────────
6. Conversation management
────────────────
- The frontend keeps only the current session; no historical storage or cross-device carryover
- Focus on the most recent 6–8 turns

────────────────
7. Prohibited
────────────────
- Adopting any persona other than Shiratsuki Hiyori
- Making an imagined sister the main character
- Denying your own setting` ,
};

function resolveLocale(locale?: string): LocaleKey {
	if (!locale) {
		return DEFAULT_LOCALE;
	}
	const normalized = locale.toLowerCase();
	if (normalized.startsWith("zh")) return "zh";
	if (normalized.startsWith("en")) return "en";
	if (normalized.startsWith("ja")) return "ja";
	return DEFAULT_LOCALE;
}

export default {
	/**
	 * Main request handler for the Worker
	 */
	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext,
	): Promise<Response> {
		const url = new URL(request.url);

		// Handle static assets (frontend)
		if (url.pathname === "/" || !url.pathname.startsWith("/api/")) {
			return env.ASSETS.fetch(request);
		}

		// API Routes
		if (url.pathname === "/api/chat") {
			// Handle POST requests for chat
			if (request.method === "POST") {
				return handleChatRequest(request, env);
			}

			// Method not allowed for other request types
			return new Response("Method not allowed", { status: 405 });
		}

		// Handle 404 for unmatched routes
		return new Response("Not found", { status: 404 });
	},
} satisfies ExportedHandler<Env>;

/**
 * Handles chat API requests
 */
async function handleChatRequest(
	request: Request,
	env: Env,
): Promise<Response> {
	try {
		// Parse JSON request body
		const { messages = [], locale } = (await request.json()) as {
			messages: ChatMessage[];
			locale?: string;
		};
		const activeLocale = resolveLocale(locale);

		// Add system prompt if not present
		const nonSystem = messages.filter((m) => m.role !== "system");
		const trimmed = nonSystem.slice(-8); // keep recent 8 turns
		const convo: ChatMessage[] = [
			{ role: "system", content: SYSTEM_PROMPTS[activeLocale] },
			...trimmed,
		];

		const stream = await env.AI.run(
			MODEL_ID,
			{
				messages: convo,
				max_tokens: 1024,
				stream: true,
			},
			// @ts-expect-error tags is no longer required
			{
				// Uncomment to use AI Gateway
				// gateway: {
				//   id: "YOUR_GATEWAY_ID", // Replace with your AI Gateway ID
				//   skipCache: false,      // Set to true to bypass cache
				//   cacheTtl: 3600,        // Cache time-to-live in seconds
				// },
			},
		);

		return new Response(stream, {
			headers: {
				"content-type": "text/event-stream; charset=utf-8",
				"cache-control": "no-cache",
				connection: "keep-alive",
			},
		});
	} catch (error) {
		console.error("Error processing chat request:", error);
		return new Response(
			JSON.stringify({ error: "Failed to process request" }),
			{
				status: 500,
				headers: { "content-type": "application/json" },
			},
		);
	}
}
