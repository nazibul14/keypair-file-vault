var express = require('express');
var router = express.Router();
const fileController = require("../controllers/fileController");

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Keypair File Vault' });
});

router.get("/files", fileController.index);

module.exports = router;
