import React from "react";
import Mh from "../../scenes/import/MH";
import Importer from "../../scenes/import/importer";
import ImportTester from "../setup/ImportTester";
import api from "../../services/api.js";

const importTester = new ImportTester({ api });
importTester.disableAmplitude();

test("import component renders for MH", () => {
  const component = importTester.mount(<Mh />);
  expect(component.text()).toContain("déposez vos fichiers");
  expect(component.find(Importer)).toHaveLength(1);
});

test("import wrong encoding", async () => {
  importTester.mount(<Mh />);
  await importTester.dropFiles(["palissy.csv"], "utf-8");
  console.log(component.text())
});

test("import invalid file", async () => {
  const component = importTester.mount(<Mh />);
  await importTester.dropFiles(["joconde-invalid-UTF-8.txt"], "latin1");
  expect(component.text()).toMatch("Pas de fichiers .csv detecté");
});

// test("import Palissy csv", async () => {
//   importTester.mount(<Mh />);
//   await importTester.dropFiles(["palissy.csv"], "latin1");
//   expect(importTester.summaryNewDocsCount()).toBe(0);
//   expect(importTester.summaryUpdatedDocsCount()).toBe(1);
//   expect(importTester.summaryInvalidDocsCount()).toBe(0);
//   expect(importTester.summaryWarningCount()).toBe(0);
// });

// test("import 3 Palissy notice", async () => {
//   importTester.mount(<Mh />);
//   await importTester.dropFiles(["mh_palissy-valid-UTF-8.csv"], "utf-8");
//   expect(importTester.summaryInvalidDocsCount()).toBe(1);
//   expect(importTester.summaryNewDocsCount()).toBe(2);
//   const errors = importTester.notices[2]._errors;
//   expect(errors[0]).toMatch("INSEE et Département ne coincident pas");
// });

// test("import invalid file", async () => {
//   const component = importTester.mount(<Mh />);
//   await importTester.dropFiles(["joconde-invalid-UTF-8.txt"], "latin1");
//   expect(component.text()).toMatch("Pas de fichiers .csv detecté");
// });
