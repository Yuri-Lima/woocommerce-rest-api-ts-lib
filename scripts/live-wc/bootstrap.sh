#!/usr/bin/env bash
# Bootstrap a free local WooCommerce store and print MCP env vars.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

SITE_URL="${SITE_URL:-http://127.0.0.1:8088}"
ADMIN_USER="${ADMIN_USER:-admin}"
ADMIN_PASS="${ADMIN_PASS:-adminpass123}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@example.com}"

echo "==> Starting WordPress + MySQL (Docker)…"
docker compose up -d db wordpress wpcli

echo "==> Waiting for WordPress HTTP…"
for i in $(seq 1 60); do
  if curl -sf "$SITE_URL" >/dev/null 2>&1 || curl -sf -o /dev/null -w "%{http_code}" "$SITE_URL" | grep -qE '200|302|301'; then
    break
  fi
  sleep 2
done

wp() {
  docker compose exec -T wpcli wp --path=/var/www/html --allow-root "$@"
}

# Wait until wp is usable
for i in $(seq 1 60); do
  if docker compose exec -T wpcli wp core is-installed --path=/var/www/html --allow-root 2>/dev/null; then
    INSTALLED=1
    break
  fi
  if docker compose exec -T wpcli wp core version --path=/var/www/html --allow-root >/dev/null 2>&1; then
    INSTALLED=0
    break
  fi
  sleep 2
done

if ! docker compose exec -T wpcli wp core is-installed --path=/var/www/html --allow-root 2>/dev/null; then
  echo "==> Installing WordPress…"
  docker compose exec -T wpcli wp core install \
    --path=/var/www/html \
    --url="$SITE_URL" \
    --title="MCP Woo Test Store" \
    --admin_user="$ADMIN_USER" \
    --admin_password="$ADMIN_PASS" \
    --admin_email="$ADMIN_EMAIL" \
    --skip-email \
    --allow-root
fi

echo "==> Installing & activating WooCommerce…"
docker compose exec -T wpcli wp plugin install woocommerce --activate --force --path=/var/www/html --allow-root || true
docker compose exec -T wpcli wp plugin activate woocommerce --path=/var/www/html --allow-root || true

echo "==> Configuring basic store settings…"
docker compose exec -T wpcli wp option update woocommerce_store_address "123 MCP Street" --path=/var/www/html --allow-root
docker compose exec -T wpcli wp option update woocommerce_store_city "Testville" --path=/var/www/html --allow-root
docker compose exec -T wpcli wp option update woocommerce_default_country "US:CA" --path=/var/www/html --allow-root
docker compose exec -T wpcli wp option update woocommerce_currency "USD" --path=/var/www/html --allow-root
docker compose exec -T wpcli wp option update woocommerce_coming_soon "no" --path=/var/www/html --allow-root || true
docker compose exec -T wpcli wp rewrite structure '/%postname%/' --path=/var/www/html --allow-root
docker compose exec -T wpcli wp rewrite flush --path=/var/www/html --allow-root

echo "==> Creating sample products…"
docker compose exec -T wpcli wp post list --post_type=product --format=count --path=/var/www/html --allow-root | grep -q '[1-9]' || {
  docker compose exec -T wpcli wp wc product create --user=1 --name="Blue T-Shirt" --type=simple --regular_price=29.99 --status=publish --path=/var/www/html --allow-root || \
  docker compose exec -T wpcli wp eval '
    $id = wp_insert_post(["post_title"=>"Blue T-Shirt","post_type"=>"product","post_status"=>"publish"]);
    update_post_meta($id, "_regular_price", "29.99");
    update_post_meta($id, "_price", "29.99");
    update_post_meta($id, "_manage_stock", "yes");
    update_post_meta($id, "_stock", "50");
    wp_set_object_terms($id, "simple", "product_type");
    echo $id;
  ' --path=/var/www/html --allow-root

  docker compose exec -T wpcli wp eval '
    $id = wp_insert_post(["post_title"=>"Red Hat","post_type"=>"product","post_status"=>"publish"]);
    update_post_meta($id, "_regular_price", "19.99");
    update_post_meta($id, "_price", "19.99");
    update_post_meta($id, "_manage_stock", "yes");
    update_post_meta($id, "_stock", "3");
    wp_set_object_terms($id, "simple", "product_type");
    echo $id;
  ' --path=/var/www/html --allow-root
}

echo "==> Generating WooCommerce REST API keys…"
# Create read/write API key via WooCommerce table
KEYS_JSON=$(docker compose exec -T wpcli wp eval '
  global $wpdb;
  $description = "woo-mcp-live-test";
  // delete prior keys with same description
  $wpdb->delete($wpdb->prefix . "woocommerce_api_keys", ["description" => $description]);
  $consumer_key    = "ck_" . wc_rand_hash();
  $consumer_secret = "cs_" . wc_rand_hash();
  $wpdb->insert(
    $wpdb->prefix . "woocommerce_api_keys",
    [
      "user_id"         => 1,
      "description"     => $description,
      "permissions"     => "read_write",
      "consumer_key"    => wc_api_hash($consumer_key),
      "consumer_secret" => $consumer_secret,
    ]
  );
  echo json_encode([
    "consumer_key" => $consumer_key,
    "consumer_secret" => $consumer_secret,
  ]);
' --path=/var/www/html --allow-root)

# Strip possible CRLF / noise
KEYS_JSON=$(echo "$KEYS_JSON" | tr -d '\r' | tail -n 1)
CK=$(php -r 'echo json_decode(file_get_contents("php://stdin"), true)["consumer_key"] ?? "";' <<<"$KEYS_JSON" 2>/dev/null || true)
if [[ -z "${CK:-}" ]]; then
  CK=$(python3 -c 'import json,sys; print(json.loads(sys.stdin.read())["consumer_key"])' <<<"$KEYS_JSON")
  CS=$(python3 -c 'import json,sys; print(json.loads(sys.stdin.read())["consumer_secret"])' <<<"$KEYS_JSON")
else
  CS=$(php -r 'echo json_decode(file_get_contents("php://stdin"), true)["consumer_secret"] ?? "";' <<<"$KEYS_JSON")
fi

ENV_FILE="$ROOT/.env.live"
cat > "$ENV_FILE" <<ENV
WC_URL=$SITE_URL
WC_KEY=$CK
WC_SECRET=$CS
WC_QUERY_STRING_AUTH=false
WC_RATE_LIMIT_PER_SECOND=10
ENV

echo ""
echo "============================================"
echo " Free local WooCommerce store is ready"
echo "============================================"
echo " Store URL : $SITE_URL"
echo " Admin     : $SITE_URL/wp-admin"
echo " User/Pass : $ADMIN_USER / $ADMIN_PASS"
echo " Env file  : $ENV_FILE"
echo ""
echo " export \$(grep -v '^#' $ENV_FILE | xargs)"
echo " pnpm --filter woo-mcp-server exec node ../../packages/mcp-server/dist/cli.js"
echo "============================================"

# Quick API smoke
echo "==> Smoke-testing REST API…"
HTTP=$(curl -s -o /tmp/wc-products.json -w "%{http_code}" \
  "$SITE_URL/wp-json/wc/v3/products?consumer_key=$CK&consumer_secret=$CS&per_page=5")
echo " GET /products => HTTP $HTTP"
head -c 300 /tmp/wc-products.json; echo
