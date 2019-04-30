const Merimee = require("../models/merimee");
const Palissy = require("../models/palissy");
const { formattedNow } = require("./utils");
const { capture } = require("../sentry.js");

function findCollection(ref = "") {
  const prefix = ref.substring(0, 2);
  switch (prefix) {
    case "EA":
    case "PA":
    case "IA":
      return Merimee;
    case "IM":
    case "PM":
    case "EM":
      return Palissy;
    default:
      return "";
  }
}

function transformBeforeUpdate(notice) {
  if (notice.IMG !== undefined) {
    notice.CONTIENT_IMAGE = notice.IMG ? "oui" : "non";
  }

  if (notice.IDPROD !== undefined && notice.EMET !== undefined) {
    notice.PRODUCTEUR = findProducteur(notice.REF, notice.IDPROD, notice.EMET);
  }

  notice.DMAJ = formattedNow();
  console.log("CONTIENT_IMAGE", notice);
}

function transformBeforeCreate(notice) {
  notice.CONTIENT_IMAGE = notice.IMG ? "oui" : "non";
  notice.DMAJ = notice.DMIS = formattedNow();
  notice.PRODUCTEUR = findProducteur(notice.REF, notice.IDPROD, notice.EMET);
}

async function checkErrors(notice) {
  const errors = [];
  try {
    //Check contact
    if (!notice.CONTACT) {
      errors.push("Le champ CONTACT ne doit pas être vide");
    }
    if (!notice.TICO && !notice.TITR && !notice.EDIF) {
      errors.push("Cette notice devrait avoir un TICO ou un TITR ou un EDIF");
    }

    for (let i = 0; i < notice.LBASE.length; i++) {
      const prefix = notice.LBASE[i].substring(0, 2);
      if (["EA", "PA", "IA"].includes(prefix)) {
        col = Merimee;
      } else if (["IM", "PM", "EM"].includes(prefix)) {
        col = Palissy;
      } else {
        errors.push(`Lien LBASE corrompu ${notice.LBASE[i]}`);
        continue;
      }
      const doc = await col.findOne({ REF: notice.LBASE[i] });
      if (!doc) {
        errors.push(`La notice ${notice.LBASE[i]} contenue dans LBASE n'existe pas`);
      }
    }

    if (notice.IMG) {
      try {
        const str =
          notice.IMG.indexOf("http://www2.culture.gouv.fr") === -1
            ? PREFIX_IMAGE + notice.IMG
            : notice.IMG;
        await rp.get(str);
      } catch (e) {
        errors.push(`Image ${str} est inaccessible`);
      }
    }
  } catch (e) {
    capture(e);
  }
  return errors;
}

function findProducteur(REF, IDPROD, EMET) {
  if (
    String(REF).startsWith("IVN") ||
    String(REF).startsWith("IVR") ||
    String(REF).startsWith("IVD") ||
    String(REF).startsWith("IVC")
  ) {
    return "INV";
  } else if (String(REF).startsWith("OA")) {
    return "CAOA";
  } else if (String(REF).startsWith("MH")) {
    return "CRMH";
  } else if (String(REF).startsWith("AR")) {
    return "ARCH";
  } else if (String(REF).startsWith("AP") && String(IDPROD).startsWith("Service départemental")) {
    return "UDAP";
  } else if (String(IDPROD).startsWith("SAP") || String(EMET).startsWith("SAP")) {
    return "SAP";
  }
  return "AUTRE";
}

async function updateLinks(notice) {
  try {
    const REF = notice.REF;
    const URL = notice.IMG;
    let LBASE = notice.LBASE || [];
    const toAdd = [...LBASE];

    const palissyNotices = await Palissy.find({ "MEMOIRE.ref": REF });
    const merimeeNotices = await Merimee.find({ "MEMOIRE.ref": REF });

    //Suppression palissy
    for (let i = 0; i < palissyNotices.length; i++) {
      if (!LBASE.includes(palissyNotices[i].REF)) {
        await palissyNotices[i].update({ $pull: { MEMOIRE: { ref: REF } } });
        console.log("DELETED", palissyNotices[i].REF);
      } else {
        const index = toAdd.indexOf(palissyNotices[i].REF);
        if (index > -1) {
          toAdd.splice(index, 1);
        }
      }
    }

    //Supression Merimee
    for (let i = 0; i < merimeeNotices.length; i++) {
      if (!LBASE.includes(merimeeNotices[i].REF)) {
        await merimeeNotices[i].update({ $pull: { MEMOIRE: { ref: REF } } });
        console.log("DELETED", merimeeNotices[i].REF);
      } else {
        const index = toAdd.indexOf(merimeeNotices[i].REF);
        if (index > -1) {
          toAdd.splice(index, 1);
        }
      }
    }

    //Ajout
    for (let i = 0; i < toAdd.length; i++) {
      const collection = await findCollection(toAdd[i]);
      if (collection) {
        await collection.update({ REF: toAdd[i] }, { $push: { MEMOIRE: { ref: REF, url: URL } } });
      }
    }
  } catch (error) {
    capture(error);
  }
}

export { updateLinks, findProducteur, checkErrors, transformBeforeCreate, transformBeforeUpdate };
