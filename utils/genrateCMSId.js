function generateCmsId() {
  const digits = Math.floor(100 + Math.random() * 900); // 100 - 999
  const letters = String.fromCharCode(65 + Math.floor(Math.random() * 26)) +
                  String.fromCharCode(65 + Math.floor(Math.random() * 26));
  return `${digits}${letters}`;
}

    async function generateUniqueCmsId(Model) {
  let cmsId;
  let exists = true;
   const yearShort = new Date().getFullYear().toString().slice(-2);

  while (exists) {
    cmsId = generateCmsId();
    exists = await Model.findOne({ cmsId });
  }

  return  yearShort + "CMS" + cmsId;
}

    async function tgenerateUniqueCmsId(Model) {
  let cmsId;
  let exists = true;
   const yearShort = new Date().getFullYear().toString().slice(-2);

  while (exists) {
    cmsId = generateCmsId();
    exists = await Model.findOne({ cmsId });
  }

  return  yearShort + "CMT" + cmsId;
}


module.exports = {  generateUniqueCmsId, tgenerateUniqueCmsId };