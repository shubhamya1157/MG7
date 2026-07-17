import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Dev-tunnel origin (e.g. ngrok) allowed to reach the dev server. Read from
  // env so the config isn't tied to one tunnel URL — set DEV_TUNNEL_ORIGIN in
  // .env when tunneling webhooks locally.
  // Previously hardcoded: 'jasmined-finickily-shanon.ngrok-free.dev'
  allowedDevOrigins: process.env.DEV_TUNNEL_ORIGIN
    ? [process.env.DEV_TUNNEL_ORIGIN]
    : [],
};

export default nextConfig;
