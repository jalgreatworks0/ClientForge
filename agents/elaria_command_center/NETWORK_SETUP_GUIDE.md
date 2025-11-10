# LM Studio Network Setup - 5090 AI Server

**Purpose**: Configure LM Studio as a network-accessible AI server
**Hardware**: NVIDIA RTX 5090 (24GB VRAM)
**Status**: Production Ready
**Last Updated**: 2025-01-07

---

## 🌐 Overview

Transform your 5090 workstation into a **network AI server** that:

- ✅ Serves AI models to all devices on your local network
- ✅ Provides OpenAI-compatible API endpoints
- ✅ Includes enhanced LM Studio REST API with stats
- ✅ Auto-starts on boot (headless)
- ✅ Supports JIT model loading
- ✅ Handles multiple concurrent requests

---

## 🚀 Quick Network Setup

### Step 1: Enable Network Serving

**Method A: LM Studio GUI** (Easiest)
1. Open LM Studio
2. Go to **Developer** tab
3. Click **"Start Server"**
4. Enable **"Serve on Local Network"** ✅
5. Note the Network URL (e.g., `http://192.168.1.100:1234`)

**Method B: CLI** (Headless)
```powershell
# Start server with network access
lms server start --port 1234 --cors --host 0.0.0.0

# Or allow all origins
lms server start --port 1234 --cors "*" --host 0.0.0.0
```

### Step 2: Find Your Server IP

```powershell
# Get your local IP address
ipconfig | findstr /i "IPv4"
```

Example output: `192.168.1.100`

Your AI server is now at:
- **OpenAI API**: `http://192.168.1.100:1234/v1`
- **LM Studio REST API**: `http://192.168.1.100:1234/api/v0`

### Step 3: Test from Another Device

```bash
# From any device on your network
curl http://192.168.1.100:1234/v1/models

# Or test from browser
http://192.168.1.100:1234/v1/models
```

---

## 📋 Complete Setup Script

Save as `D:\ClientForge\03_BOTS\elaria_command_center\setup_network_ai_server.ps1`:

```powershell
# LM Studio Network AI Server Setup
# Purpose: Configure 5090 as network-accessible AI server

param(
    [switch]$Start = $false,
    [switch]$Stop = $false,
    [switch]$Status = $false,
    [int]$Port = 1234,
    [string]$Host = "0.0.0.0"
)

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  LM STUDIO NETWORK AI SERVER" -ForegroundColor Cyan
Write-Host "  NVIDIA RTX 5090 - 24GB VRAM" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Get local IP
$localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.254.*" } | Select-Object -First 1).IPAddress

Write-Host "Local IP Address: $localIP" -ForegroundColor Cyan
Write-Host ""

if ($Status) {
    Write-Host "[Checking Service Status]" -ForegroundColor Yellow
    Write-Host ""

    try {
        # Check localhost
        $localCheck = Invoke-RestMethod -Uri "http://localhost:$Port/v1/models" -TimeoutSec 3 -ErrorAction Stop
        Write-Host "✓ Service running on localhost:$Port" -ForegroundColor Green

        # Check network
        $networkCheck = Invoke-RestMethod -Uri "http://${localIP}:$Port/v1/models" -TimeoutSec 3 -ErrorAction Stop
        Write-Host "✓ Service accessible on network: $localIP:$Port" -ForegroundColor Green
        Write-Host ""
        Write-Host "Available endpoints:" -ForegroundColor Cyan
        Write-Host "  OpenAI API:     http://$localIP:$Port/v1" -ForegroundColor White
        Write-Host "  LM Studio API:  http://$localIP:$Port/api/v0" -ForegroundColor White
        Write-Host ""
        Write-Host "Models available: $($networkCheck.data.Count)" -ForegroundColor Gray

    } catch {
        Write-Host "✗ Service not accessible" -ForegroundColor Red
        Write-Host "Run with -Start to start the service" -ForegroundColor Yellow
    }

} elseif ($Start) {
    Write-Host "[Starting Network AI Server]" -ForegroundColor Yellow
    Write-Host ""

    # Check if lms is available
    $lms = Get-Command lms -ErrorAction SilentlyContinue

    if (-not $lms) {
        Write-Host "✗ LM Studio CLI not found" -ForegroundColor Red
        Write-Host "Please install LM Studio and run: lms bootstrap" -ForegroundColor Yellow
        exit 1
    }

    Write-Host "Starting server..." -ForegroundColor Cyan
    Write-Host "  Host: $Host (all interfaces)" -ForegroundColor Gray
    Write-Host "  Port: $Port" -ForegroundColor Gray
    Write-Host ""

    # Start server
    Start-Process -FilePath "lms" -ArgumentList "server", "start", "--port", $Port, "--host", $Host, "--cors", "*" -WindowStyle Hidden

    Write-Host "Waiting for service to start..." -ForegroundColor Gray
    Start-Sleep -Seconds 3

    # Verify
    try {
        $check = Invoke-RestMethod -Uri "http://$localIP:$Port/v1/models" -TimeoutSec 5
        Write-Host ""
        Write-Host "✓ Server started successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Access from other devices:" -ForegroundColor Cyan
        Write-Host "  OpenAI API:     http://$localIP:$Port/v1" -ForegroundColor White
        Write-Host "  LM Studio API:  http://$localIP:$Port/api/v0" -ForegroundColor White
        Write-Host ""
        Write-Host "Models: $($check.data.Count) available" -ForegroundColor Gray

    } catch {
        Write-Host "✗ Failed to start server" -ForegroundColor Red
    }

} elseif ($Stop) {
    Write-Host "[Stopping Service]" -ForegroundColor Yellow
    Write-Host ""

    # Find and stop LM Studio processes
    $processes = Get-Process | Where-Object { $_.ProcessName -like "*lms*" -or $_.ProcessName -like "*lmstudio*" }

    if ($processes.Count -eq 0) {
        Write-Host "No LM Studio processes found" -ForegroundColor Gray
    } else {
        foreach ($proc in $processes) {
            Stop-Process -Id $proc.Id -Force
            Write-Host "✓ Stopped: $($proc.ProcessName)" -ForegroundColor Green
        }
    }

} else {
    # Show menu
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  .\setup_network_ai_server.ps1 -Start   # Start network server" -ForegroundColor White
    Write-Host "  .\setup_network_ai_server.ps1 -Status  # Check status" -ForegroundColor White
    Write-Host "  .\setup_network_ai_server.ps1 -Stop    # Stop server" -ForegroundColor White
    Write-Host ""
    Write-Host "Your local IP: $localIP" -ForegroundColor Cyan
    Write-Host "Default port: $Port" -ForegroundColor Gray
    Write-Host ""
}
```

