#!/usr/bin/env bash
# install-hooks.sh — branche les hooks Git versionnés du projet.
#
# À lancer UNE FOIS après `git clone`. Ensuite chaque `git commit` exécute
# automatiquement le hook pre-commit qui met à jour les query-strings de
# cache-busting dans index.html.

set -e
cd "$(git rev-parse --show-toplevel)"

git config core.hooksPath scripts/hooks
chmod +x scripts/hooks/pre-commit scripts/cache-bust.sh

echo "✅ Git hooks installés (core.hooksPath = scripts/hooks)"
echo "   Le cache-busting tournera désormais à chaque git commit."
