import type { Express } from "express";
import type { Server } from "http";
import https from "https";
import { storage } from "./storage";
import { SERVICES, tryServiceSchema, type ServiceKey } from "@shared/schema";
import { createPublicClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import crypto from "crypto";

const WALLET_ADDRESS = process.env.WALLET_ADDRESS || "0x0000000000000000000000000000000000000000";
const CONWAY_API_KEY = process.env.CONWAY_API_KEY || "";
const CONWAY_WALLET_PRIVATE_KEY = process.env.CONWAY_WALLET_PRIVATE_KEY || "";
const CONWAY_INFERENCE_URL = process.env.CONWAY_INFERENCE_URL || "https://inference.conway.tech/v1/chat/completions";
const X402_FACILITATOR_URL = process.env.X402_FACILITATOR_URL || "https://facilitator.x402.org";
const X402_ENABLED = process.env.X402_ENABLED === "true";
const EXPECTED_USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const EXPECTED_NETWORK = "eip155:8453";

function conwayFetch(url: string, options: RequestInit): Promise<Response> {
  const parsedUrl = new URL(url);
  const isDev = process.env.NODE_ENV !== "production";
  return new Promise((resolve, reject) => {
    const body = options.body as string;
    const headers = options.headers as Record<string, string>;
    const req = https.request({
      hostname: parsedUrl.hostname,
      port: 443,
      path: parsedUrl.pathname,
      method: options.method || "POST",
      headers: {
        ...headers,
        "Host": parsedUrl.hostname,
      },
      rejectUnauthorized: !isDev,
    }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const responseBody = Buffer.concat(chunks).toString();
        const responseHeaders: Record<string, string> = {};
        for (const [key, val] of Object.entries(res.headers)) {
          if (val) responseHeaders[key] = Array.isArray(val) ? val[0] : val;
        }
        resolve(new Response(responseBody, {
          status: res.statusCode || 500,
          statusText: res.statusMessage || "",
          headers: responseHeaders,
        }));
      });
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

async function createX402PaymentSignature(requirement: any): Promise<any> {
  const account = privateKeyToAccount(CONWAY_WALLET_PRIVATE_KEY as Hex);

  const network = requirement.network;
  const usdcAddress = (requirement.asset || requirement.usdcAddress || "").toLowerCase();
  if (network !== EXPECTED_NETWORK) {
    throw new Error(`Unexpected payment network: ${network}. Expected ${EXPECTED_NETWORK}.`);
  }
  if (usdcAddress && usdcAddress !== EXPECTED_USDC_ADDRESS.toLowerCase()) {
    throw new Error(`Unexpected USDC contract: ${usdcAddress}. Expected ${EXPECTED_USDC_ADDRESS}.`);
  }

  const maxAmount = BigInt(requirement.maxAmountRequired);
  const MAX_SANE_AMOUNT = BigInt(1_000_000);
  if (maxAmount > MAX_SANE_AMOUNT) {
    throw new Error(`Payment amount too large: ${maxAmount.toString()}. Max allowed: ${MAX_SANE_AMOUNT.toString()}.`);
  }

  const nonce = `0x${crypto.randomBytes(32).toString("hex")}` as Hex;
  const now = Math.floor(Date.now() / 1000);
  const validAfter = BigInt(now - 60);
  const deadlineSeconds = requirement.maxTimeoutSeconds || requirement.requiredDeadlineSeconds || 300;
  const validBefore = BigInt(now + deadlineSeconds);

  const authorization = {
    from: account.address as Hex,
    to: (requirement.payTo || requirement.payToAddress) as Hex,
    value: maxAmount,
    validAfter,
    validBefore,
    nonce,
  };

  const verifyingContract = (requirement.asset || requirement.usdcAddress || EXPECTED_USDC_ADDRESS) as Hex;
  const domain = {
    name: requirement.extra?.name || "USD Coin",
    version: requirement.extra?.version || "2",
    chainId: 8453,
    verifyingContract,
  };

  const types = {
    TransferWithAuthorization: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "validAfter", type: "uint256" },
      { name: "validBefore", type: "uint256" },
      { name: "nonce", type: "bytes32" },
    ],
  };

  const signature = await account.signTypedData({
    domain,
    types,
    primaryType: "TransferWithAuthorization",
    message: authorization,
  });

  return {
    x402Version: 1,
    scheme: requirement.scheme,
    network: requirement.network,
    payload: {
      signature,
      authorization: {
        ...authorization,
        value: authorization.value.toString(),
        validAfter: authorization.validAfter.toString(),
        validBefore: authorization.validBefore.toString(),
      },
    },
  };
}

async function handleX402Payment(paymentResponse: Response, requestBody: string, requestHeaders: Record<string, string>): Promise<Response> {
  if (!CONWAY_WALLET_PRIVATE_KEY) {
    throw new Error("Agent wallet private key not configured. Cannot process x402 payment.");
  }

  const paymentData = await paymentResponse.json();
  const requirements = paymentData.accepts;

  if (!requirements || requirements.length === 0) {
    throw new Error("No payment requirements received from Conway.");
  }

  const requirement = requirements.find((r: any) => r.scheme === "exact" && r.network === "eip155:8453");
  if (!requirement) {
    throw new Error("No supported payment option found (need exact scheme on Base network).");
  }

  const paymentPayload = await createX402PaymentSignature(requirement);
  const paymentHeader = btoa(JSON.stringify(paymentPayload));

  const retryResponse = await conwayFetch(CONWAY_INFERENCE_URL, {
    method: "POST",
    headers: {
      ...requestHeaders,
      "X-PAYMENT": paymentHeader,
    },
    body: requestBody,
  });

  return retryResponse;
}

async function callInference(systemPrompt: string, userMessage: string, maxTokens = 1024): Promise<string> {
  if (!CONWAY_API_KEY) {
    throw new Error("Conway API key not configured. Set CONWAY_API_KEY environment variable to enable AI inference.");
  }

  const requestBody = JSON.stringify({
    model: "claude-sonnet-4.5",
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  });

  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${CONWAY_API_KEY}`,
  };

  let response = await conwayFetch(CONWAY_INFERENCE_URL, {
    method: "POST",
    headers: requestHeaders,
    body: requestBody,
  });

  if (response.status === 402) {
    try {
      response = await handleX402Payment(response, requestBody, requestHeaders);
    } catch (paymentError: any) {
      throw new Error(`x402 payment failed: ${paymentError.message}. Fund your agent wallet (${WALLET_ADDRESS}) with USDC on Base network.`);
    }
  }

  if (response.status === 402) {
    throw new Error(`Insufficient USDC balance. Fund your agent wallet (${WALLET_ADDRESS}) with USDC on Base network to use AI inference.`);
  }

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Inference failed: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || data.content?.[0]?.text || "No response generated";
}

function getSystemPrompt(service: ServiceKey, options?: Record<string, string>): string {
  switch (service) {
    case "summarize":
      return `You are a professional summarizer. Create a clear, concise summary of the provided text. ${options?.max_length ? `Keep the summary under ${options.max_length} words.` : "Keep it concise but comprehensive."}`;
    case "translate":
      return `You are a professional translator. Translate the given text ${options?.from ? `from ${options.from} ` : ""}to ${options?.to || "English"}. Provide only the translation, no explanations.`;
    case "code-review":
      return `You are a senior software engineer performing code review. ${options?.language ? `The code is written in ${options.language}.` : "Detect the language."} ${options?.focus ? `Focus on: ${options.focus}.` : "Review for bugs, security issues, performance, and readability."} Provide structured feedback with specific line references and improvement suggestions.`;
    case "explain":
      return `You are an expert teacher. Explain the given topic clearly and thoroughly. ${options?.level ? `Target audience: ${options.level} level.` : "Explain for a general audience."} Use analogies and examples where helpful.`;
    case "generate-prompt":
      return `You are an expert AI image prompt engineer. Create a highly detailed, optimized prompt for AI image generation (Midjourney/DALL-E/Stable Diffusion style). ${options?.style ? `Style: ${options.style}.` : ""} ${options?.aspect_ratio ? `Aspect ratio: ${options.aspect_ratio}.` : ""} Include details about: subject, composition, lighting, mood, colors, camera angle, and artistic style. Output ONLY the prompt text, nothing else.`;
    default:
      return "You are a helpful AI assistant.";
  }
}

function x402PaymentMiddleware(priceUSDC: number) {
  return async (req: any, res: any, next: any) => {
    if (!X402_ENABLED) {
      return next();
    }

    const paymentSignature = req.headers["payment-signature"] || req.headers["x-payment-signature"];

    if (!paymentSignature) {
      res.status(402);
      res.setHeader("X-Payment-Required", JSON.stringify({
        scheme: "exact",
        amount: String(priceUSDC),
        currency: "USDC",
        network: "base",
        recipient: WALLET_ADDRESS,
        facilitator: X402_FACILITATOR_URL,
        description: `MindForHire API - $${priceUSDC} USDC`,
      }));
      return res.json({
        error: "Payment Required",
        payment: {
          amount: String(priceUSDC),
          currency: "USDC",
          network: "base",
          recipient: WALLET_ADDRESS,
          scheme: "exact",
          facilitator: X402_FACILITATOR_URL,
        },
        instructions: "Sign a payment transaction and retry with the PAYMENT-SIGNATURE header.",
      });
    }

    try {
      const verifyResponse = await fetch(`${X402_FACILITATOR_URL}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload: paymentSignature,
          recipient: WALLET_ADDRESS,
          amount: String(priceUSDC),
          currency: "USDC",
          network: "base",
        }),
      });

      if (!verifyResponse.ok) {
        return res.status(402).json({
          error: "Payment verification failed",
          message: "The payment signature could not be verified. Please retry.",
        });
      }

      const verification = await verifyResponse.json();
      if (!verification.valid) {
        return res.status(402).json({
          error: "Invalid payment",
          message: verification.reason || "Payment was not valid.",
        });
      }

      req.paymentVerified = true;
      next();
    } catch (error: any) {
      console.error("x402 verification error:", error.message);
      return res.status(500).json({
        error: "Payment verification service unavailable",
        message: "Try again later.",
      });
    }
  };
}

