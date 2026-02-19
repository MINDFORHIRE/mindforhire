import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

const WALLET_ADDRESS = process.env.WALLET_ADDRESS || "";
const CONWAY_API_KEY = process.env.CONWAY_API_KEY || "";
const CONWAY_INFERENCE_URL = process.env.CONWAY_INFERENCE_URL || "https://api.conway.tech/v1/chat/completions";
const X402_FACILITATOR_URL = process.env.X402_FACILITATOR_URL || "https://facilitator.x402.org";
const X402_ENABLED = process.env.X402_ENABLED === "true";

if (!WALLET_ADDRESS || WALLET_ADDRESS === "") {
  console.error("FATAL: WALLET_ADDRESS environment variable is required.");
  console.error("Set it to your agent's wallet address before starting.");
  process.exit(1);
}

if (!CONWAY_API_KEY) {
  console.warn("WARNING: CONWAY_API_KEY not set. Inference calls will fail.");
}

app.use(cors());
app.use(express.json({ limit: "10mb" }));

function x402PaymentMiddleware(priceUSDC) {
  return async (req, res, next) => {
    if (!X402_ENABLED) {
      return next();
    }

    const paymentSignature = req.headers["payment-signature"] || req.headers["x-payment-signature"];

    if (!paymentSignature) {
      res.status(402);
      res.setHeader("X-Payment-Required", JSON.stringify({
        scheme: "exact",
        amount: priceUSDC,
        currency: "USDC",
        network: "base",
        recipient: WALLET_ADDRESS,
        facilitator: X402_FACILITATOR_URL,
        description: `MindForHire API - $${priceUSDC} USDC`,
      }));
      return res.json({
        error: "Payment Required",
        payment: {
          amount: priceUSDC,
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
          amount: priceUSDC,
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
    } catch (error) {
      console.error("x402 verification error:", error.message);
      return res.status(500).json({
        error: "Payment verification service unavailable",
        message: "Try again later.",
      });
    }
  };
}

const stats = {
  totalRequests: 0,
  totalEarned: 0,
  startedAt: new Date().toISOString(),
  endpoints: {
    summarize: { calls: 0, earned: 0 },
    translate: { calls: 0, earned: 0 },
    "code-review": { calls: 0, earned: 0 },
    explain: { calls: 0, earned: 0 },
    "generate-prompt": { calls: 0, earned: 0 },
  },
};

const PRICING = {
  summarize: { price: "0.005", description: "Summarize any text or article into key points" },
  translate: { price: "0.003", description: "Translate text between any languages" },
  "code-review": { price: "0.02", description: "Review code and suggest improvements" },
  explain: { price: "0.005", description: "Explain complex topics in simple terms" },
  "generate-prompt": { price: "0.01", description: "Generate optimized AI image generation prompts" },
};

async function callInference(systemPrompt, userMessage, maxTokens = 1024) {
  try {
    const response = await fetch(CONWAY_INFERENCE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${CONWAY_API_KEY}`,
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Inference failed: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || data.content?.[0]?.text || "No response generated";
  } catch (error) {
    console.error("Inference error:", error.message);
    throw error;
  }
}

function trackRequest(endpoint, price) {
  stats.totalRequests++;
  stats.totalEarned += parseFloat(price);
  if (stats.endpoints[endpoint]) {
    stats.endpoints[endpoint].calls++;
    stats.endpoints[endpoint].earned += parseFloat(price);
  }
}

function createX402Config() {
  const routes = {};
  for (const [endpoint, config] of Object.entries(PRICING)) {
    routes[`POST /api/${endpoint}`] = {
      price: config.price,
      currency: "USDC",
      network: "base",
      recipient: WALLET_ADDRESS,
      description: config.description,
    };
  }
  return routes;
}

app.get("/", (req, res) => {
  res.json({
    name: "MindForHire",
    version: "1.0.0",
    type: "AI Inference Reseller Agent",
    identity: {
      standard: "ERC-8004",
      chain: "Base",
      wallet: WALLET_ADDRESS,
      payment: "x402 (USDC on Base)",
    },
    description:
      "Autonomous AI agent selling inference services via x402 micro-payments. Registered on-chain via ERC-8004.",
    endpoints: {
      free: ["GET /api/health", "GET /api/pricing", "GET /api/stats"],
      paid: Object.entries(PRICING).map(([key, val]) => ({
        method: "POST",
        path: `/api/${key}`,
        price: `$${val.price} USDC`,
        description: val.description,
      })),
    },
    x402: createX402Config(),
    links: {
      "8004scan": "https://www.8004scan.io",
      x402_docs: "https://docs.cdp.coinbase.com/x402/welcome",
      conway: "https://conway.tech",
    },
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "alive",
    agent: "MindForHire",
    uptime: Math.floor((Date.now() - new Date(stats.startedAt).getTime()) / 1000),
    wallet: WALLET_ADDRESS,
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/pricing", (req, res) => {
  res.json({
    agent: "MindForHire",
    payment_protocol: "x402",
    currency: "USDC",
    network: "Base",
    wallet: WALLET_ADDRESS,
    services: Object.entries(PRICING).map(([key, val]) => ({
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

app.get("/api/stats", (req, res) => {
  res.json({
    agent: "MindForHire",
    started_at: stats.startedAt,
    total_requests: stats.totalRequests,
    total_earned_usdc: stats.totalEarned.toFixed(4),
    endpoints: stats.endpoints,
  });
});

app.post("/api/summarize", x402PaymentMiddleware(PRICING.summarize.price), async (req, res) => {
  try {
    const { text, max_length } = req.body;
    if (!text) return res.status(400).json({ error: "Missing 'text' field in request body" });

    const systemPrompt = `You are a professional summarizer. Create a clear, concise summary of the provided text. ${max_length ? `Keep the summary under ${max_length} words.` : "Keep it concise but comprehensive."}`;

    const result = await callInference(systemPrompt, text);
    trackRequest("summarize", PRICING.summarize.price);

    res.json({
      service: "summarize",
      input_length: text.length,
      summary: result,
      price_charged: `$${PRICING.summarize.price} USDC`,
      agent: "MindForHire",
    });
  } catch (error) {
    res.status(500).json({ error: "Inference failed", message: error.message });
  }
});

app.post("/api/translate", x402PaymentMiddleware(PRICING.translate.price), async (req, res) => {
  try {
    const { text, from, to } = req.body;
    if (!text || !to) return res.status(400).json({ error: "Missing 'text' and 'to' fields. Example: { text: 'Hello', to: 'Indonesian' }" });

    const systemPrompt = `You are a professional translator. Translate the given text ${from ? `from ${from} ` : ""}to ${to}. Provide only the translation, no explanations.`;

    const result = await callInference(systemPrompt, text);
    trackRequest("translate", PRICING.translate.price);

    res.json({
      service: "translate",
      from: from || "auto-detect",
      to,
      original: text,
      translation: result,
      price_charged: `$${PRICING.translate.price} USDC`,
      agent: "MindForHire",
    });
  } catch (error) {
    res.status(500).json({ error: "Inference failed", message: error.message });
  }
});

app.post("/api/code-review", x402PaymentMiddleware(PRICING["code-review"].price), async (req, res) => {
  try {
    const { code, language, focus } = req.body;
    if (!code) return res.status(400).json({ error: "Missing 'code' field. Optional: 'language', 'focus' (security/performance/readability)" });

    const systemPrompt = `You are a senior software engineer performing code review. ${language ? `The code is written in ${language}.` : "Detect the language."} ${focus ? `Focus on: ${focus}.` : "Review for bugs, security issues, performance, and readability."} Provide structured feedback with specific line references and improvement suggestions.`;

    const result = await callInference(systemPrompt, code, 2048);
    trackRequest("code-review", PRICING["code-review"].price);

    res.json({
      service: "code-review",
      language: language || "auto-detected",
      focus: focus || "general",
      review: result,
      price_charged: `$${PRICING["code-review"].price} USDC`,
      agent: "MindForHire",
    });
  } catch (error) {
    res.status(500).json({ error: "Inference failed", message: error.message });
  }
});

app.post("/api/explain", x402PaymentMiddleware(PRICING.explain.price), async (req, res) => {
  try {
    const { topic, level } = req.body;
    if (!topic) return res.status(400).json({ error: "Missing 'topic' field. Optional: 'level' (beginner/intermediate/expert)" });

    const systemPrompt = `You are an expert teacher. Explain the given topic clearly and thoroughly. ${level ? `Target audience: ${level} level.` : "Explain for a general audience."} Use analogies and examples where helpful.`;

    const result = await callInference(systemPrompt, topic);
    trackRequest("explain", PRICING.explain.price);

    res.json({
      service: "explain",
      topic,
      level: level || "general",
      explanation: result,
      price_charged: `$${PRICING.explain.price} USDC`,
      agent: "MindForHire",
    });
  } catch (error) {
    res.status(500).json({ error: "Inference failed", message: error.message });
  }
});

app.post("/api/generate-prompt", x402PaymentMiddleware(PRICING["generate-prompt"].price), async (req, res) => {
  try {
    const { idea, style, aspect_ratio } = req.body;
    if (!idea) return res.status(400).json({ error: "Missing 'idea' field. Optional: 'style' (realistic/anime/3d/abstract), 'aspect_ratio' (16:9/1:1/9:16)" });

    const systemPrompt = `You are an expert AI image prompt engineer. Create a highly detailed, optimized prompt for AI image generation (Midjourney/DALL-E/Stable Diffusion style). ${style ? `Style: ${style}.` : ""} ${aspect_ratio ? `Aspect ratio: ${aspect_ratio}.` : ""} Include details about: subject, composition, lighting, mood, colors, camera angle, and artistic style. Output ONLY the prompt text, nothing else.`;

    const result = await callInference(systemPrompt, idea);
    trackRequest("generate-prompt", PRICING["generate-prompt"].price);

    res.json({
      service: "generate-prompt",
      idea,
      style: style || "auto",
      generated_prompt: result,
      price_charged: `$${PRICING["generate-prompt"].price} USDC`,
      agent: "MindForHire",
    });
  } catch (error) {
    res.status(500).json({ error: "Inference failed", message: error.message });
  }
});

app.get("/.well-known/x402-manifest.json", (req, res) => {
  res.json({
    name: "MindForHire",
    description: "AI Inference Reseller - Pay per request via x402",
    version: "1.0.0",
    identity: {
      standard: "ERC-8004",
      chain: "base",
      wallet: WALLET_ADDRESS,
    },
    payment: {
      protocol: "x402",
      currency: "USDC",
      network: "base",
      recipient: WALLET_ADDRESS,
    },
    routes: createX402Config(),
  });
});

app.get("/.well-known/8004-agent.json", (req, res) => {
  res.json({
    name: "MindForHire",
    description: "Autonomous AI inference reseller agent. Pay-per-request AI services via x402 micro-payments.",
    standard: "ERC-8004",
    chain: "base",
    wallet: WALLET_ADDRESS,
    services: ["summarize", "translate", "code-review", "explain", "generate-prompt"],
    payment: "x402 (USDC on Base)",
    api_base: `http://localhost:${PORT}`,
    status: "active",
  });
});

app.use((req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    available_endpoints: {
      free: ["GET /", "GET /api/health", "GET /api/pricing", "GET /api/stats"],
      paid: Object.keys(PRICING).map((k) => `POST /api/${k}`),
    },
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`
  ╔══════════════════════════════════════════════════╗
  ║          MindForHire Agent v1.0.0                ║
  ║          AI Inference Reseller                   ║
  ╠══════════════════════════════════════════════════╣
  ║  Server:    http://0.0.0.0:${PORT}                  ║
  ║  Wallet:    ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-4)}          ║
  ║  Payment:   x402 (USDC on Base)                  ║
  ║  Identity:  ERC-8004                             ║
  ╠══════════════════════════════════════════════════╣
  ║  FREE endpoints:                                 ║
  ║    GET  /api/health                              ║
  ║    GET  /api/pricing                             ║
  ║    GET  /api/stats                               ║
  ║  PAID endpoints:                                 ║
  ║    POST /api/summarize      $0.005               ║
  ║    POST /api/translate      $0.003               ║
  ║    POST /api/code-review    $0.020               ║
  ║    POST /api/explain        $0.005               ║
  ║    POST /api/generate-prompt $0.010              ║
  ╚══════════════════════════════════════════════════╝
  `);
});
