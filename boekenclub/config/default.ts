export default {
  port: 9000,
  log: {
    level: 'silly',
    disabled: false,
  },
  cors: {
    origins: ['http://localhost:5173'],
    maxAge: 3 * 60 * 60,
  },
  auth: {
    maxDelay: 5000, // ms (5s)
    jwt: {
      audience: 'boekenclub.be',
      issuer: 'boekenclub.be',
    },
    argon: {
      hashLength: 32,
      timeCost: 6,
      memoryCost: 2 ** 17,
    },
  },
  cache: {
    ttl: 300, // 5 minutes
  },
};
