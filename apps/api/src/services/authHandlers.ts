import {
    ANTIGRAVITY_IDE_BASE_URL,
    ANTIGRAVITY_OAUTH_CLIENT_ID,
    ANTIGRAVITY_OAUTH_REDIRECT_URI,
    ANTHROPIC_BASE_URL,
    BAI_BASE_URL,
    BLUESMINDS_BASE_URL,
    CODEBUDDY_BASE_URL,
    CODEBUDDY_CN_BASE_URL,
    CODEBUDDY_CN_DOMAIN,
    CODEBUDDY_CN_USER_AGENT,
    CODEX_OAUTH_CLIENT_ID,
    CODEX_OAUTH_REDIRECT_URI,
    COMMANDCODE_BASE_URL,
    FREEBUFF_BASE_URL,
    FREEPI_BASE_URL,
    GOROUTER_BASE_URL,
    OPENROUTER_BASE_URL,
    SEEKAI_BASE_URL,
    TABITOKEN_BASE_URL,
    TOKENROUTER_BASE_URL
} from "@codex/constants";
import {
    AntigravityExecutor,
    AnthropicExecutor,
    BAIExecutor,
    BluesMindsExecutor,
    DeepAIExecutor,
    CodeBuddyExecutor,
    CodexExecutor,
    CommandCodeExecutor,
    FreebuffExecutor,
    FreePiExecutor,
    GoRouterExecutor,
    OpenRouterExecutor,
    QoderExecutor,
    SeekAIExecutor,
    TabiTokenExecutor,
    TokenRouterExecutor
} from "@codex/executors";
import {
    AntigravityOAuth,
    DeepAIOAuth,
    ClaudeOAuth,
    CodeBuddyCNOAuth,
    CodeBuddyOAuth,
    FreebuffOAuth,
    FreePiOAuth,
    OpenAICodexOAuth,
    QoderOAuth
} from "@codex/providers";
import type { AuthProviderHandler } from "@codex/types";

const openaiCodex: AuthProviderHandler = {
    providerId: "openai_codex",
    displayName: "OpenAI Codex",
    category: "oauth",
    protocol: "openai",
    idPrefix: "openai_codex",
    clientId: () => CODEX_OAUTH_CLIENT_ID,
    defaultRedirectUri: CODEX_OAUTH_REDIRECT_URI,
    oauthSuccessMessage: "Login OpenAI Codex Berhasil!",
    tokenImportMessage:
        "OpenAI Codex Access Token registered and saved directly to SQLite database!",
    oauthClass: OpenAICodexOAuth,
    mapOAuthTokens: (tokens) => ({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        accountId: tokens.accountId,
        expiresIn: tokens.expiresIn
    }),
    mapImportTokens: (params) => ({
        accessToken: params.accessToken,
        refreshToken: params.refreshToken,
        accountId: params.accountId
    }),
    buildExecutor: ({ id, name, accessToken, refreshToken, accountId }) =>
        new CodexExecutor({ id, name, accessToken, refreshToken, accountId })
};

const deepai: AuthProviderHandler = {
    providerId: "deepai",
    displayName: "DeepAI",
    category: "oauth",
    protocol: "openai",
    idPrefix: "deepai",
    defaultRedirectUri: "http://localhost:1455/auth/deepai/callback",
    oauthSuccessMessage: "Login DeepAI Berhasil!",
    tokenImportMessage: "DeepAI API Key saved directly to SQLite database!",
    oauthClass: DeepAIOAuth,
    mapOAuthTokens: (tokens) => ({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        accountId: tokens.accountId
    }),
    mapImportTokens: (params) => ({
        accessToken: params.accessToken || params.apiKey || (params as any).token,
        refreshToken: params.refreshToken,
        baseUrl: params.baseUrl
    }),
    buildExecutor: ({ id, name, accessToken }) =>
        new DeepAIExecutor({ id, name, apiKey: accessToken, baseUrl: "http://127.0.0.1:8787/v1" })
};

