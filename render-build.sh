#!/usr/bin/env bash
# Install necessary packages for Puppeteer to work on Render
apt-get update && apt-get install -y wget gnupg \
  --no-install-recommends && \
  wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - && \
  sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' && \
  apt-get update && apt-get install -y google-chrome-stable --no-install-recommends && \
  apt-get purge --auto-remove -y && rm -rf /var/lib/apt/lists/*
