module.exports = {
  apps: [{
    name: 'router',
    script: 'dist/index.js',
    cwd: '/home/agentuser/Codex-Router/apps/api',
    // ANTIGRAVITY_UA is intentionally not pinned here: it is derived at runtime
    // from the latest CLI version fetched in services/antigravityVersion.ts.
    env: { NODE_ENV: 'production' },
  }],
};
