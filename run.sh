#!/usr/bin/env bash
cd "$(dirname "$0")"

echo "============================================================"
echo "🎬 Starting Kaggle Batch Shorts Studio..."
echo "============================================================"

# Kill any previous instances on port 5000 or old tunnels
fuser -k 5000/tcp 2>/dev/null || true
pkill -f "cloudflared tunnel" 2>/dev/null || true

# Start Flask Backend in background
python3 app.py > /tmp/batch_shorts_flask.log 2>&1 &
FLASK_PID=$!
sleep 2

# Start Cloudflare Tunnel
echo "🌐 Creating Cloudflare Public Live Tunnel..."
/home/rathin/.local/bin/cloudflared tunnel --url http://127.0.0.1:5000 --logfile /tmp/cf_tunnel_shorts.log > /dev/null 2>&1 &
CF_PID=$!

sleep 3
PUBLIC_URL=$(grep -o 'https://[a-zA-Z0-9-]*\.trycloudflare\.com' /tmp/cf_tunnel_shorts.log | head -n 1)

echo ""
echo "============================================================"
echo "🚀 Shorts Studio is LIVE on the Internet!"
echo "📍 Local URL:   http://localhost:5000"
if [ -n "$PUBLIC_URL" ]; then
    echo "🌍 Public URL:  $PUBLIC_URL"
    echo "   (Open from your mobile, laptop, or anywhere in the world!)"
fi
echo "============================================================"
echo "Press Ctrl+C to stop both server and tunnel."

trap "kill $FLASK_PID $CF_PID 2>/dev/null; exit 0" INT TERM
wait $FLASK_PID
