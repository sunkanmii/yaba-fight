/** @type {import('next').NextConfig} */
export default { poweredByHeader: false, allowedDevOrigins:['127.0.0.1'], ...(process.env.CLOUDFLARE_BUILD==='1'?{output:'export'}:{}) };
