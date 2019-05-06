const Museo = require("../models/museo");
const { capture } = require("../sentry.js");

const { formattedNow } = require("./utils");

function transformBeforeUpdate(notice) {
  if (notice.IMG !== undefined) {
    notice.CONTIENT_IMAGE = notice.IMG ? "oui" : "non";
  }
  notice.DMAJ = formattedNow();
}

async function checkErrors(notice) {
  const errors = [];
  try {
    //Check contact
    if (!notice.CONTACT) {
      errors.push("Le champ CONTACT ne doit pas être vide");
    }

    //Joconde
    if (!notice.TICO && !notice.TITR) {
      errors.push("Cette notice devrait avoir un TICO ou un TITR");
    }

    for (let i = 0; i < IMG.length; i++) {
      try {
        await rp.get(PREFIX_IMAGE + IMG[i]);
      } catch (e) {
        errors.push(`Image est inaccessible`);
      }
    }
  } catch (e) {
    capture(e);
  }

  return errors;
}

function transformBeforeCreate(notice) {
  return new Promise(async (resolve, reject) => {
    try {
      notice.CONTIENT_IMAGE = notice.IMG ? "oui" : "non";
      notice.DMAJ = notice.DMIS = formattedNow();
      if (notice.MUSEO) {
        const museo = await Museo.findOne({ REF: notice.MUSEO });
        if (museo && museo.location && museo.location.lat) {
          notice.POP_COORDONNEES = museo.location;
          notice.POP_CONTIENT_GEOLOCALISATION = "oui";
        } else {
          notice.POP_CONTIENT_GEOLOCALISATION = "non";
        }
      }
      resolve();
    } catch (e) {
      capture(e);
      reject(e);
    }
  });
}

module.exports = { checkErrors, transformBeforeCreate, transformBeforeUpdate };
