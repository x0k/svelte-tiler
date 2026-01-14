#!/usr/bin/env bash

set -xe

d:
  pnpm run dev

b:
  pnpm run build

c:
  pnpm run check

p:
  pnpm run preview
