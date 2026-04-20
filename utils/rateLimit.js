const rateLimit = new Map();

function canSendOtp(email) {
  const limit = rateLimit.get(email);
  if (!limit) return true;

  const now = Date.now();
  const minuteAgo = now - 60000;
  const hourAgo = now - 3600000;

  if (limit.lastSent > minuteAgo) return false;
  if (limit.firstAttempt < hourAgo) return true;
  if (limit.count >= 5) return false;

  return true;
}

function updateRateLimit(email) {
  const now = Date.now();
  const limit = rateLimit.get(email);

  if (!limit || limit.firstAttempt < now - 3600000) {
    return rateLimit.set(email, { firstAttempt: now, lastSent: now, count: 1 });
  }

  rateLimit.set(email, {
    firstAttempt: limit.firstAttempt,
    lastSent: now,
    count: limit.count + 1
  });
}

function clearRateLimit(email) {
  rateLimit.delete(email);
}

module.exports = { canSendOtp, updateRateLimit, clearRateLimit };