function createX402Config() {
  const routes: Record<string, any> = {};
  for (const [endpoint, config] of Object.entries(SERVICES)) {
    routes[`POST /api/${endpoint}`] = {
      price: String(config.price),
      currency: "USDC",
      network: "base",
      recipient: WALLET_ADDRESS,
      description: config.description,
    };
  }
  return routes;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/health", (_req, res) => {
    res.json({
      status: "alive",
      agent: "MindForHire",
      version: "1.0.0",
      wallet: WALLET_ADDRESS,
      x402_enabled: X402_ENABLED,
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/api/pricing", (_req, res) => {
    res.json({
      agent: "MindForHire",
      payment_protocol: "x402",
      currency: "USDC",
      network: "Base",
      wallet: WALLET_ADDRESS,
      x402_enabled: X402_ENABLED,
      services: Object.entries(SERVICES).map(([key, val]) => ({
        id: key,
        endpoint: `/api/${key}`,
        method: "POST",
        price_usdc: val.price,
        description: val.description,
      })),
      how_to_pay: {
        step_1: "Send a POST request to any paid endpoint",
        step_2: "Receive HTTP 402 with payment details in headers",
        step_3: "Sign payment with your wallet",
        step_4: "Retry request with PAYMENT-SIGNATURE header",
        step_5: "Receive AI-generated response",
      },
    });
  });

  app.get("/api/stats", async (_req, res) => {
    try {
      const stats = await storage.getStats();
      res.json({
        agent: "MindForHire",
        ...stats,
      });
    } catch (e) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.post("/api/try", async (req, res) => {
    try {
      const input = tryServiceSchema.parse(req.body);
      const serviceConfig = SERVICES[input.service];
      const startTime = Date.now();
      const systemPrompt = getSystemPrompt(input.service, input.options);
      const maxTokens = input.service === "code-review" ? 2048 : 1024;
      const result = await callInference(systemPrompt, input.input, maxTokens);
      const durationMs = Date.now() - startTime;

      await storage.logRequest({
        endpoint: `/api/${input.service}`,
        service: input.service,
        priceUsdc: serviceConfig.price,
        inputLength: input.input.length,
        outputLength: result.length,
        durationMs,
        paid: 0,
      });

      res.json({
        service: input.service,
        result,
        price_usdc: serviceConfig.price,
        duration_ms: durationMs,
        agent: "MindForHire",
      });
    } catch (e: any) {
      if (e.name === "ZodError") {
        return res.status(400).json({ message: "Invalid request", errors: e.errors });
      }
      console.error("Try endpoint error:", e);
      res.status(500).json({ message: e.message || "Inference failed" });
    }
  });

  for (const [key, config] of Object.entries(SERVICES)) {
    const serviceKey = key as ServiceKey;
    app.post(`/api/${key}`, x402PaymentMiddleware(config.price), async (req, res) => {
      try {
        const startTime = Date.now();
        const { input, options, text, code, topic, idea, ...rest } = req.body;
        const userInput = input || text || code || topic || idea || "";

        if (!userInput) {
          return res.status(400).json({ error: "Missing input. Provide 'input', 'text', 'code', 'topic', or 'idea' field." });
        }

        const allOptions = { ...options, ...rest };
        const systemPrompt = getSystemPrompt(serviceKey, allOptions);
        const maxTokens = serviceKey === "code-review" ? 2048 : 1024;
        const result = await callInference(systemPrompt, userInput, maxTokens);
        const durationMs = Date.now() - startTime;

        await storage.logRequest({
          endpoint: `/api/${key}`,
          service: key,
          priceUsdc: config.price,
          inputLength: userInput.length,
          outputLength: result.length,
          durationMs,
          paid: X402_ENABLED ? 1 : 0,
        });

        res.json({
          service: key,
          result,
          price_charged: `$${config.price} USDC`,
          duration_ms: durationMs,
          agent: "MindForHire",
        });
      } catch (error: any) {
        res.status(500).json({ error: "Inference failed", message: error.message });
      }
    });
  }

  app.get("/.well-known/x402-manifest.json", (_req, res) => {
    res.json({
      name: "MindForHire",
      description: "AI Inference Reseller - Pay per request via x402",
      version: "1.0.0",
      url: "https://mindforhire.xyz",
      identity: { standard: "ERC-8004", chain: "base", wallet: WALLET_ADDRESS },
      payment: { protocol: "x402", currency: "USDC", network: "base", recipient: WALLET_ADDRESS },
      routes: createX402Config(),
    });
  });

  app.get("/.well-known/8004-agent.json", (_req, res) => {
    res.json({
      name: "MindForHire",
      description: "Autonomous AI inference reseller agent. Pay-per-request AI services via x402 micro-payments.",
      standard: "ERC-8004",
      chain: "base",
      wallet: WALLET_ADDRESS,
      url: "https://mindforhire.xyz",
      services: Object.keys(SERVICES),
      payment: "x402 (USDC on Base)",
      status: "active",
    });
  });

  return httpServer;
}
