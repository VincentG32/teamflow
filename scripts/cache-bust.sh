#!/usr/bin/env bash
# cache-bust.sh — invalide le cache navigateur pour styles.css et app.js
#
# Calcule un hash court (sha1, 8 chars) du contenu de chaque fichier asset
# et patche index.html pour ajouter ce hash en query-string sur les imports.
# Le hash ne change que si le contenu change → cache stable tant que rien
# ne bouge, invalidé automatiquement à chaque modif.
#
# Usage : ./scripts/cache-bust.sh   (à lancer avant chaque commit qui touche
# au CSS ou au JS, ou systématiquement avant un git push)

set -euo pipefail
cd "$(dirname "$0")/.."

CSS_HASH=$(shasum -a 1 styles.css | cut -c1-8)
JS_HASH=$(shasum -a 1 app.js     | cut -c1-8)

# macOS sed = BSD → -i '' obligatoire ; sur Linux ce serait juste -i.
SED_INPLACE=(-i '')
[[ "$(uname)" != "Darwin" ]] && SED_INPLACE=(-i)

sed "${SED_INPLACE[@]}" \
  -e "s|styles\\.css?v=[a-z0-9]*|styles.css?v=${CSS_HASH}|g" \
  -e "s|app\\.js?v=[a-z0-9]*|app.js?v=${JS_HASH}|g" \
  index.html

echo "✅ Cache busted in index.html:"
echo "   styles.css?v=${CSS_HASH}"
echo "   app.js?v=${JS_HASH}"
