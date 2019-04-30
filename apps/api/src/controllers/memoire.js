const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const mongoose = require("mongoose");
const filenamify = require("filenamify");
const Memoire = require("../models/memoire");
const { uploadFile, formattedNow, checkESIndex, updateNotice, deleteFile } = require("./utils");
const { capture } = require("./../sentry.js");
const passport = require("passport");

const { transformBeforeUpdate, transformBeforeCreate, updateLinks } = require("./memoireUtils");

router.put("/:ref", passport.authenticate("jwt", { session: false }), upload.any(), (req, res) => {
  const ref = req.params.ref;
  const notice = JSON.parse(req.body.notice);

  const arr = [];
  for (let i = 0; i < req.files.length; i++) {
    arr.push(
      uploadFile(
        `memoire/${filenamify(notice.REF)}/${filenamify(req.files[i].originalname)}`,
        req.files[i]
      )
    );
  }

  //Update IMPORT ID
  if (notice.POP_IMPORT.length) {
    const id = notice.POP_IMPORT[0];
    delete notice.POP_IMPORT;
    notice.$push = { POP_IMPORT: mongoose.Types.ObjectId(id) };
  }

  transformBeforeUpdate(notice);

  arr.push(updateLinks(notice));
  arr.push(updateNotice(Memoire, ref, notice));

  Promise.all(arr)
    .then(() => {
      res.sendStatus(200);
    })
    .catch(e => {
      capture(e);
      res.sendStatus(500);
    });
});

router.post("/", passport.authenticate("jwt", { session: false }), upload.any(), (req, res) => {
  const notice = JSON.parse(req.body.notice);

  notice.DMIS = notice.DMAJ = formattedNow();
  const arr = [];
  for (var i = 0; i < req.files.length; i++) {
    arr.push(
      uploadFile(
        `memoire/${filenamify(notice.REF)}/${filenamify(req.files[i].originalname)}`,
        req.files[i]
      )
    );
  }

  arr.push(updateLinks(notice));

  transformBeforeCreate(notice);

  const obj = new Memoire(notice);

  //send error if obj is not well sync with ES
  checkESIndex(obj);

  arr.push(obj.save());
  Promise.all(arr)
    .then(() => {
      res.send({ success: true, msg: "OK" });
    })
    .catch(error => {
      capture(error);
      res.sendStatus(500);
    });
});

router.get("/", (req, res) => {
  const offset = parseInt(req.query.offset) || 0;
  const limit = parseInt(req.query.limit) || 20;
  Memoire.paginate({}, { offset, limit }).then(results => {
    res.status(200).send(results.docs);
  });
});

router.get("/:ref", (req, res) => {
  const ref = req.params.ref;
  Memoire.findOne({ REF: ref }, (err, notice) => {
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

router.delete("/:ref", passport.authenticate("jwt", { session: false }), async (req, res) => {
  try {
    const ref = req.params.ref;
    const doc = await Memoire.findOne({ REF: ref });
    if (!doc) {
      return res.status(500).send({
        error: `Je ne trouve pas la notice memoire ${ref} à supprimer`
      });
    }

    //DELETE LBASE
    doc.LBASE = [];
    await updateLinks(doc);
    const arr = [deleteFile(doc.IMG), doc.remove()];
    await Promise.all(arr);
    return res.status(200).send({});
  } catch (error) {
    capture(error);
    return res.status(500).send({ error });
  }
});

module.exports = router;
