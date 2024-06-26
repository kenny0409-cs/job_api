const User = require('../models/users');
const Job = require('../models/jobs');
const catchAsyncErrors = require('../middlewares/catchAsyncError');
const ErrorHandler = require('../utils/errorhandle');
const sendToken = require('../utils/jwttoken');
const fs = require('fs');
const APIFilters = require('../utils/apifilters')

//get current user profile => /api/v1/me
exports.getUserProfile = catchAsyncErrors(async(req,res,next)=>{
    
    const user = await User.findById(req.user.id)
        .populate({
            path : 'jobsPublished',
            select : 'title postingDate'
        });

    res.status(200).json({
        success : true,
        data :user
    })
});

//update current user passowrd  => /api/v1/password/update
exports.updatepassword = catchAsyncErrors(async(req,res,next) => { 
    const user = await User.findById(req.user.id).select('+password');

    //check previous user password
    const ismatched = await user.comparePassword(req.body.currentPassword);
    if(!ismatched){
        return next(new ErrorHandler('Old Password is incorrect.',401));
    }

    user.password = req.body.newPassword;
    await user.save();

    sendToken(user, 200 ,res);

});

//update current user data => /api/v1/me/update
exports.updateUser = catchAsyncErrors(async(req,res,next) => {
    const newUserData = {
        name : req.body.name,
        email : req.body.email
    }

    const user = await User.findByIdAndUpdate(req.user.id, newUserData, {
        new : true,
        runValidators : true
    });

    res.status(200).json({
        success : true,
        data : user
    });
})

// Show all applied jobs => /api/v1/jobs/applied
exports.getAppliedJobs = catchAsyncErrors(async (req,res,next) => {
    const jobs = await Job.find({'applicant.id' : req.user.id}).select('+applicant');

    res.status(200).json({
        success : true,
        results : jobs.length,
        data : jobs
    })
});

//show all jobs publish by employer => /api/v1/job/published
exports.getPublishedJobs = catchAsyncErrors( async (req, res, next) => {
    const job = await Job.find({user : req.user.id});

    res.status(200).json({
        success : true,
        result : job.length,
        data : job
    })
})

//delete current user data => /api/v1/me/delete
exports.deleteUser = catchAsyncErrors(async(req,res,next) => {

    deleteUserData(req.user.id, req.user.role);

    const user = await User.findByIdAndDelete(req.user.id);

    res.cookie('token', 'none', {
        expires : new Date(Date.now()),
        httpOnly : true
    });

    res.status(200).json({
        success : true,
        message : 'Your account has been deleted '
    })
})

// adding controller methods that only accessible by admin

//show all user(admin) => /api/v1/users
exports.getUsers = catchAsyncErrors(async (req,res,next) => {
    const apiFilters = new APIFilters(User.find(), req.query)
        .filter()
        .sort()
        .limit()
        .pagination();
    
    const users = await apiFilters.query;

    res.status(200).json({
        success :  true,
        results : users.length,
        data : users
    });
});

//Delete user(admin) => /api/v1/user/:id
exports.deleteUserAdmin = catchAsyncErrors( async(req,res,next)=> {
    const user = await User.findById(req.params.id);

    if(!user)
    {
        return next(new ErrorHandler(`User not found with id: ${req.params.id}`, 404));
    }

    deleteUserData(user.id, user.role);
    await user.deleteOne();

    res.status(200).json({
        success : true,
        message : 'User is deleted by Admin'
    });
});

//delete user file and employer jobs 
async function deleteUserData(user, role){

    if(role === 'employer') {
        await Job.deleteMany({user : user});
    }

    if(role === 'user') {
        const appliedJobs = await Job.find({'applicant.id' : user}).select('+applicant'); //get all the user in the applicant schema 

        for(let i=0; i<appliedJobs.length; i++) {//traverse through the loop to find similar id with the user in the jobs area
            let obj = appliedJobs[i].applicant.find(o => o.id === user);

            let filepath = `${__dirname}/public/uploads/${obj.resume}`.replace('\\controllers', '');//replace the file path to none

            fs.unlink(filepath, err => { //unlink resume
                if(err) return console.log(err);
            });
            
            appliedJobs[i].applicant.splice(appliedJobs[i].applicant.indexOf(obj.id));
            //delete user object from that array of appliedjobs
            await appliedJobs[i].save(); //save it after deleting the file
        }
    }
}
