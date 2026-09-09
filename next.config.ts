import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // The guide route reads the checked-in markdown at request time.
  outputFileTracingIncludes: { '/AGENTS_GUIDE.md': ['./AGENTS_GUIDE.md'] },
}

export default nextConfig
