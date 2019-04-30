const Merimee = require("../models/merimee");
const Palissy = require("../models/palissy");
const Memoire = require("../models/memoire");

const {
  formattedNow,
  lambertToWGS84,
  getPolygonCentroid,
  convertCOORM,
  fixLink,
  hasCorrectCoordinates
} = require("./utils");

const { capture } = require("./../sentry.js");

function transformBeforeCreateOrUpdate(notice) {
  notice.CONTIENT_IMAGE = notice.MEMOIRE && notice.MEMOIRE.some(e => e.url) ? "oui" : "non";

  if (notice.COORM && notice.ZONE) {
    const { coordinates, message } = convertCOORM(notice.COORM, notice.ZONE);
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

function transformBeforeCreate(notice) {
  notice.DMAJ = notice.DMIS = formattedNow();
  transformBeforeCreateOrUpdate(notice);
  switch (notice.REF.substring(0, 2)) {
    case "IA":
      notice.DISCIPLINE = notice.PRODUCTEUR = "Inventaire";
      break;
    case "PA":
      notice.DISCIPLINE = notice.PRODUCTEUR = "Monuments Historiques";
      break;
    case "EA":
      notice.DISCIPLINE = notice.PRODUCTEUR = "Architecture";
      break;
    default:
      notice.DISCIPLINE = notice.PRODUCTEUR = "Autre";
      break;
  }
}

async function checkErrors(notice) {
  const errors = [];
  try {
    if (!notice.CONTACT) {
      //Check contact
      errors.push("Le champ CONTACT ne doit pas être vide");
    }

    const { message } = lambertToWGS84(notice.COOR, notice.ZONE); //Check coor
    if (message) {
      errors.push(message);
    }

    if (!notice.TICO && !notice.TITR) {
      // check Title
      errors.push("Cette notice devrait avoir un TICO ou un TITR");
    }

    const { RENV, REFP, REFE, REFO } = notice; // check Links
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
    if (REFO && REFO.length) {
      const doc = await Palissy.findOne({ REF: REFO[0] });
      if (!doc) {
        errors.push(`Le champ REFO ${REFO[0]} pointe vers une notice absente`);
      }
    }
  } catch (e) {
    capture(e);
  }

  return errors;
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

function populateREFO(notice) {
  return new Promise(async (resolve, _reject) => {
    const objs = await Palissy.find({ REFA: notice.REF });
    const REFO = objs.map(e => e.REF);
    resolve(REFO);
  });
}

export {
  populateREFO,
  checkIfMemoireImageExist,
  checkErrors,
  transformBeforeCreate,
  transformBeforeUpdate,
  transformBeforeCreateOrUpdate
};
