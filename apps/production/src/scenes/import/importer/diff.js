const diff = require("deep-diff").diff;

function compare(importedObject, existed) {
  //make the imported object flat

  let imported = importedObject.makeItFlat();
  delete imported["POP_IMPORT"];

  // I had to do this because sometimes, on IE 11, some fields are not compared well. The origin of the issue could be somewhere else but I couldnt find it
  let importedObj = JSON.parse(JSON.stringify(imported));
  console.log("importedObj1", existed);
  let existedObj = JSON.parse(JSON.stringify(existed));
  console.log("existedObj", existedObj);

  let d = diff(importedObj, existedObj);

  /*
  Differences are reported as one or more change records. Change records have the following structure:
  kind - indicates the kind of change; will be one of the following:
  N - indicates a newly added property/element
  D - indicates a property/element was deleted
  E - indicates a property/element was edited
  A - indicates a change occurred within an array
  path - the property path (from the left-hand-side root)
  lhs - the value on the left-hand-side of the comparison (undefined if kind === 'N')
  rhs - the value on the right-hand-side of the comparison (undefined if kind === 'D')
  index - when kind === 'A', indicates the array index where the change occurred
  item - when kind === 'A', contains a nested change record indicating the change that occurred at the array index
*/

  d = d.filter(e => {
    //j'enleve quand la notice existante possède des info sumplémentaires. Cad que le fichier ne contient pas toutes les modifications
    if (e.kind === "N" && e.hasOwnProperty("rhs")) {
      return false;
    }
    return true;
  });

  const differences = d.map(e => e.path[0]);
  return differences;
}

export default function checkDiff(notices) {
  try {
    for (var i = 0; i < notices.length; i++) {
      const { from, to } = notices[i];
      //Si pas de notice existante, on en créé une
      if (!from) {
        to._status = "created";
        continue;
      }
      let differences = compare(to, from);
      to._messages = differences.map(e => {
        const fromData = JSON.stringify(from[e]);
        const toData = JSON.stringify(to[e]);
        return `Le champ ${e} à évolué de ${fromData} à ${toData}`;
      });
      if (differences.length) {
        to._status = "updated";
      } else {
        to._status = "unchanged";
      }
    }
  } catch (e) {
    console.log("error", e);
  }
}