const antigravity: AuthProviderHandler = {
    providerId: "antigravity",
    displayName: "Antigravity",
    category: "oauth",
    protocol: "openai",
    idPrefix: "antigravity",
    clientId: () => ANTIGRAVITY_OAUTH_CLIENT_ID,
    defaultRedirectUri: ANTIGRAVITY_OAUTH_REDIRECT_URI,
    baseUrl: () => ANTIGRAVITY_IDE_BASE_URL,
    oauthSuccessMessage: "Login Antigravity OAuth Berhasil!",
    tokenImportMessage:
        "Antigravity Access Token registered and saved directly to SQLite database!",
    oauthClass: AntigravityOAuth,
    mapOAuthTokens: (tokens) => ({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn
    }),
    mapImportTokens: (params) => ({
        accessToken: params.accessToken,
        refreshToken: params.refreshToken,
        baseUrl: params.baseUrl
    }),
    buildExecutor: ({ id, name, baseUrl, accessToken, refreshToken }) =>
        new AntigravityExecutor({ id, name, baseUrl, accessToken, refreshToken })
};

const commandCode: AuthProviderHandler = {
    providerId: "commandcode",
    displayName: "Command Code",
    category: "api_key",
    protocol: "openai",
    idPrefix: "commandcode",
    baseUrl: () => COMMANDCODE_BASE_URL,
    oauthSuccessMessage: "",
    tokenImportMessage: "Command Code API Key registered and saved directly to SQLite database!",
    mapImportTokens: (params) => ({
        apiKey: params.accessToken,
        refreshToken: params.refreshToken,
        baseUrl: params.baseUrl
    }),
    buildExecutor: ({ id, name, baseUrl, apiKey }) =>
        new CommandCodeExecutor({ id, name, baseUrl, apiKey })
};

const anthropic: AuthProviderHandler = {
    providerId: "anthropic",
    displayName: "Anthropic",
    category: "api_key",
    protocol: "anthropic",
    idPrefix: "anthropic",
    baseUrl: () => ANTHROPIC_BASE_URL,
    oauthSuccessMessage: "",
    tokenImportMessage: "Anthropic API Key registered and saved directly to SQLite database!",
    mapImportTokens: (params) => ({
        apiKey: params.accessToken,
        refreshToken: params.refreshToken,
        baseUrl: params.baseUrl
    }),
    buildExecutor: ({ id, name, baseUrl, apiKey }) =>
        new AnthropicExecutor({ id, name, baseUrl, apiKey })
};

const claude: AuthProviderHandler = {
    providerId: "claude",
    displayName: "Claude Code",
    category: "oauth",
    protocol: "anthropic",
    idPrefix: "claude",
    clientId: () => process.env.CLAUDE_OAUTH_CLIENT_ID || "9d1c250a-e61b-44d9-88ed-5944d1962f5e",
    defaultRedirectUri: "http://localhost:1455/auth/claude/callback",
    oauthSuccessMessage: "Login Claude Code OAuth Berhasil!",
    tokenImportMessage: "Claude Code OAuth token registered and saved directly to SQLite database!",
    oauthClass: ClaudeOAuth,
    mapOAuthTokens: (tokens) => ({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        organizationId: tokens.organizationId,
        expiresIn: tokens.expiresIn
    }),
    mapImportTokens: (params) => ({
        accessToken: params.accessToken || params.apiKey || (params as any).token,
        refreshToken: params.refreshToken,
        baseUrl: params.baseUrl
    }),
    buildExecutor: ({ id, name, accessToken, refreshToken, organizationId }) =>
        new AnthropicExecutor({ id, name, accessToken, refreshToken, organizationId })
};

