import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import {
  ArrowLeft, Copy, Check, Heart, Globe, FileText, Code2, Lightbulb, Sparkles,
  Terminal, CreditCard, Lock, Wallet, BookOpen, Search, Layers, ExternalLink,
  FileCode, Zap, CircleDollarSign, Languages, Brain, ImageIcon
} from "lucide-react";
import logoImg from "/logo.png";
import { useState } from "react";
import { SERVICES } from "@shared/schema";

type HealthData = {
  status: string;
  wallet: string;
  x402_enabled: boolean;
};

const BASE_DOMAIN = "https://mindforhire.xyz";

const SERVICE_ICONS: Record<string, typeof Brain> = {
  summarize: FileText,
  translate: Languages,
  "code-review": Code2,
  explain: Lightbulb,
  "generate-prompt": ImageIcon,
};

function CodeBlock({ code, language = "bash" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative group">
      <pre className="bg-muted rounded-md p-4 text-sm font-mono overflow-x-auto">
        <code>{code}</code>
      </pre>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ visibility: "visible" }}
        onClick={() => {
          navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        data-testid={`button-copy-${language}`}
      >
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      </Button>
    </div>
  );
}

export default function DocsPage() {
  const { data: health } = useQuery<HealthData>({ queryKey: ["/api/health"] });

  return (
    <div className="min-h-screen bg-background bg-grid-pattern">
      <header className="border-b border-border sticky top-0 z-50 bg-background/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <img src={logoImg} alt="MindForHire" className="h-9 w-9 rounded-md" />
            <span className="font-bold text-lg">API Documentation</span>
          </div>
          <Badge variant="outline">
            <BookOpen className="h-3 w-3 mr-1" />
            v1.0.0
          </Badge>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Globe className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold" data-testid="text-overview-title">Overview</h2>
          </div>
          <p className="text-muted-foreground mb-4">
            MindForHire is an autonomous AI inference agent registered on-chain via ERC-8004.
            It offers five AI services, each accessible via a simple POST request.
            When x402 is enabled, payment in USDC on Base is required before the request is processed.
          </p>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline">
              <ExternalLink className="h-3 w-3 mr-1" />
              Base URL: {BASE_DOMAIN}
            </Badge>
            <Badge variant="outline">
              <CreditCard className="h-3 w-3 mr-1" />
              Payment: {health?.x402_enabled ? "x402 Enabled" : "Free Trial"}
            </Badge>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-4">
            <Heart className="h-5 w-5 text-green-500" />
            <h2 className="text-2xl font-bold">Free Endpoints</h2>
          </div>
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Badge>GET</Badge>
                  <CardTitle className="text-base font-mono">/api/health</CardTitle>
                  <Heart className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">Returns agent health status and metadata.</p>
                <CodeBlock code={`curl ${BASE_DOMAIN}/api/health`} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Badge>GET</Badge>
                  <CardTitle className="text-base font-mono">/api/pricing</CardTitle>
                  <CircleDollarSign className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">Returns all available services with pricing.</p>
                <CodeBlock code={`curl ${BASE_DOMAIN}/api/pricing`} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Badge>GET</Badge>
                  <CardTitle className="text-base font-mono">/api/stats</CardTitle>
                  <Layers className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">Returns agent request statistics and earnings.</p>
                <CodeBlock code={`curl ${BASE_DOMAIN}/api/stats`} />
              </CardContent>
            </Card>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-4">
            <Lock className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold">Paid Endpoints</h2>
          </div>
          <p className="text-muted-foreground mb-4">
            Each paid endpoint accepts a POST request with JSON body. When x402 is enabled,
            the first request returns HTTP 402 with payment instructions. After payment,
            retry with the PAYMENT-SIGNATURE header.
          </p>

          <div className="space-y-4">
            {Object.entries(SERVICES).map(([key, config]) => {
              const Icon = SERVICE_ICONS[key] || Brain;
              return (
                <Card key={key} data-testid={`card-doc-${key}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Badge variant="default">POST</Badge>
                        <CardTitle className="text-base font-mono">/api/{key}</CardTitle>
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <Badge variant="secondary">
                        <CircleDollarSign className="h-3 w-3 mr-1" />
                        ${config.price} USDC
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">{config.description}</p>
                    {key === "summarize" && (
                      <CodeBlock code={`curl -X POST ${BASE_DOMAIN}/api/summarize \\
  -H "Content-Type: application/json" \\
  -d '{"input": "Your long article text here...", "max_length": "100"}'`} />
                    )}
                    {key === "translate" && (
                      <CodeBlock code={`curl -X POST ${BASE_DOMAIN}/api/translate \\
  -H "Content-Type: application/json" \\
  -d '{"input": "Hello, how are you?", "to": "Indonesian"}'`} />
                    )}
                    {key === "code-review" && (
                      <CodeBlock code={`curl -X POST ${BASE_DOMAIN}/api/code-review \\
  -H "Content-Type: application/json" \\
  -d '{"input": "function add(a,b){return a+b}", "language": "JavaScript"}'`} />
                    )}
                    {key === "explain" && (
                      <CodeBlock code={`curl -X POST ${BASE_DOMAIN}/api/explain \\
  -H "Content-Type: application/json" \\
  -d '{"input": "What is ERC-8004?", "level": "beginner"}'`} />
                    )}
                    {key === "generate-prompt" && (
                      <CodeBlock code={`curl -X POST ${BASE_DOMAIN}/api/generate-prompt \\
  -H "Content-Type: application/json" \\
  -d '{"input": "A cyberpunk city at night", "style": "realistic"}'`} />
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-4">
            <Terminal className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold">Playground Endpoint</h2>
          </div>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Badge variant="default">POST</Badge>
                <CardTitle className="text-base font-mono">/api/try</CardTitle>
                <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Unified endpoint for trying any service. Always free (no x402 required). Used by the playground UI.
              </p>
              <CodeBlock code={`curl -X POST ${BASE_DOMAIN}/api/try \\
  -H "Content-Type: application/json" \\
  -d '{
    "service": "summarize",
    "input": "Your text here...",
    "options": {"max_length": "50"}
  }'`} />
            </CardContent>
          </Card>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold">x402 Payment Flow</h2>
          </div>
          <Card>
            <CardContent className="pt-6 space-y-4">
              <p className="text-sm text-muted-foreground">
                When x402 is enabled, paid endpoints return HTTP 402 on the first request.
                The response includes payment details in the X-Payment-Required header.
              </p>
              <CodeBlock code={`# Step 1: Initial request (returns 402)
curl -X POST ${BASE_DOMAIN}/api/summarize \\
  -H "Content-Type: application/json" \\
  -d '{"input": "Your text..."}'

# Response: 402 Payment Required
# Header: X-Payment-Required: {"amount":"0.005","currency":"USDC",...}

# Step 2: Sign payment with your wallet (client-side)
# The payment signature is generated by signing the x402 payment payload

# Step 3: Retry with payment signature
curl -X POST ${BASE_DOMAIN}/api/summarize \\
  -H "Content-Type: application/json" \\
  -H "Payment-Signature: <your_signed_payment>" \\
  -d '{"input": "Your text..."}'`} />
            </CardContent>
          </Card>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-4">
            <Search className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold">Discovery Endpoints</h2>
          </div>
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Badge>GET</Badge>
                  <CardTitle className="text-base font-mono">/.well-known/x402-manifest.json</CardTitle>
                  <FileCode className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">x402 payment manifest for automated discovery.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Badge>GET</Badge>
                  <CardTitle className="text-base font-mono">/.well-known/8004-agent.json</CardTitle>
                  <Zap className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">ERC-8004 agent identity manifest.</p>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
