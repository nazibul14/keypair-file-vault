var express = require('express');
var router = express.Router();
const fileRoutes = require("../routes/fileRoutes");

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Keypair File Vault' });
});

router.use("/", fileRoutes);

module.exports = router;
