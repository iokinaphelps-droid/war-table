#!/bin/sh
# Stamps BUILD_ID in index.html with the date and short commit hash of HEAD (run before committing)
h=$(git rev-parse --short HEAD 2>/dev/null || echo dev); d=$(date -u +%Y%m%d)
sed -i "s/^const BUILD_ID=\"[^\"]*\";/const BUILD_ID=\"$d.$h\";/" index.html
