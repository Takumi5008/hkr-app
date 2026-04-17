#!/bin/bash
REPO_DIR="/workspaces/claude-code-book-template/hkr-app"
PORT=3000

echo "トンネルを起動中..."
pkill -f "localhost.run" 2>/dev/null || true
sleep 1

ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=60 \
    -i ~/.ssh/id_rsa -R 80:localhost:$PORT localhost.run > /tmp/tunnel.log 2>&1 &

for i in $(seq 1 15); do
  sleep 2
  URL=$(grep -o 'https://[a-z0-9]*\.lhr\.life' /tmp/tunnel.log 2>/dev/null | head -1)
  if [ -n "$URL" ]; then break; fi
done

[ -z "$URL" ] && echo "URL取得失敗" && exit 1

echo "URL: $URL"

cd "$REPO_DIR"

# Update gh-pages
git checkout gh-pages
cat > index.html << HTMLEOF
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0;url=${URL}">
  <title>HKR管理 - 転送中...</title>
  <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#1e1b4b;color:white;flex-direction:column;gap:16px}a{color:#93c5fd;font-size:16px}</style>
</head>
<body>
  <p>HKR管理アプリに転送中...</p>
  <a href="${URL}">転送されない場合はここをクリック</a>
</body>
</html>
HTMLEOF

git add index.html
git commit -m "Update redirect to $URL"
git push origin gh-pages

git checkout main

echo ""
echo "====================================="
echo "固定URL: https://takumi5008.github.io/hkr-app/"
echo "====================================="
