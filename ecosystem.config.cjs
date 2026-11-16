module.exports = {
  apps: [{
    name: 'router',
    script: 'dist/index.js',
    cwd: '/home/agentuser/Codex-Router/apps/api',
    env: { ANTIGRAVITY_UA: 'antigravity/cli/1.5.9', NODE_ENV: 'production' },
  }],
};