const qoder: AuthProviderHandler = {
    providerId: "qoder",
    displayName: "Qoder",
    category: "oauth",
    protocol: "openai",
    idPrefix: "qoder",
    oauthSuccessMessage: "Login Qoder Berhasil!",
    tokenImportMessage:
        "Qoder Access Token / PAT registered and saved directly to SQLite database!",
    oauthClass: QoderOAuth,
    mapOAuthTokens: (tokens) => ({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        accountId: tokens.accountId,
        expiresIn: tokens.expiresIn
    }),
    mapImportTokens: (params) => ({
        accessToken: params.accessToken,
        refreshToken: params.refreshToken,
        accountId: params.accountId,
        baseUrl: params.baseUrl
    }),
    buildExecutor: ({ id, name, baseUrl, apiKey, accessToken, refreshToken }) =>
        new QoderExecutor({ id, name, baseUrl, apiKey, accessToken, refreshToken })
};

const goRouter: AuthProviderHandler = {
    providerId: "gorouter",
    displayName: "GoRouter",
    category: "api_key",
    protocol: "openai",
    idPrefix: "gorouter",
    baseUrl: () => GOROUTER_BASE_URL,
    oauthSuccessMessage: "",
    tokenImportMessage: "GoRouter API Key registered and saved directly to SQLite database!",
    mapImportTokens: (params) => ({
        apiKey: params.accessToken,
        refreshToken: params.refreshToken,
        baseUrl: params.baseUrl
    }),
    buildExecutor: ({ id, name, baseUrl, apiKey }) =>
        new GoRouterExecutor({ id, name, baseUrl: baseUrl || GOROUTER_BASE_URL, apiKey })
};

const openRouter: AuthProviderHandler = {
    providerId: "openrouter",
    displayName: "OpenRouter",
    category: "api_key",
    protocol: "openai",
    idPrefix: "openrouter",
    baseUrl: () => OPENROUTER_BASE_URL,
    oauthSuccessMessage: "",
    tokenImportMessage: "OpenRouter API Key registered and saved directly to SQLite database!",
    mapImportTokens: (params) => ({
        apiKey: params.accessToken,
        refreshToken: params.refreshToken,
        baseUrl: params.baseUrl
    }),
    buildExecutor: ({ id, name, baseUrl, apiKey }) =>
        new OpenRouterExecutor({ id, name, baseUrl: baseUrl || OPENROUTER_BASE_URL, apiKey })
};

const bluesMinds: AuthProviderHandler = {
    providerId: "bluesminds",
    displayName: "BluesMinds",
    category: "api_key",
    protocol: "openai",
    idPrefix: "bluesminds",
    baseUrl: () => BLUESMINDS_BASE_URL,
    oauthSuccessMessage: "",
    tokenImportMessage: "BluesMinds API Key registered and saved directly to SQLite database!",
    mapImportTokens: (params) => ({
        apiKey: params.accessToken,
        refreshToken: params.refreshToken,
        baseUrl: params.baseUrl
    }),
    buildExecutor: ({ id, name, baseUrl, apiKey }) =>
        new BluesMindsExecutor({ id, name, baseUrl: baseUrl || BLUESMINDS_BASE_URL, apiKey })
};

const seekAI: AuthProviderHandler = {
    providerId: "seekai",
    displayName: "SeekAI",
    category: "api_key",
    protocol: "openai",
    idPrefix: "seekai",
    baseUrl: () => SEEKAI_BASE_URL,
    oauthSuccessMessage: "",
    tokenImportMessage: "SeekAI API Key registered and saved directly to SQLite database!",
    mapImportTokens: (params) => ({
        apiKey: params.accessToken,
        refreshToken: params.refreshToken,
        baseUrl: params.baseUrl
    }),
    buildExecutor: ({ id, name, baseUrl, apiKey }) =>
        new SeekAIExecutor({ id, name, baseUrl: baseUrl || SEEKAI_BASE_URL, apiKey })
};

