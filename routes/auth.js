const express = require('express');
const router = express.Router();

//importing from authcontrol to be used 
const { registerUser , loginUser, forgotPassword,resetPassword,logout} =  require('../controllers/authcontrol');

const { isAuthenticatedUser}=require('../middlewares/auth');
router.route('/register').post(registerUser);
router.route('/login').post(loginUser);

router.route('/password/forgot').post(forgotPassword);// send and saving the data
router.route('/password/reset/:token').put(resetPassword);

router.route('/logout').get(isAuthenticatedUser,logout);
module.exports = router;