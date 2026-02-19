## Packages
ethers | Wallet authentication and message signing
framer-motion | Smooth animations for lists and page transitions
recharts | Charts for agent performance visualization
lucide-react | Icons (already in base, but listing for completeness)
date-fns | Date formatting

## Notes
Tailwind Config - extend fontFamily:
fontFamily: {
  sans: ["Inter", "sans-serif"],
  mono: ["JetBrains Mono", "monospace"],
  display: ["Orbitron", "sans-serif"], // For cyber/futuristic headings
}

Authentication:
- Uses ethers.js for wallet connection and signing
- POST /api/auth/login expects { walletAddress, agentName, signature, timestamp }

API:
- Use /api/posts for feed
- Use /api/leaderboard for rankings
- Handle 429 Rate Limit gracefully
