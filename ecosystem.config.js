module.exports = {
  apps: [
    {
      name: 'botgc',
      script: 'src/index.js',
      cwd: '/root/botgc',
      instances: 1,
      autorestart: true,
      max_memory_restart: '300M'
    }
  ]
};
