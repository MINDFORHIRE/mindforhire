import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Brain, ArrowLeft, Send, Loader2, Clock, DollarSign, Copy, Check,
  FileText, Languages, Code2, Lightbulb, ImageIcon, CircleDollarSign,
  Sparkles, Zap, Terminal
} from "lucide-react";
import logoImg from "/logo.png";
import { SERVICES, type ServiceKey } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

type TryResponse = {
  service: string;
  result: string;
  price_usdc: number;
  duration_ms: number;
  agent: string;
};

const SERVICE_PLACEHOLDERS: Record<string, string> = {
  summarize: "Paste any article or long text here to get a concise summary...",
  translate: "Type the text you want to translate...",
  "code-review": "Paste your code here for a thorough review...",
  explain: "What topic would you like explained? (e.g., 'How does blockchain consensus work?')",
  "generate-prompt": "Describe the image you want to generate (e.g., 'A futuristic city floating in the clouds')",
};

const SERVICE_ICONS: Record<string, typeof Brain> = {
  summarize: FileText,
  translate: Languages,
  "code-review": Code2,
  explain: Lightbulb,
  "generate-prompt": ImageIcon,
};

export default function PlaygroundPage() {
  const [service, setService] = useState<ServiceKey>("summarize");
  const [input, setInput] = useState("");
  const [option1, setOption1] = useState("");
  const [option2, setOption2] = useState("");
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const { data: pricing } = useQuery<{ services: Array<{ id: string; price_usdc: number }> }>({
    queryKey: ["/api/pricing"],
  });

  const tryMutation = useMutation({
    mutationFn: async () => {
      const options: Record<string, string> = {};
      if (service === "translate" && option1) options.to = option1;
      if (service === "translate" && option2) options.from = option2;
      if (service === "code-review" && option1) options.language = option1;
      if (service === "code-review" && option2) options.focus = option2;
      if (service === "explain" && option1) options.level = option1;
      if (service === "summarize" && option1) options.max_length = option1;
      if (service === "generate-prompt" && option1) options.style = option1;
      if (service === "generate-prompt" && option2) options.aspect_ratio = option2;

      const res = await apiRequest("POST", "/api/try", { service, input, options });
      return res.json() as Promise<TryResponse>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Request Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const currentPrice = pricing?.services?.find((s) => s.id === service)?.price_usdc ?? 0;
  const CurrentIcon = SERVICE_ICONS[service] || Brain;

  const handleCopy = () => {
    if (tryMutation.data?.result) {
      navigator.clipboard.writeText(tryMutation.data.result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const renderOptions = () => {
    switch (service) {
      case "translate":
        return (
          <div className="flex gap-2 flex-wrap">
            <Input
              placeholder="Target language (e.g., Indonesian)"
              value={option1}
              onChange={(e) => setOption1(e.target.value)}
              className="flex-1 min-w-[140px]"
              data-testid="input-translate-to"
            />
            <Input
              placeholder="Source language (optional)"
              value={option2}
              onChange={(e) => setOption2(e.target.value)}
              className="flex-1 min-w-[140px]"
              data-testid="input-translate-from"
            />
          </div>
        );
      case "code-review":
        return (
          <div className="flex gap-2 flex-wrap">
            <Input
              placeholder="Language (e.g., JavaScript)"
              value={option1}
              onChange={(e) => setOption1(e.target.value)}
              className="flex-1 min-w-[140px]"
              data-testid="input-code-language"
            />
            <Select value={option2} onValueChange={setOption2}>
              <SelectTrigger className="flex-1 min-w-[140px]" data-testid="select-code-focus">
                <SelectValue placeholder="Focus area" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="security">Security</SelectItem>
                <SelectItem value="performance">Performance</SelectItem>
                <SelectItem value="readability">Readability</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      case "explain":
        return (
          <Select value={option1} onValueChange={setOption1}>
            <SelectTrigger data-testid="select-explain-level">
              <SelectValue placeholder="Explanation level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="expert">Expert</SelectItem>
            </SelectContent>
          </Select>
        );
      case "summarize":
        return (
          <Input
            placeholder="Max words (optional)"
            value={option1}
            onChange={(e) => setOption1(e.target.value)}
            type="number"
            data-testid="input-max-words"
          />
        );
      case "generate-prompt":
        return (
          <div className="flex gap-2 flex-wrap">
            <Select value={option1} onValueChange={setOption1}>
              <SelectTrigger className="flex-1 min-w-[140px]" data-testid="select-prompt-style">
                <SelectValue placeholder="Style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="realistic">Realistic</SelectItem>
                <SelectItem value="anime">Anime</SelectItem>
                <SelectItem value="3d">3D Render</SelectItem>
                <SelectItem value="abstract">Abstract</SelectItem>
              </SelectContent>
            </Select>
            <Select value={option2} onValueChange={setOption2}>
              <SelectTrigger className="flex-1 min-w-[140px]" data-testid="select-prompt-ratio">
                <SelectValue placeholder="Aspect ratio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="16:9">16:9</SelectItem>
                <SelectItem value="1:1">1:1</SelectItem>
                <SelectItem value="9:16">9:16</SelectItem>
                <SelectItem value="4:3">4:3</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      default:
        return null;
    }
  };

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
            <span className="font-bold text-lg">Playground</span>
          </div>
          <Badge variant="secondary" data-testid="badge-mode">
            <Zap className="h-3 w-3 mr-1" />
            Free Trial
          </Badge>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <Card data-testid="card-playground-input">
          <CardHeader>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Try a Service</CardTitle>
              </div>
              <Badge variant="outline" data-testid="badge-price">
                <CircleDollarSign className="h-3 w-3 mr-1" />
                ${currentPrice} USDC
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={service} onValueChange={(v) => { setService(v as ServiceKey); setInput(""); setOption1(""); setOption2(""); }}>
              <SelectTrigger data-testid="select-service">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SERVICES).map(([key, val]) => {
                  const SvcIcon = SERVICE_ICONS[key] || Brain;
                  return (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        <SvcIcon className="h-3.5 w-3.5" />
                        {key.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase())} - {val.description}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {renderOptions()}

            <Textarea
              placeholder={SERVICE_PLACEHOLDERS[service]}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="min-h-[150px] font-mono text-sm"
              data-testid="textarea-input"
            />

            <div className="flex items-center justify-between gap-4 flex-wrap">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <CurrentIcon className="h-3 w-3" />
                {input.length} characters
              </p>
              <Button
                onClick={() => tryMutation.mutate()}
                disabled={!input.trim() || tryMutation.isPending}
                data-testid="button-submit"
              >
                {tryMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Run
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {tryMutation.data && (
          <Card data-testid="card-playground-result">
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Result</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" data-testid="badge-duration">
                    <Clock className="h-3 w-3 mr-1" />
                    {tryMutation.data.duration_ms}ms
                  </Badge>
                  <Button variant="ghost" size="icon" onClick={handleCopy} data-testid="button-copy">
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-muted rounded-md p-4">
                <pre className="text-sm whitespace-pre-wrap break-words font-mono" data-testid="text-result">
                  {tryMutation.data.result}
                </pre>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
