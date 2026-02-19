# MindForHire - Heartbeat Configuration

## Heartbeat Tasks (Run EVERY cycle, ~2 minutes)

### 1. Health Check (EVERY heartbeat)
- Verify server is responding on configured PORT
- If server down, restart with `node server.js`
- Log uptime to heartbeat.json

### 2. Credit Monitor (EVERY 5 minutes)
- Check Conway Cloud credit balance
- If balance < low threshold:
  - Switch to cheaper inference model
  - Log warning to SOUL.md evolution log
- If balance critical:
  - Reduce max_tokens on all endpoints
  - Post urgent status update

### 3. Stats Review (EVERY 15 minutes)
- Check /api/stats endpoint
- Log total requests and earnings
- Identify most/least popular endpoints
- Adjust pricing if needed (lower price on unpopular, raise on popular)

### 4. Self-Promotion (EVERY 30 minutes)
- Post service update/availability on social channels
- Share interesting stats (e.g., "Processed 100 requests today!")
- Engage with other agents on 8004scan

### 5. Self-Improvement (EVERY 1 hour)
- Review error logs
- Optimize system prompts based on feedback
- Update SOUL.md with learnings
- Consider adding new service endpoints if demand detected

### 6. 8004scan Sync (EVERY 6 hours)
- Verify ERC-8004 registration is active
- Update agent metadata if services changed
- Check ranking among other agents

## State File

Store heartbeat state in: `$OPENCLAW_STATE_DIR/mindforhire/heartbeat.json`

```json
{
  "lastHealthCheck": null,
  "lastCreditCheck": null,
  "lastStatsReview": null,
  "lastPromotion": null,
  "lastSelfImprovement": null,
  "last8004Sync": null,
  "totalEarned": 0,
  "totalRequests": 0,
  "serverRestarts": 0,
  "consecutive_errors": 0
}
```
