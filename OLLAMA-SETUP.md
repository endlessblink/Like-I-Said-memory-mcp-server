# Ollama Setup Guide for Like-I-Said MCP Server

## 🚀 Quick Start

### 1. Install Ollama
- **Windows/Mac/Linux**: Download from [https://ollama.ai](https://ollama.ai)
- **Ubuntu/Debian**: `curl -fsSL https://ollama.ai/install.sh | sh`

### 2. Start Ollama Server
```bash
ollama serve
```

### 3. Pull a Model
```bash
# Recommended for memory enhancement (fast & efficient)
ollama pull llama3.1:8b

# Alternative lightweight option
ollama pull gemma2:2b
```

### 4. Test Connection
In Claude Desktop, use the MCP tool:
```
/check_ollama_status
```

## 🔧 WSL Configuration

If you're using WSL (Windows Subsystem for Linux), the MCP server will automatically try multiple connection methods:

1. **Auto-detection**: The server reads WSL's `/etc/resolv.conf` to find Windows host IP
2. **Fallback URLs**: Tries `host.docker.internal:11434` and `172.17.0.1:11434`
3. **Manual override**: Set `OLLAMA_HOST` environment variable

### Manual Configuration (if needed)
```bash
# In WSL, find your Windows host IP
cat /etc/resolv.conf | grep nameserver

# Export the IP
export OLLAMA_HOST=http://YOUR_WINDOWS_IP:11434
```

## 📋 Available MCP Tools

### 1. check_ollama_status
Check if Ollama is running and list installed models:
```
/check_ollama_status
```

### 2. enhance_memory_ollama
Enhance a single memory with AI-generated title and summary:
```
/enhance_memory_ollama memory_id: "mem_123" model: "llama3.1:8b"
```

### 3. batch_enhance_memories_ollama
Process multiple memories efficiently:
```
/batch_enhance_memories_ollama project: "my-project" limit: 50 model: "llama3.1:8b"
```

## 🤖 Recommended Models

### For Memory Enhancement
- **llama3.1:8b** - Best balance of quality and speed (5GB)
- **gemma2:2b** - Lightweight and fast (1.6GB)
- **mistral:7b** - Good for technical content (4GB)

### For Code-Heavy Memories
- **qwen2.5-coder:7b** - Optimized for code understanding (4.7GB)
- **deepseek-coder:6.7b** - Excellent code comprehension (3.8GB)

## 🐛 Troubleshooting

### Connection Issues
1. **"Ollama server not available"**
   - Ensure Ollama is running: `ollama serve`
   - Check if firewall is blocking port 11434
   - For WSL: Make sure Ollama is running on Windows host, not in WSL

2. **"Model not found"**
   - Pull the model first: `ollama pull llama3.1:8b`
   - Check available models: `ollama list`

3. **Slow Processing**
   - Use a smaller model (gemma2:2b instead of llama3.1:8b)
   - Reduce batch size in batch processing
   - Ensure adequate RAM (8GB+ recommended)

### WSL-Specific Issues
1. **Can't connect from WSL to Windows Ollama**
   ```bash
   # Option 1: Use the Windows host IP
   export OLLAMA_HOST=http://$(cat /etc/resolv.conf | grep nameserver | awk '{print $2}'):11434
   
   # Option 2: Try docker internal host
   export OLLAMA_HOST=http://host.docker.internal:11434
   ```

2. **Permission Denied**
   - Run Ollama on Windows side, not in WSL
   - Ensure Windows Defender/firewall allows connections

## 📊 Performance Tips

1. **Batch Processing**
   - Process memories in batches of 5-10 for optimal throughput
   - Larger batches may cause timeouts with bigger models

2. **Model Selection**
   - Start with smaller models (2B-7B parameters)
   - Upgrade to larger models only if quality is insufficient

3. **Resource Management**
   - Close other applications when processing large batches
   - Monitor RAM usage - Ollama can be memory intensive

## 🔒 Privacy & Security

- **100% Local**: All processing happens on your machine
- **No Internet Required**: Models run offline after download
- **Data Privacy**: Your memories never leave your computer
- **Model Storage**: Models are stored in `~/.ollama/models`

## 💡 Advanced Configuration

### Custom Models
Create a Modelfile for specialized behavior:
```
FROM llama3.1:8b
PARAMETER temperature 0.1
PARAMETER top_p 0.9
SYSTEM "You are a memory enhancement specialist. Generate concise titles and summaries."
```

Save as `Modelfile` and create:
```bash
ollama create memory-enhancer -f Modelfile
```

Then use in MCP:
```
/enhance_memory_ollama memory_id: "mem_123" model: "memory-enhancer"
```

## ✅ Success Indicators

When everything is working correctly:
- `check_ollama_status` shows "✅ Ollama server is running!"
- Models are listed when checking status
- Memory enhancement completes without errors
- Titles and summaries are generated successfully

Happy memory enhancing with local AI! 🧠✨