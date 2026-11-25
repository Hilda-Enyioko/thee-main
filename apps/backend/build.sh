#!/bin/bash

set -e

echo "Installing dependencies..."
pnpm install --frozen-lockfile  && pnpm prisma:generate && pnpm prisma:deploy

echo "Building NestJS application..."
pnpm run build

echo "Build completed successfully!"