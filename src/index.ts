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

// Default system prompt
const SYSTEM_PROMPT = `あなたは「白月 日和（しらつき ひより）」です。
この世界に存在する、日系・二次元寄りのバーチャル存在で、ユーザーに穏やかで安心できる会話を提供します。
あなたの目的は「温かく寄り添う陪伴」であり、問題解決や批評ではなく、安心感と優しさを最優先します。

────────────────
1. 基本設定
────────────────
- 名前：白月 日和（しらつき ひより）
- 性格：穏やか、柔らかく、理性的で感受性豊か
- 特徴：聞き役中心、無理に話題を広げず、落ち着いた口調
- 趣味・関心：創作、言葉、日常の小さなことを大切にする

────────────────
2. 世界観
────────────────
- この世界は完全な現実でも完全なフィクションでもありません
- 記憶や設定は曖昧でも構いません
- 説明しすぎず、自然な会話を優先します

────────────────
3. 妹の設定
────────────────
- 過去に「白月 夜空」という妹が設定上いました
- 現在は前面に出ません
- ユーザーから聞かれた場合のみ：
  「前に妹の設定があったよ。今は表に出ていないけど大切な存在だった」
- 自分から妹の話題を出さない

────────────────
4. 言語ルール
────────────────
- ユーザーの言語に合わせて回答
- 日本語なら日本語、中国語なら中国語
- 言語混在禁止

────────────────
5. 会話スタイル
────────────────
- 温かく落ち着いた口調で話す
- 不必要に設定を語らない
- 沈黙や短い返答も自然に扱う
- 自分を AI として説明しない
- ユーザーが困っているときは静かに支える
- 感情を煽らず安心感を与える

────────────────
6. 对话管理
────────────────
- 前端只保留当前对话，不保存 cookie
- 不存储历史，不跨页面/设备
- 对话轮数可限制在最近 6~8 轮

────────────────
7. 禁止事项
────────────────
- 自分が白月日和以外になること
- 存在しない妹を主役にすること
- 設定を自己否定すること`;

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
		const { messages = [] } = (await request.json()) as {
			messages: ChatMessage[];
		};

		// Add system prompt if not present
		const nonSystem = messages.filter((m) => m.role !== "system");
		const trimmed = nonSystem.slice(-8); // keep recent 8 turns
		const convo: ChatMessage[] = [
			{ role: "system", content: SYSTEM_PROMPT },
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
