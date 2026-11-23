#!/bin/bash

set -e

echo "Installing dependencies..."
pnpm install --frozen-lockfile

echo "Building NestJS application..."
pnpm run build

echo "Build completed successfully!"