---

## 🎯 API Endpoints

### OpenAI-Compatible API

**Base URL**: `http://<SERVER-IP>:1234/v1`

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/models` | GET | List models |
| `/v1/chat/completions` | POST | Chat completion |
| `/v1/completions` | POST | Text completion |
| `/v1/embeddings` | POST | Generate embeddings |
| `/v1/responses` | POST | Stateful chat (0.3.29+) |

### Enhanced LM Studio REST API

**Base URL**: `http://<SERVER-IP>:1234/api/v0`

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v0/models` | GET | List models (with stats) |
| `/api/v0/models/{id}` | GET | Model details |
| `/api/v0/chat/completions` | POST | Chat (with stats) |
| `/api/v0/completions` | POST | Text (with stats) |
| `/api/v0/embeddings` | POST | Embeddings |

**Enhanced Stats Include**:
- ✅ Tokens per second
- ✅ Time to first token (TTFT)
- ✅ Generation time
- ✅ Model quantization
- ✅ Max context length
- ✅ Load state (loaded vs unloaded)

---

## 💻 Client Examples

### From Windows PC on Network

```powershell
# Test connection
Invoke-RestMethod -Uri "http://192.168.1.100:1234/v1/models"

# Chat completion
$body = @{
    model = "qwen3-30b-a3b"
    messages = @(
        @{
            role = "user"
            content = "Hello from my Windows PC!"
        }
    )
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Method Post `
    -Uri "http://192.168.1.100:1234/v1/chat/completions" `
    -Body $body `
    -ContentType "application/json"
```

### From Mac/Linux on Network

```bash
# Test connection
curl http://192.168.1.100:1234/v1/models

# Chat completion
curl http://192.168.1.100:1234/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen3-30b-a3b",
    "messages": [
      {"role": "user", "content": "Hello from my Mac!"}
    ]
  }'
```

### From Mobile Device (iOS/Android)

Use any HTTP client or REST API testing app:

- **Base URL**: `http://192.168.1.100:1234/v1`
- **API Key**: `lm-studio` (any non-empty value)
- **Endpoint**: `/v1/chat/completions`

### From Node.js Application

```javascript
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: "lm-studio",
  baseURL: "http://192.168.1.100:1234/v1"
});

const response = await client.chat.completions.create({
  model: "qwen3-30b-a3b",
  messages: [
    { role: "user", content: "Hello from Node.js!" }
  ]
});

console.log(response.choices[0].message.content);
```

### From Python Application

```python
from openai import OpenAI

client = OpenAI(
    api_key="lm-studio",
    base_url="http://192.168.1.100:1234/v1"
)

response = client.chat.completions.create(
    model="qwen3-30b-a3b",
    messages=[
        {"role": "user", "content": "Hello from Python!"}
    ]
)

print(response.choices[0].message.content)
```

---

## 🔧 ClientForge Integration

### Update Backend Configuration

**`.env`**:
```ini
# For local development (same machine)
LMSTUDIO_BASE_URL=http://localhost:1234/v1

# For network access (from other services)
LMSTUDIO_BASE_URL=http://192.168.1.100:1234/v1

LMSTUDIO_API_KEY=lm-studio
```

### Update Frontend Configuration

**`.env.local`**:
```ini
# Backend API (adjust to your network)
NEXT_PUBLIC_API_URL=http://192.168.1.100:3001
```

---

## 🛡️ Security Considerations

### Network Security

1. **Firewall Rules**
   ```powershell
   # Allow LM Studio on Windows Firewall
   New-NetFirewallRule -DisplayName "LM Studio Server" `
       -Direction Inbound `
       -LocalPort 1234 `
       -Protocol TCP `
       -Action Allow
   ```

2. **Access Control**
   - Only accessible on local network (192.168.x.x)
   - Not exposed to internet
   - Consider VPN for remote access

3. **Authentication**
   - LM Studio doesn't require authentication by default
   - Use reverse proxy (nginx) for auth if needed
   - Implement rate limiting in your backend

### Best Practices

- ✅ Keep LM Studio updated
- ✅ Monitor resource usage
- ✅ Set up logging
- ✅ Use HTTPS with reverse proxy (optional)
- ✅ Implement rate limiting
- ✅ Regular backups

---

## 📊 Enhanced REST API Stats

### GET `/api/v0/models` Response

```json
{
  "object": "list",
  "data": [
    {
      "id": "qwen3-30b-a3b",
      "object": "model",
      "type": "llm",
      "publisher": "qwen",
      "arch": "qwen",
      "compatibility_type": "gguf",
      "quantization": "Q4_K_M",
      "state": "loaded",          // ← Load state!
      "max_context_length": 32768
    }
  ]
}
```

### POST `/api/v0/chat/completions` Response

```json
{
  "id": "chatcmpl-xxx",
  "model": "qwen3-30b-a3b",
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "Response here..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 42,
    "total_tokens": 52
  },
  "stats": {
    "tokens_per_second": 45.2,     // ← Performance!
    "time_to_first_token": 0.123,  // ← TTFT!
    "generation_time": 0.930,
    "stop_reason": "eosFound"
  },
  "model_info": {
    "arch": "qwen",
    "quant": "Q4_K_M",
    "format": "gguf",
    "context_length": 32768
  }
}
```

---

## 🎨 Admin Dashboard Integration

### Health Monitor Component

```typescript
// app/admin/components/AIServerHealth.tsx
'use client';

import { useEffect, useState } from 'react';

export function AIServerHealth() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch('/api/ai/health');
        const data = await response.json();
        setHealth(data);
      } catch (error) {
        setHealth({ ok: false });
      } finally {
        setLoading(false);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 10000); // Every 10s

    return () => clearInterval(interval);
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-4 border rounded">
      <h3 className="font-bold mb-2">AI Server Status</h3>

      <div className="space-y-2">
        <div className="flex justify-between">
          <span>Status:</span>
          <span className={health.ok ? "text-green-600" : "text-red-600"}>
            {health.ok ? "Online" : "Offline"}
          </span>
        </div>

        {health.ok && (
          <>
            <div className="flex justify-between">
              <span>Latency:</span>
              <span>{health.latency}ms</span>
            </div>

            <div className="flex justify-between">
              <span>Models:</span>
              <span>{health.modelsAvailable}</span>
            </div>

            {health.currentModel && (
              <div className="flex justify-between">
                <span>Active Model:</span>
                <span className="text-sm">{health.currentModel}</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
```

### Model Stats Dashboard

```typescript
// app/admin/components/ModelStats.tsx
'use client';

import { useEffect, useState } from 'react';

export function ModelStats() {
  const [models, setModels] = useState([]);

  useEffect(() => {
    const fetchModels = async () => {
      // Use enhanced REST API for stats
      const response = await fetch('http://192.168.1.100:1234/api/v0/models');
      const data = await response.json();
      setModels(data.data);
    };

    fetchModels();
  }, []);

  return (
    <div className="p-4 border rounded">
      <h3 className="font-bold mb-4">Available Models</h3>

      <div className="space-y-3">
        {models.map(model => (
          <div key={model.id} className="p-3 bg-gray-50 rounded">
            <div className="font-medium">{model.id}</div>
            <div className="text-sm text-gray-600 space-x-2">
              <span>State: {model.state}</span>
              <span>•</span>
              <span>Quant: {model.quantization}</span>
              <span>•</span>
              <span>Context: {model.max_context_length}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 🚀 Auto-Start Configuration

### Windows Task Scheduler

Create task to start on login:

```powershell
$action = New-ScheduledTaskAction `
    -Execute "lms" `
    -Argument "server start --port 1234 --host 0.0.0.0 --cors *"

$trigger = New-ScheduledTaskTrigger -AtLogOn

$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable

Register-ScheduledTask `
    -TaskName "LMStudio-Network-Server" `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Force
```

### Alternative: Windows Service

Use NSSM (Non-Sucking Service Manager):

```powershell
# Download NSSM
# Install LM Studio as service
nssm install LMStudioServer "C:\Path\To\lms.exe" "server start --port 1234 --host 0.0.0.0"
nssm start LMStudioServer
```

---

## 📊 Performance Monitoring

### Track Key Metrics

```typescript
// Simple metrics collector
interface AIMetrics {
  totalRequests: number;
  avgTokensPerSecond: number;
  avgTimeToFirstToken: number;
  avgLatency: number;
}

class MetricsCollector {
  private metrics: AIMetrics = {
    totalRequests: 0,
    avgTokensPerSecond: 0,
    avgTimeToFirstToken: 0,
    avgLatency: 0
  };

  recordRequest(stats: any) {
    this.metrics.totalRequests++;
    this.metrics.avgTokensPerSecond =
      (this.metrics.avgTokensPerSecond + stats.tokens_per_second) / 2;
    this.metrics.avgTimeToFirstToken =
      (this.metrics.avgTimeToFirstToken + stats.time_to_first_token) / 2;
  }

  getMetrics() {
    return this.metrics;
  }
}
```

---

## 🎯 Production Checklist

### Initial Setup
- [ ] LM Studio installed
- [ ] Models downloaded (qwen3-30b-a3b, etc.)
- [ ] Server started with network access
- [ ] Firewall configured
- [ ] IP address documented

### Configuration
- [ ] JIT loading enabled
- [ ] Auto-evict enabled
- [ ] TTL configured (10 minutes)
- [ ] CORS enabled
- [ ] Auto-start on boot configured

### Testing
- [ ] Access from localhost works
- [ ] Access from network IP works
- [ ] Access from another device works
- [ ] Health endpoint responds
- [ ] Chat completion works
- [ ] Enhanced stats available

### Monitoring
- [ ] Health dashboard deployed
- [ ] Model stats dashboard deployed
- [ ] Metrics collection active
- [ ] Logging configured
- [ ] Alerts set up (optional)

---

## 🆘 Troubleshooting

### Can't Access from Network

**Problem**: Works on localhost, fails from network

**Solutions**:
1. Check firewall: Allow port 1234
2. Verify `--host 0.0.0.0` flag used
3. Test with Windows Firewall disabled temporarily
4. Check router settings (port forwarding not needed for LAN)

### CORS Errors

**Problem**: Browser shows CORS errors

**Solutions**:
1. Start server with `--cors "*"` flag
2. Use backend as proxy (recommended)
3. Set specific CORS origins in production

### Slow Performance

**Problem**: Slow responses from network

**Solutions**:
1. Check network bandwidth
2. Use wired connection (not WiFi)
3. Enable GPU acceleration
4. Use smaller/faster models for quick tasks
5. Pre-warm frequently used models

---

## 📚 Quick Reference

### Commands
```powershell
# Start network server
lms server start --port 1234 --host 0.0.0.0 --cors "*"

# Check status
lms status

# List loaded models
lms ps

# List all models
lms ls

# Stop server
lms server stop
```

### URLs
- **OpenAI API**: `http://<IP>:1234/v1`
- **REST API**: `http://<IP>:1234/api/v0`
- **Health Check**: `http://<IP>:1234/v1/models`

### Environment Variables
```ini
LMSTUDIO_BASE_URL=http://192.168.1.100:1234/v1
LMSTUDIO_API_KEY=lm-studio
```

---

**Status**: ✅ READY FOR NETWORK DEPLOYMENT

Your 5090 is now a powerful AI server accessible to all devices on your network!
