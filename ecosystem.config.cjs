const port = process.env.PORT || "3000";
const hostname = process.env.HOSTNAME || "0.0.0.0";

module.exports = {
  apps: [
    {
      name: "plz-minitool",
      cwd: __dirname,
      script: "./node_modules/next/dist/bin/next",
      args: `start -p ${port} -H ${hostname}`,
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: port,
        HOSTNAME: hostname,
      },
    },
  ],
};
