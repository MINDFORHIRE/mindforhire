# MindForHire - Setup Guide

## Step-by-Step: Deploy MindForHire di Conway Automaton

### Prerequisites
- Git installed
- Node.js 18+
- Wallet Ethereum (untuk funding awal, opsional)

---

### Step 1: Clone Conway Automaton

```bash
git clone https://github.com/Conway-Research/automaton.git
cd automaton
npm install && npm run build
```

### Step 2: Jalankan Setup Wizard

```bash
node dist/index.js --run
```

Saat wizard muncul, isi:
- **Agent Name**: `MindForHire`
- **Genesis Prompt**: Copy isi dari `genesis-prompt.md`
- **Creator Address**: Wallet address kamu

Wizard akan otomatis:
- Generate wallet baru untuk agent
- Provision API key via SIWE
- Register di ERC-8004

Catat **wallet address** dan **API key** yang diberikan.

### Step 3: Copy File MindForHire

Copy semua file MindForHire ke dalam workspace agent:

```bash
# Dari folder mindforhire/
cp server.js ~/.automaton/workspace/
cp package.json ~/.automaton/workspace/
cp SOUL.md ~/.automaton/
cp heartbeat-config.md ~/.automaton/
```

### Step 4: Install Dependencies

```bash
cd ~/.automaton/workspace
npm install
```

### Step 5: Set Environment Variables

```bash
export WALLET_ADDRESS="0xYOUR_AGENT_WALLET"
export CONWAY_API_KEY="your_conway_api_key"
export CONWAY_INFERENCE_URL="https://api.conway.tech/v1/chat/completions"
export PORT=3000

# x402 Payment (set X402_ENABLED=true when ready for production)
export X402_ENABLED="false"
export X402_FACILITATOR_URL="https://facilitator.x402.org"
```

**Note:** Set `X402_ENABLED=false` saat testing (endpoint bisa diakses gratis). Set `X402_ENABLED=true` saat production (endpoint memerlukan pembayaran USDC).

### Step 6: Start Server

```bash
node server.js
```

### Step 7: Verify

```bash
# Health check
curl http://localhost:3000/api/health

# Check pricing
curl http://localhost:3000/api/pricing

# Test summarize (tanpa x402 payment untuk testing)
curl -X POST http://localhost:3000/api/summarize \
  -H "Content-Type: application/json" \
  -d '{"text": "Conway Automaton is the first self-improving AI agent framework that allows agents to earn their own existence through honest work."}'
```

### Step 8: Wire Heartbeat

Tambahkan ke heartbeat configuration agent:

```markdown
## MindForHire (EVERY heartbeat)
1. Check server health at http://localhost:3000/api/health
2. If server down, restart: cd ~/.automaton/workspace && node server.js &
3. Check /api/stats for earnings update
4. If credits low, adjust pricing strategy
```

### Step 9: Register di 8004scan (Opsional)

Agent sudah otomatis teregister via ERC-8004 saat Conway setup.
Verifikasi di: https://www.8004scan.io

---

## Testing Endpoints

### Summarize
```bash
curl -X POST http://localhost:3000/api/summarize \
  -H "Content-Type: application/json" \
  -d '{"text": "Your long article text here...", "max_length": 100}'
```

### Translate
```bash
curl -X POST http://localhost:3000/api/translate \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello, how are you?", "to": "Indonesian"}'
```

### Code Review
```bash
curl -X POST http://localhost:3000/api/code-review \
  -H "Content-Type: application/json" \
  -d '{"code": "function add(a,b){return a+b}", "language": "JavaScript", "focus": "performance"}'
```

### Explain
```bash
curl -X POST http://localhost:3000/api/explain \
  -H "Content-Type: application/json" \
  -d '{"topic": "What is ERC-8004?", "level": "beginner"}'
```

### Generate Prompt
```bash
curl -X POST http://localhost:3000/api/generate-prompt \
  -H "Content-Type: application/json" \
  -d '{"idea": "A cyberpunk city at night with neon lights", "style": "realistic", "aspect_ratio": "16:9"}'
```

---

## x402 Payment Flow

Ketika x402 middleware aktif, flow pembayaran otomatis:

1. Client kirim request ke endpoint berbayar
2. Server response: `HTTP 402 Payment Required`
3. Header `PAYMENT-REQUIRED` berisi detail pembayaran (amount, wallet, network)
4. Client sign payment dengan wallet mereka
5. Client retry request dengan header `PAYMENT-SIGNATURE`
6. Server verify payment, proses request, kirim hasil
7. USDC masuk ke wallet agent

---

## File Structure

```
~/.automaton/
  automaton.json          # Conway config (auto-generated)
  SOUL.md                 # Agent identity (self-evolving)
  heartbeat-config.md     # Heartbeat tasks
  workspace/
    server.js             # MindForHire API server
    package.json          # Dependencies
    node_modules/         # Installed packages
mindforhire/
  genesis-prompt.md       # Genesis prompt for setup
  SETUP.md                # This file
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Server won't start | Check PORT not in use: `lsof -i :3000` |
| Inference fails | Verify CONWAY_API_KEY is valid |
| No payments received | Ensure x402 middleware is configured with correct wallet |
| Agent dies | Fund wallet with USDC on Base, check credit balance |
