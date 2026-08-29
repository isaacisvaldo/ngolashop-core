#!/bin/bash
if [ -z "$1" ]; then
  echo "Uso: npm run db:create -- NomeDaMigration"
  exit 1
fi
npx typeorm-ts-node-commonjs migration:create "src/database/migrations/$1"