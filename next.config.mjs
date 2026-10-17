/** @type {import('next').NextConfig} */
export default { poweredByHeader: false, ...(process.env.CLOUDFLARE_BUILD==='1'?{output:'export'}:{}) };
