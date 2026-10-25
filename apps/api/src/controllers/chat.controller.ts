import type { Context } from "hono";
import { streamSSE } from "hono/streaming";
import type { ChatCompletionRequest, APIKeyZod, JSONObject } from "@codex/types";
import { ConvertResponsesAPIFormat } from "@codex/translator";
import { ChatLogic } from "@/logic/chat.logic.js";
import { Err, FormatErrorPayload, Ok } from "@/utils/response.js";

function ResponsesResponseBody(payload: {
    id: string;
    model: string;
    outputText: string;
    usage?: unknown;
}): JSONObject {
    return {
        id: payload.id,
        object: "response",
        created_at: Math.floor(Date.now() / 1000),
        status: "completed",
        model: payload.model,
        output: [
            {
                type: "message",
                id: `msg_${payload.id}`,
                role: "assistant",
                status: "completed",
                content: [{ type: "output_text", text: payload.outputText }]
            }
        ],
        output_text: payload.outputText,
        usage: (payload.usage ?? {
            input_tokens: 0,
            output_tokens: 0,
            total_tokens: 0
        }) as JSONObject
    };
}

function NormalizeDeveloperRole(Body: ChatCompletionRequest): ChatCompletionRequest {
    for (const msg of Body.messages) {
        if (msg.role === "developer") msg.role = "system";
    }
    return Body;
}

export class ChatController {
    public static async CreateCompletion(c: Context): Promise<Response> {
        const StartTime = Date.now();
        const Body = NormalizeDeveloperRole(
            c.req.valid("json" as never) as ChatCompletionRequest
        );
        const ApiKeyRow = c.get("apiKeyRow") as APIKeyZod | undefined;
        const ApiKeyId = ApiKeyRow?.id;

        if (Body.stream) {
            return streamSSE(c, async (stream) => {
                try {
                    const Generator = ChatLogic.ProcessStreamingCompletion(
                        Body,
                        StartTime,
                        0,
                        ApiKeyId
                    );
                    for await (const Chunk of Generator) {
                        await stream.writeSSE({
                            data: JSON.stringify(Chunk)
                        });
                    }
                    await stream.writeSSE({
                        data: "[DONE]"
                    });
                } catch (error) {
                    const ErrorMessage =
                        error instanceof Error ? error.message : "Error occurred during streaming";
                    await stream.writeSSE({
                        data: JSON.stringify(FormatErrorPayload(ErrorMessage, 500))
                    });
                }
            });
        }

        try {
            const ResponseData = await ChatLogic.ProcessNonStreamingCompletion(
                Body,
                StartTime,
                0,
                ApiKeyId
            );
            return Ok(c, ResponseData);
        } catch (error) {
            const ErrorMessage = error instanceof Error ? error.message : "Internal server error";
            return Err(c, ErrorMessage, 500);
        }
    }

    public static async CreateResponses(c: Context): Promise<Response> {
        const RawBody = await c.req.json().catch(() => null);
        if (!RawBody || typeof RawBody !== "object") {
            return Err(c, "Invalid JSON body", 400);
        }

        const ChatBody = ConvertResponsesAPIFormat(RawBody as never);
        const ResponseId = `resp_${Date.now()}`;

        if (ChatBody.stream) {
            return streamSSE(c, async (stream) => {
                try {
                    await stream.writeSSE({
                        event: "response.created",
                        data: JSON.stringify({
                            type: "response.created",
                            response: ResponsesResponseBody({
                                id: ResponseId,
                                model: ChatBody.model,
                                outputText: ""
                            })
                        })
                    });
                    const MessageItemId = `msg_${ResponseId}`;
                    await stream.writeSSE({
                        event: "response.output_item.added",
                        data: JSON.stringify({
                            type: "response.output_item.added",
                            output_index: 0,
                            item: {
                                type: "message",
                                id: MessageItemId,
                                role: "assistant",
                                status: "in_progress",
                                content: []
                            }
                        })
                    });
                    await stream.writeSSE({
                        event: "response.content_part.added",
                        data: JSON.stringify({
                            type: "response.content_part.added",
                            item_id: MessageItemId,
                            output_index: 0,
                            content_index: 0,
                            part: { type: "output_text", text: "" }
                        })
                    });
                    const Generator = ChatLogic.ProcessStreamingCompletion(
                        ChatBody,
                        Date.now(),
                        0,
                        undefined
                    );
                    let OutputText = "";
                    for await (const Chunk of Generator) {
                        const Delta = Chunk.choices?.[0]?.delta?.content;
                        if (Delta) {
                            OutputText += Delta;
                            await stream.writeSSE({
                                event: "response.output_text.delta",
                                data: JSON.stringify({
                                    type: "response.output_text.delta",
                                    item_id: MessageItemId,
                                    output_index: 0,
                                    content_index: 0,
                                    delta: Delta
                                })
                            });
                        }
                    }
                    await stream.writeSSE({
                        event: "response.output_text.done",
                        data: JSON.stringify({
                            type: "response.output_text.done",
                            item_id: MessageItemId,
                            output_index: 0,
                            content_index: 0,
                            text: OutputText
                        })
                    });
                    await stream.writeSSE({
                        event: "response.content_part.done",
                        data: JSON.stringify({
                            type: "response.content_part.done",
                            item_id: MessageItemId,
                            output_index: 0,
                            content_index: 0,
                            part: { type: "output_text", text: OutputText }
                        })
                    });
                    await stream.writeSSE({
                        event: "response.output_item.done",
                        data: JSON.stringify({
                            type: "response.output_item.done",
                            output_index: 0,
                            item: {
                                type: "message",
                                id: MessageItemId,
                                role: "assistant",
                                status: "completed",
                                content: [{ type: "output_text", text: OutputText }]
                            }
                        })
                    });
                    await stream.writeSSE({
                        event: "response.completed",
                        data: JSON.stringify({
                            type: "response.completed",
                            response: ResponsesResponseBody({
                                id: ResponseId,
                                model: ChatBody.model,
                                outputText: OutputText
                            })
                        })
                    });
                } catch (error) {
                    const ErrorMessage =
                        error instanceof Error ? error.message : "Error occurred during streaming";
                    await stream.writeSSE({
                        event: "error",
                        data: JSON.stringify(FormatErrorPayload(ErrorMessage, 500))
                    });
                }
            });
        }

        try {
            const ResponseData = await ChatLogic.ProcessNonStreamingCompletion(
                ChatBody,
                Date.now(),
                0,
                undefined
            );
            const First = (ResponseData as { choices?: Array<{ message?: { content?: string } }> })
                ?.choices?.[0];
            const OutputText = First?.message?.content ?? "";
            return Ok(
                c,
                ResponsesResponseBody({
                    id: ResponseId,
                    model: ChatBody.model,
                    outputText: OutputText,
                    usage: (ResponseData as { usage?: unknown })?.usage
                })
            );
        } catch (error) {
            const ErrorMessage = error instanceof Error ? error.message : "Internal server error";
            return Err(c, ErrorMessage, 500);
        }
    }
}
