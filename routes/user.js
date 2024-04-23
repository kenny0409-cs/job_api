const express = require('express');
const router  = express.Router();

const {getUserProfile , updatepassword, updateUser, deleteUser, getAppliedJobs, getPublishedJobs, getUsers, deleteUserAdmin} = require('../controllers/usercontrol');
const { isAuthenticatedUser, authorizeRole} = require('../middlewares/auth');


router.use(isAuthenticatedUser);

router.route('/me').get(isAuthenticatedUser,getUserProfile);
router.route('/job/applied').get(isAuthenticatedUser, authorizeRole('user'),getAppliedJobs);

router.route('/job/published').get(isAuthenticatedUser, authorizeRole('admin','employer'),getPublishedJobs);


router.route('/password/update').put(isAuthenticatedUser, updatepassword);
router.route('/me/update').put(isAuthenticatedUser,updateUser);
router.route('/me/delete').delete(isAuthenticatedUser, deleteUser);

//admin only routes
router.route('/users').get(isAuthenticatedUser, authorizeRole('admin'), getUsers);
router.route('/user/:id').delete(authorizeRole('admin'),deleteUserAdmin); 

module.exports = router;

