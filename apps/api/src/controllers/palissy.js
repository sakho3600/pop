const express = require("express");
const router = express.Router();
const multer = require("multer");
const mongoose = require("mongoose");
const filenamify = require("filenamify");
const upload = multer({ dest: "uploads/" });

const Palissy = require("../models/palissy");
const { getNewId, checkESIndex, updateNotice, uploadFile } = require("./utils");

const {
  transformBeforeUpdate,
  transformBeforeCreate,
  populateMerimeeREFO,
  checkIfMemoireImageExist
} = require("./palissyUtils");

const { capture } = require("./../sentry.js");
const passport = require("passport");

router.get("/newId", passport.authenticate("jwt", { session: false }), async (req, res) => {
  const prefix = req.query.prefix;
  const dpt = req.query.dpt;
  try {
    if (!prefix || !dpt) {
      return res.status(500).send({ error: "Missing dpt or prefix" });
    }
    const id = await getNewId(Palissy, prefix, dpt);
    return res.status(200).send({ id });
  } catch (error) {
    capture(error);
    return res.status(500).send({ error });
  }
});

router.put(
  "/:ref",
  passport.authenticate("jwt", { session: false }),
  upload.any(),
  async (req, res) => {
    try {
      const ref = req.params.ref;
      const notice = JSON.parse(req.body.notice);
      if (notice.MEMOIRE) {
        notice.MEMOIRE = await checkIfMemoireImageExist(notice);
      }
      //Update IMPORT ID
      if (notice.POP_IMPORT.length) {
        const id = notice.POP_IMPORT[0];
        delete notice.POP_IMPORT;
        notice.$push = { POP_IMPORT: mongoose.Types.ObjectId(id) };
      }

      //Add generate fields
      transformBeforeUpdate(notice);

      const arr = [];

      for (let i = 0; i < req.files.length; i++) {
        arr.push(
          uploadFile(
            `palissy/${filenamify(notice.REF)}/${filenamify(req.files[i].originalname)}`,
            req.files[i]
          )
        );
      }

      arr.push(updateNotice(Palissy, ref, notice));
      arr.push(populateMerimeeREFO(notice));

      await Promise.all(arr);

      res.status(200).send({ success: true, msg: "OK" });
    } catch (e) {
      capture(e);
      res.status(500).send({ success: false, msg: JSON.stringify(e) });
    }
  }
);

router.post(
  "/",
  passport.authenticate("jwt", { session: false }),
  upload.any(),
  async (req, res) => {
    try {
      const notice = JSON.parse(req.body.notice);
      notice.MEMOIRE = await checkIfMemoireImageExist(notice);
      await populateMerimeeREFO(notice);

      transformBeforeCreate(notice);

      const obj = new Palissy(notice);
      checkESIndex(obj);

      const arr = [];
      arr.push(obj.save());

      for (let i = 0; i < req.files.length; i++) {
        arr.push(uploadFile(`palissy/${notice.REF}/${req.files[i].originalname}`, req.files[i]));
      }

      await Promise.all(arr);
      res.status(200).send({ success: true, msg: "OK" });
    } catch (e) {
      capture(e);
      res.status(500).send({ success: false, msg: JSON.stringify(e) });
    }
  }
);

router.get("/:ref", (req, res) => {
  const ref = req.params.ref;
  Palissy.findOne({ REF: ref }, (err, notice) => {
    if (err) {
      capture(err);
      return res.status(500).send(err);
    }
    if (!notice) {
      return res.sendStatus(404);
    }
    res.status(200).send(notice);
  });
});

router.get("/", (req, res) => {
  const offset = parseInt(req.query.offset) || 0;
  const limit = parseInt(req.query.limit) || 20;
  Palissy.paginate({}, { offset, limit }).then(results => {
    res.status(200).send(results.docs);
  });
});

router.delete("/:ref", passport.authenticate("jwt", { session: false }), (req, res) => {
  const ref = req.params.ref;
  Palissy.findOneAndRemove({ REF: ref }, error => {
    if (error) {
      capture(error);
      return res.status(500).send({ error });
    }
    return res.status(200).send({});
  });
});

module.exports = router;
