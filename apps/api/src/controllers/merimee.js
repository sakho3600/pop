const express = require("express");
const multer = require("multer");
const mongoose = require("mongoose");
const filenamify = require("filenamify");
const upload = multer({ dest: "uploads/" });
const router = express.Router();
const Merimee = require("../models/merimee");
const { checkESIndex, updateNotice, getNewId, uploadFile } = require("./utils");
const { capture } = require("./../sentry.js");
const passport = require("passport");

const {
  transformBeforeUpdate,
  transformBeforeCreate,
  populateREFO,
  checkIfMemoireImageExist
} = require("./merimeeUtils");


router.get("/newId", passport.authenticate("jwt", { session: false }), async (req, res) => {
  try {
    const prefix = req.query.prefix;
    const dpt = req.query.dpt;

    if (!prefix || !dpt) {
      return res.status(500).send({ error: "Missing dpt or prefix" });
    }
    const id = await getNewId(Merimee, prefix, dpt);
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
      notice.REFO = await populateREFO(notice);
      //Update IMPORT ID
      if (notice.POP_IMPORT.length) {
        const id = notice.POP_IMPORT[0];
        delete notice.POP_IMPORT;
        notice.$push = { POP_IMPORT: mongoose.Types.ObjectId(id) };
      }

      const arr = [];

      for (let i = 0; i < req.files.length; i++) {
        arr.push(
          uploadFile(
            `merimee/${filenamify(notice.REF)}/${filenamify(req.files[i].originalname)}`,
            req.files[i]
          )
        );
      }
      //Add generate fields
      transformBeforeUpdate(notice);

      arr.push(updateNotice(Merimee, ref, notice));

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
      notice.REFO = await populateREFO(notice);
      transformBeforeCreate(notice);

      const obj = new Merimee(notice);
      checkESIndex(obj);

      const arr = [];
      arr.push(obj.save());

      for (let i = 0; i < req.files.length; i++) {
        arr.push(
          uploadFile(
            `merimee/${filenamify(notice.REF)}/${filenamify(req.files[i].originalname)}`,
            req.files[i]
          )
        );
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
  Merimee.findOne({ REF: ref }, (err, notice) => {
    if (err) {
      capture(err);
      res.status(500).send(err);
      return;
    }
    if (notice) {
      res.status(200).send(notice);
    } else {
      res.sendStatus(404);
    }
  });
});

router.get("/", (req, res) => {
  const offset = parseInt(req.query.offset) || 0;
  const limit = parseInt(req.query.limit) || 20;
  Merimee.paginate({}, { offset, limit }).then(results => {
    res.status(200).send(results.docs);
  });
});

router.delete("/:ref", passport.authenticate("jwt", { session: false }), (req, res) => {
  const ref = req.params.ref;
  Merimee.findOneAndRemove({ REF: ref }, error => {
    if (error) {
      capture(error);
      return res.status(500).send({ error });
    }
    return res.status(200).send({});
  });
});

module.exports = router;
