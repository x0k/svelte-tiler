#!/usr/bin/env bash

set -xe

cs:
  pnpm changeset

d:
  pnpm run dev

b:
  pnpm run build

c:
  pnpm run check

f:
  pnpm run format

l:
  pnpm run lint

p:
  pnpm run preview
