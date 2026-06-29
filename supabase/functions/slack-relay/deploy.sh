#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MAP_FILE="$SCRIPT_DIR/channel-room-map.txt"

# channel-room-map.txt から CHANNEL_ROOM_MAP を組み立てる
MAP_VALUE=""
while IFS='=' read -r channel_id room; do
  # コメント行・空行をスキップ
  [[ "$channel_id" =~ ^#.*$ || -z "$channel_id" ]] && continue
  entry="${channel_id}:${room}"
  MAP_VALUE="${MAP_VALUE:+$MAP_VALUE,}$entry"
done < "$MAP_FILE"

if [ -z "$MAP_VALUE" ]; then
  echo "Error: channel-room-map.txt にマッピングがありません"
  exit 1
fi

echo "CHANNEL_ROOM_MAP=$MAP_VALUE"

cd "$SCRIPT_DIR/../../.."
supabase secrets set CHANNEL_ROOM_MAP="$MAP_VALUE"
supabase functions deploy slack-relay --no-verify-jwt

echo "デプロイ完了"