const tabiToken: AuthProviderHandler = {
    providerId: "tabitoken",
    displayName: "TabiToken",
    category: "api_key",
    protocol: "openai",
    idPrefix: "tabitoken",
    baseUrl: () => TABITOKEN_BASE_URL,
    oauthSuccessMessage: "",
    tokenImportMessage: "TabiToken API Key registered and saved directly to SQLite database!",
    mapImportTokens: (params) => ({
        apiKey: params.accessToken,
        refreshToken: params.refreshToken,
        baseUrl: params.baseUrl
    }),
    buildExecutor: ({ id, name, baseUrl, apiKey }) =>
        new TabiTokenExecutor({ id, name, baseUrl: baseUrl || TABITOKEN_BASE_URL, apiKey })
};

const tokenRouter: AuthProviderHandler = {
    providerId: "tokenrouter",
    displayName: "TokenRouter",
    category: "api_key",
    protocol: "openai",
    idPrefix: "tokenrouter",
    baseUrl: () => TOKENROUTER_BASE_URL,
    oauthSuccessMessage: "",
    tokenImportMessage: "TokenRouter API Key registered and saved directly to SQLite database!",
    mapImportTokens: (params) => ({
        apiKey: params.accessToken,
        refreshToken: params.refreshToken,
        baseUrl: params.baseUrl
    }),
    buildExecutor: ({ id, name, baseUrl, apiKey }) =>
        new TokenRouterExecutor({ id, name, baseUrl: baseUrl || TOKENROUTER_BASE_URL, apiKey })
};

const codeBuddy: AuthProviderHandler = {
    providerId: "codebuddy",
    displayName: "CodeBuddy",
    category: "oauth",
    protocol: "openai",
    idPrefix: "codebuddy",
    baseUrl: () => CODEBUDDY_BASE_URL,
    oauthSuccessMessage: "Login CodeBuddy Berhasil!",
    tokenImportMessage: "CodeBuddy Access Token registered and saved directly to SQLite database!",
    oauthClass: CodeBuddyOAuth,
    mapOAuthTokens: (tokens) => ({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn
    }),
    mapImportTokens: (params) => ({
        accessToken: params.accessToken,
        refreshToken: params.refreshToken,
        baseUrl: params.baseUrl
    }),
    buildExecutor: ({ id, name, baseUrl, accessToken, apiKey }) =>
        new CodeBuddyExecutor({
            id,
            name,
            baseUrl: baseUrl || CODEBUDDY_BASE_URL,
            accessToken: accessToken || apiKey
        })
};

const codeBuddyCN: AuthProviderHandler = {
    providerId: "codebuddy-cn",
    displayName: "CodeBuddy CN",
    category: "oauth",
    protocol: "openai",
    idPrefix: "codebuddy-cn",
    baseUrl: () => CODEBUDDY_CN_BASE_URL,
    oauthSuccessMessage: "Login CodeBuddy CN Berhasil!",
    tokenImportMessage:
        "CodeBuddy CN Access Token registered and saved directly to SQLite database!",
    oauthClass: CodeBuddyCNOAuth,
    mapOAuthTokens: codeBuddy.mapOAuthTokens,
    mapImportTokens: codeBuddy.mapImportTokens,
    buildExecutor: ({ id, name, baseUrl, accessToken, apiKey }) =>
        new CodeBuddyExecutor({
            id,
            name,
            baseUrl: baseUrl || CODEBUDDY_CN_BASE_URL,
            accessToken: accessToken || apiKey,
            modelPrefix: "codebuddy-cn",
            domain: CODEBUDDY_CN_DOMAIN,
            userAgent: CODEBUDDY_CN_USER_AGENT,
            flavor: "cli"
        })
};

const bai: AuthProviderHandler = {
    providerId: "bai",
    displayName: "B.AI",
    category: "api_key",
    protocol: "openai",
    idPrefix: "bai",
    baseUrl: () => BAI_BASE_URL,
    oauthSuccessMessage: "",
    tokenImportMessage: "B.AI API Key registered and saved directly to SQLite database!",
    mapImportTokens: (params) => ({
        apiKey: params.apiKey || params.token || params.accessToken,
        refreshToken: params.refreshToken,
        baseUrl: params.baseUrl
    }),
    buildExecutor: ({ id, name, baseUrl, apiKey }) =>
        new BAIExecutor({ id, name, baseUrl: baseUrl || BAI_BASE_URL, apiKey })
};

