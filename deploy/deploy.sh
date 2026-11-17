#!/usr/bin/env bash
# Sobe o ÚLTIMO COMMIT pra VPS e reinicia a Central. Roda no PC (Git Bash), na pasta da Central:
#   bash deploy/deploy.sh
# Na VPS fica tudo em /opt/central: app/ (código deste commit), app.antigo/ (o anterior, pra voltar)
# e .env (segredos, nunca vem do git). Não mexe nos outros sites: o container só publica em 127.0.0.1:3300.
set -euo pipefail

VPS="${VPS:-deployadmin@179.198.109.32}"
DIR=/opt/central
REV="$(git rev-parse --short HEAD)"

if [ -n "$(git status --porcelain)" ]; then
  echo "Aviso: há mudanças não commitadas. Sobe só o commit $REV."
fi

echo "Enviando $REV pra $VPS…"
git -c core.autocrlf=false archive --format=tar HEAD | ssh "$VPS" "
  set -e
  sudo mkdir -p $DIR
  sudo chown \$(id -u):\$(id -g) $DIR
  rm -rf $DIR/app.novo && mkdir $DIR/app.novo
  tar -x -C $DIR/app.novo
  echo $REV > $DIR/app.novo/VERSAO
  test -f $DIR/.env || { echo 'Falta $DIR/.env na VPS.'; exit 1; }
  rm -rf $DIR/app.antigo
  if [ -d $DIR/app ]; then mv $DIR/app $DIR/app.antigo; fi
  mv $DIR/app.novo $DIR/app
  cd $DIR/app
  sudo docker compose -p central --env-file ../.env build
  sudo docker compose -p central --env-file ../.env up -d
  sudo docker image prune -f >/dev/null
"

echo "Esperando a Central responder…"
for i in $(seq 40); do
  if ssh "$VPS" "curl -sf -o /dev/null http://127.0.0.1:3300/entrar"; then
    echo "No ar: commit $REV."
    exit 0
  fi
  sleep 3
done
echo "A Central não respondeu. Logs: ssh $VPS 'sudo docker logs --tail 50 central-painel-1'"
exit 1
