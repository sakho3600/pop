const Merimee = require("../models/merimee");
const Memoire = require("../models/memoire");

const {
  formattedNow,
  lambertToWGS84,
  getPolygonCentroid,
  convertCOORM,
  fixLink,
  hasCorrectCoordinates
} = require("./utils");

const { capture } = require("../sentry.js");

function transformBeforeCreateOrUpdate(notice) {
  notice.CONTIENT_IMAGE = notice.MEMOIRE && notice.MEMOIRE.some(e => e.url) ? "oui" : "non";

  if (notice.COORM && notice.ZONE) {
    const { coordinates } = convertCOORM(notice.COORM, notice.ZONE);
    notice["POP_COORDINATES_POLYGON"] = {
      type: "Polygon",
      coordinates
    };
    if (!notice.COOR && !hasCorrectCoordinates(notice)) {
      const centroid = getPolygonCentroid(coordinates);
      if (centroid && centroid.length == 2) {
        notice.POP_COORDONNEES = {
          lat: centroid[0],
          lon: centroid[1]
        };
      }
    }
  }

  if (notice.COOR && notice.ZONE && !hasCorrectCoordinates(notice)) {
    notice.POP_COORDONNEES = lambertToWGS84(notice.COOR, notice.ZONE);
  }
  if (notice.POP_COORDONNEES && !hasCorrectCoordinates(notice)) {
    notice.POP_COORDONNEES = { lat: 0, lon: 0 };
  }
  notice.POP_CONTIENT_GEOLOCALISATION = hasCorrectCoordinates(notice) ? "oui" : "non";
  if (notice.DOSURL) {
    notice.DOSURL = fixLink(notice.DOSURL);
  }
  if (notice.DOSURLPDF) {
    notice.DOSURLPDF = fixLink(notice.DOSURLPDF);
  }
  if (notice.LIENS && Array.isArray(notice.LIENS)) {
    notice.LIENS = notice.LIENS.map(fixLink);
  }
}

function transformBeforeUpdate(notice) {
  notice.DMAJ = formattedNow();
  transformBeforeCreateOrUpdate(notice);
}

async function checkErrors(notice) {
  const errors = [];
  try {
    //Check contact
    if (!notice.CONTACT) {
      errors.push("Le champ CONTACT ne doit pas être vide");
    }

    //Check coor
    const { message } = lambertToWGS84(notice.COOR, notice.ZONE);
    if (message) {
      errors.push(message);
    }
    //Palissy
    if (!notice.TICO && !notice.TITR) {
      errors.push("Cette notice devrait avoir un TICO ou un TITR");
    }

    const { RENV, REFP, REFE, REFA } = notice;
    if (RENV && RENV.length) {
      const doc = await Merimee.findOne({ REF: RENV[0] });
      if (!doc) {
        errors.push(`Le champ RENV ${RENV[0]} pointe vers une notice absente`);
      }
    }
    if (REFP && REFP.length) {
      const doc = await Merimee.findOne({ REF: REFP[0] });
      if (!doc) {
        errors.push(`Le champ REFP ${REFP[0]} pointe vers une notice absente`);
      }
    }
    if (REFE && REFE.length) {
      const doc = await Merimee.findOne({ REF: REFE[0] });
      if (!doc) {
        errors.push(`Le champ REFE ${REFE[0]} pointe vers une notice absente`);
      }
    }
    if (REFA && REFA.length) {
      const doc = await Merimee.findOne({ REF: REFA[0] });
      if (!doc) {
        errors.push(`Le champ REFA ${REFA[0]} pointe vers une notice absente`);
      }
    }
  } catch (e) {
    capture(e);
  }

  return errors;
}

function transformBeforeCreate(notice) {
  notice.DMAJ = notice.DMIS = formattedNow();
  transformBeforeCreateOrUpdate(notice);

  switch (notice.REF.substring(0, 2)) {
    case "IM":
      notice.DISCIPLINE = notice.PRODUCTEUR = "Inventaire";
      break;
    case "PM":
      notice.DISCIPLINE = notice.PRODUCTEUR = "Monuments Historiques";
      break;
    case "EM":
      notice.DISCIPLINE = notice.PRODUCTEUR = "Etat";
      break;
    default:
      notice.DISCIPLINE = notice.PRODUCTEUR = "Autre";
      break;
  }
}

function checkIfMemoireImageExist(notice) {
  return new Promise(async (resolve, reject) => {
    try {
      // Here, we update the images and we keep the order ( !! important )
      const NoticesMemoire = await Memoire.find({ LBASE: notice.REF });
      const arr = NoticesMemoire.map(e => {
        return { ref: e.REF, url: e.IMG };
      });

      //@raph -> I know you want to do only one loop with a reduce but it gave me headache
      const newArr = (notice.MEMOIRE || []).filter(e => arr.find(f => f.ref == e.ref));
      for (let i = 0; i < arr.length; i++) {
        if (!newArr.find(e => e.REF === arr[i].REF)) {
          newArr.push(arr[i]);
        }
      }
      resolve(newArr);
    } catch (e) {
      capture(e);
      reject(e);
    }
  });
}

function populateMerimeeREFO(notice) {
  return new Promise(async (resolve, reject) => {
    try {
      if (!Array.isArray(notice.REFA)) {
        resolve();
        return;
      }

      const arr = [];

      const merimees = await Merimee.find({ REFO: notice.REF });

      for (let i = 0; i < merimees.length; i++) {
        // Si on a enlevé l'objet de la notice, alors on l'enleve de palissy
        if (!notice.REFA.includes(merimees[i].REF)) {
          merimees[i].REFO = merimees[i].REFO.filter(e => e !== notice.REF);
          arr.push(merimees[i].save());
        }
      }

      for (let i = 0; i < notice.REFA.length; i++) {
        if (!merimees.find(e => e.REF === notice.REFA[i])) {
          const obj = await Merimee.findOne({ REF: notice.REFA[i] });
          if (obj && Array.isArray(obj.REFO) && !obj.REFO.includes(notice.REF)) {
            obj.REFO.push(notice.REF);
            arr.push(obj.save());
          }
        }
      }
      await Promise.all(arr);
      resolve();
    } catch (error) {
      capture(error);
      resolve();
    }
  });
}
module.exports = {
  populateMerimeeREFO,
  checkIfMemoireImageExist,
  checkErrors,
  transformBeforeCreate,
  transformBeforeUpdate,
  transformBeforeCreateOrUpdate
};
