import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import {
  Brain, Zap, Shield, DollarSign, ArrowRight, Activity, Server, Cpu,
  FileText, Languages, Code2, Lightbulb, ImageIcon, Send, Wallet,
  Globe, Lock, Layers, CircleDollarSign, ExternalLink, Fingerprint,
  Link2, Bot, BookOpen, CreditCard
} from "lucide-react";
import logoImg from "/logo.png";

type PricingData = {
  services: Array<{
    id: string;
    endpoint: string;
    method: string;
    price_usdc: number;
    description: string;
  }>;
  x402_enabled: boolean;
  wallet: string;
};

type StatsData = {
  totalRequests: number;
  totalEarned: number;
  last24h: number;
  byService: Record<string, { calls: number; earned: number }>;
};

type HealthData = {
  status: string;
  agent: string;
  version: string;
  wallet: string;
  x402_enabled: boolean;
};

const SERVICE_ICONS: Record<string, typeof Brain> = {
  summarize: FileText,
  translate: Languages,
  "code-review": Code2,
  explain: Lightbulb,
  "generate-prompt": ImageIcon,
};

export default function HomePage() {
  const { data: pricing } = useQuery<PricingData>({ queryKey: ["/api/pricing"] });
  const { data: stats } = useQuery<StatsData>({ queryKey: ["/api/stats"] });
  const { data: health } = useQuery<HealthData>({ queryKey: ["/api/health"] });

  return (
    <div className="min-h-screen bg-background bg-grid-pattern">
      <header className="border-b border-border sticky top-0 z-50 bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="MindForHire" className="h-9 w-9 rounded-md" data-testid="img-logo" />
            <span className="font-bold text-lg" data-testid="text-brand">MindForHire</span>
          </div>
          <nav className="flex items-center gap-2">
            <Link href="/playground">
              <Button variant="ghost" data-testid="link-playground">
                <Send className="mr-1 h-4 w-4" />
                Playground
              </Button>
            </Link>
            <Link href="/docs">
              <Button variant="ghost" data-testid="link-docs">
                <BookOpen className="mr-1 h-4 w-4" />
                API Docs
              </Button>
            </Link>
            <Link href="/playground">
              <Button data-testid="button-try-now">
                Try Now <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-4 py-16 text-center">
        <Badge variant="secondary" className="mb-4" data-testid="badge-protocol">
          <Fingerprint className="h-3 w-3 mr-1" />
          ERC-8004 + x402
        </Badge>
        <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight" data-testid="text-hero-title">
          Autonomous AI Agent
          <br />
          <span className="text-primary">Selling Inference</span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8" data-testid="text-hero-description">
          MindForHire is a self-sustaining AI agent that sells inference services via x402 micro-payments.
          Pay per request in USDC on Base. No subscriptions, no API keys needed.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link href="/playground">
            <Button size="lg" data-testid="button-hero-playground">
              <Send className="mr-2 h-4 w-4" />
              Open Playground
            </Button>
          </Link>
          <Link href="/docs">
            <Button size="lg" variant="outline" data-testid="button-hero-docs">
              <BookOpen className="mr-2 h-4 w-4" />
              View API Docs
            </Button>
          </Link>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <Card className="hover-elevate" data-testid="card-stat-requests">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Requests</CardTitle>
              <Server className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-requests">
                {stats?.totalRequests?.toLocaleString() ?? "0"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.last24h ?? 0} in last 24h
              </p>
            </CardContent>
          </Card>

          <Card className="hover-elevate" data-testid="card-stat-earned">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Earned</CardTitle>
              <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-earned">
                ${stats?.totalEarned?.toFixed(4) ?? "0.0000"} <span className="text-sm font-normal text-muted-foreground">USDC</span>
              </div>
            </CardContent>
          </Card>

          <Card className="hover-elevate" data-testid="card-stat-status">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className={`h-2.5 w-2.5 rounded-full ${health?.status === "alive" ? "bg-green-500" : "bg-red-500"}`} />
                <span className="text-2xl font-bold" data-testid="text-status">
                  {health?.status === "alive" ? "Online" : "Offline"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 font-mono">
                v{health?.version ?? "1.0.0"}
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 pb-16">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Layers className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold text-center" data-testid="text-services-title">Services & Pricing</h2>
        </div>
        <p className="text-muted-foreground text-center mb-8">Pay-per-request. No subscriptions. USDC on Base.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pricing?.services?.map((service) => {
            const Icon = SERVICE_ICONS[service.id] || Brain;
            return (
              <Card key={service.id} className="hover-elevate" data-testid={`card-service-${service.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <CardTitle className="text-base capitalize">
                        {service.id.replace("-", " ")}
                      </CardTitle>
                    </div>
                    <Badge variant="secondary" data-testid={`badge-price-${service.id}`}>
                      <CircleDollarSign className="h-3 w-3 mr-1" />
                      ${service.price_usdc}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3" data-testid={`text-desc-${service.id}`}>
                    {service.description}
                  </p>
                  <code className="text-xs font-mono text-muted-foreground block">
                    POST {service.endpoint}
                  </code>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 pb-16">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Wallet className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold text-center">How x402 Payment Works</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { step: "1", title: "Send Request", desc: "POST to any paid endpoint with your data", icon: Send },
            { step: "2", title: "Get 402", desc: "Receive payment details in the response header", icon: Lock },
            { step: "3", title: "Sign & Pay", desc: "Sign USDC payment with your wallet", icon: Wallet },
            { step: "4", title: "Get Result", desc: "Retry with payment signature, get AI response", icon: Zap },
          ].map((item) => (
            <Card key={item.step} data-testid={`card-step-${item.step}`}>
              <CardContent className="pt-6 text-center">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 pb-16">
        <Card data-testid="card-identity">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Bot className="h-5 w-5 text-primary" />
                  <h3 className="font-bold text-lg">Agent Identity</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-2 flex-wrap">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Bot className="h-3 w-3" /> Name
                    </span>
                    <span className="font-mono" data-testid="text-agent-name">MindForHire</span>
                  </div>
                  <div className="flex justify-between gap-2 flex-wrap">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Fingerprint className="h-3 w-3" /> Standard
                    </span>
                    <span className="font-mono">ERC-8004</span>
                  </div>
                  <div className="flex justify-between gap-2 flex-wrap">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Link2 className="h-3 w-3" /> Chain
                    </span>
                    <span className="font-mono">Base</span>
                  </div>
                  <div className="flex justify-between gap-2 flex-wrap">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <CreditCard className="h-3 w-3" /> Payment
                    </span>
                    <span className="font-mono">x402 (USDC)</span>
                  </div>
                  <div className="flex justify-between gap-2 flex-wrap">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Globe className="h-3 w-3" /> Domain
                    </span>
                    <span className="font-mono text-xs">mindforhire.xyz</span>
                  </div>
                  <div className="flex justify-between gap-2 flex-wrap">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Wallet className="h-3 w-3" /> Wallet
                    </span>
                    <span className="font-mono text-xs break-all" data-testid="text-wallet">{pricing?.wallet || "Not configured"}</span>
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Layers className="h-5 w-5 text-primary" />
                  <h3 className="font-bold text-lg">Protocol Stack</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">
                      <Cpu className="h-3 w-3 mr-1" />
                      Runtime
                    </Badge>
                    <span className="text-sm text-muted-foreground">Conway Automaton</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">
                      <Fingerprint className="h-3 w-3 mr-1" />
                      Identity
                    </Badge>
                    <span className="text-sm text-muted-foreground">ERC-8004 on Base</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">
                      <CircleDollarSign className="h-3 w-3 mr-1" />
                      Payment
                    </Badge>
                    <span className="text-sm text-muted-foreground">x402 micro-payments (USDC)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">
                      <Brain className="h-3 w-3 mr-1" />
                      Inference
                    </Badge>
                    <span className="text-sm text-muted-foreground">Conway Cloud AI</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <footer className="border-t border-border py-6">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between gap-4 flex-wrap text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <img src={logoImg} alt="" className="h-4 w-4 rounded-sm" />
            MindForHire v1.0.0 - Autonomous AI Inference Agent
          </span>
          <div className="flex items-center gap-4">
            <a href="https://www.8004scan.io" target="_blank" rel="noopener noreferrer" className="hover:text-foreground flex items-center gap-1" data-testid="link-8004scan">
              <ExternalLink className="h-3 w-3" /> 8004scan
            </a>
            <a href="https://docs.cdp.coinbase.com/x402/welcome" target="_blank" rel="noopener noreferrer" className="hover:text-foreground flex items-center gap-1" data-testid="link-x402">
              <ExternalLink className="h-3 w-3" /> x402
            </a>
            <a href="https://conway.tech" target="_blank" rel="noopener noreferrer" className="hover:text-foreground flex items-center gap-1" data-testid="link-conway">
              <ExternalLink className="h-3 w-3" /> Conway
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