const freebuff: AuthProviderHandler = {
    providerId: "freebuff",
    displayName: "Freebuff",
    category: "oauth",
    protocol: "openai",
    idPrefix: "freebuff",
    oauthSuccessMessage: "Login Freebuff Berhasil!",
    tokenImportMessage: "Freebuff Auth Token saved directly to SQLite database!",
    oauthClass: FreebuffOAuth,
    mapOAuthTokens: (tokens) => ({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        accountId: tokens.accountId
    }),
    mapImportTokens: (params) => ({
        accessToken: params.accessToken,
        refreshToken: params.refreshToken,
        accountId: params.accountId
    }),
    buildExecutor: ({ id, name, accessToken }) =>
        new FreebuffExecutor({ id, name, accessToken, baseUrl: FREEBUFF_BASE_URL })
};


const freepi: AuthProviderHandler = {
    providerId: "freepi",
    displayName: "FreePi",
    category: "oauth",
    protocol: "openai",
    idPrefix: "freepi",
    baseUrl: () => FREEPI_BASE_URL,
    oauthSuccessMessage: "Login FreePi Berhasil!",
    tokenImportMessage: "FreePi token saved directly to SQLite database!",
    mapOAuthTokens: (tokens) => ({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        accountId: tokens.accountId,
        expiresIn: tokens.expiresIn
    }),
    mapImportTokens: (params) => ({
        accessToken: params.accessToken || params.apiKey || (params as any).token,
        refreshToken: params.refreshToken,
        baseUrl: params.baseUrl
    }),
    buildExecutor: ({ id, name, accessToken, apiKey, baseUrl }) =>
        new FreePiExecutor({
            id,
            name,
            accessToken: accessToken || apiKey,
            apiKey,
            baseUrl: baseUrl || FREEPI_BASE_URL
        })
};

export const AuthHandlers = {
    OpenAI: openaiCodex,
    Antigravity: antigravity,
    DeepAI: deepai,
    deepai: deepai,
    Freebuff: freebuff,
    freebuff: freebuff,
    FreePi: freepi,
    freepi: freepi,
    antigravity: antigravity,
    CommandCode: commandCode,
    Anthropic: anthropic,
    Claude: claude,
    Qoder: qoder,
    GoRouter: goRouter,
    OpenRouter: openRouter,
    BluesMinds: bluesMinds,
    SeekAI: seekAI,
    TabiToken: tabiToken,
    TokenRouter: tokenRouter,
    CodeBuddy: codeBuddy,
    CodeBuddyCN: codeBuddyCN,
    BAI: bai
} as const;

export const authProviderHandlers: Record<string, AuthProviderHandler> = {
    openai_codex: AuthHandlers.OpenAI,
    antigravity: AuthHandlers.Antigravity,
    commandcode: AuthHandlers.CommandCode,
    anthropic: AuthHandlers.Anthropic,
    claude: AuthHandlers.Claude,
    qoder: AuthHandlers.Qoder,
    gorouter: AuthHandlers.GoRouter,
    openrouter: AuthHandlers.OpenRouter,
    bluesminds: AuthHandlers.BluesMinds,
    seekai: AuthHandlers.SeekAI,
    tabitoken: AuthHandlers.TabiToken,
    tokenrouter: AuthHandlers.TokenRouter,
    codebuddy: AuthHandlers.CodeBuddy,
    "codebuddy-cn": AuthHandlers.CodeBuddyCN,
    freebuff: AuthHandlers.Freebuff,
    freepi: AuthHandlers.FreePi,
    bai: AuthHandlers.BAI
};
