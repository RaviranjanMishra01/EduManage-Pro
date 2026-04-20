async function verificationToken() {
  const digits1 = Math.floor(Math.random*1); // 100 - 999
  const digits2 = Math.floor(Math.random*1); // 100 - 999
  const digits3 = Math.floor(Math.random*1); // 100 - 999
  const digits4 = Math.floor(Math.random*1); // 100 - 999
  return `${digits1}${digits2}${digits3}${digits4}`
}
module.exports = verificationToken;