const express = require('express');
const router  = express.Router();


// import the jobscontrol method
const {getjobs, getjob ,newjob, getJobsInRadius, updatejob, deletejob,jobStats, applyjob} = require('../controllers/jobscontrol.js');

const { isAuthenticatedUser, authorizeRole}=require('../middlewares/auth');
// passing the url
//router.use(isAuthenticatedUser);
router.route('/jobs').get(getjobs); 
router.route('/job/:id/:slug').get(getjob);   
router.route('/jobs/:zipcode/:distance').get(getJobsInRadius);
router.route('/stats/:topic').get(jobStats);
router.route('/jobs/new').post(isAuthenticatedUser,authorizeRole('employer','admin'), newjob);
router.route('/job/:id/apply').put(isAuthenticatedUser,authorizeRole('user'),applyjob)
router.route('/job/:id')
    .put(isAuthenticatedUser, authorizeRole('employer', 'admin'),updatejob)
    .delete(isAuthenticatedUser, authorizeRole('employer','admin'),deletejob);
//mapping a router 
module.exports = router;
