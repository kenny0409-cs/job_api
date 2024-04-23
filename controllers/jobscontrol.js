const Job = require('../models/jobs');

const geoCoder = require('../utils/geocoder');
const ErrorHandler = require('../utils/errorhandle');
const catchAsyncErrors = require('../middlewares/catchAsyncError');
const APIFilters = require('../utils/apifilters');
const path = require('path');
const fs = require('fs');

// get all jobs in this url => /api/v1/jobs
exports.getjobs =catchAsyncErrors(async(req,res,next)=>{

    const apiFilters = new APIFilters(Job.find(), req.query)
        .filter()
        .sort()
        .limit()
        .searchByQuery()
        .pagination();
    const jobs = await apiFilters.query;

    res.status(200).json({
        success : true,
        results : jobs.length,
        data : jobs
    });
});


//Create a new Job  => /api/v1/jobs/new
exports.newjob = catchAsyncErrors(async(req, res, next) => {

    //console.log(req.body);
    req.body.user = req.user.id;
    const job = await Job.create(req.body);

    res.status(200).json ({
        success : true,
        message : 'Job created',
        data : job
    });
});

// get a single job with id and slug => /api/v1/job/:id/:slug
exports.getjob =catchAsyncErrors(async (req, res, next)=>{
    const job  = await Job.find({$and : [{_id : req.params.id}, {slug : req.params.slug}],
        path : 'user',
        select : 'name'
    });

    if(!job || job.length === 0)
    {
        return next(new ErrorHandler('Job not found', 404));
    }

    res.status(200).json({
        success : true,
        data : job
    });

});

//update a job => /api/v1/job/:id
exports.updatejob  =catchAsyncErrors(async (req, res, next) => {
    let job  = await Job.findById(req.params.id);

    if(!job){
        return next(new ErrorHandler('Job not found', 404));
    }

    console.log(job.user);

    //check whether is the owner
    if(job.user.toString() !== req.user.id && req.user.role !== 'admin')
    {
        return next(new ErrorHandler(`User(${req,user.id}) is not allowed to  update this job.`))
    }


    job = await Job.findByIdAndUpdate(req.params.id, req.body, {
        new : true,
        runValidators : true,
        useFindAndMoidfy : false
    });

    res.status(200).json({
        success : true,
        message :'Job is updated',
        data : job
    });
});


//delete a job => /api/v1/job/:id
exports.deletejob =catchAsyncErrors(async (req,res, next) => {
    let job = await Job.findById(req.params.id).select('+applicant');
    console.log(job.applicant.length);
    if(!job)
    {
        return next(new ErrorHandler('Job not found', 404));
    }

    if(job.user.toString() !== req.user.id && req.user.role !== 'admin')
    {
        return next(new ErrorHandler(`User(${req,user.id}) is not allowed to delete this job.`));
    }
    

    for(let i=0;i<job.applicant.length;i++)
    {
        let filepath = `${__dirname}/public/uploads/${job.applicant[i].resume}`.replace('\\controllers', '');

        fs.unlink(filepath, err => {
            if (err) return console.log(err);
        });

    }


    job = await Job.findByIdAndDelete(req.params.id);

    res.status(200).json({
        success :  true,
        message : 'Job is deleted'
    })
});

//Search job within radius or distance => /api/v1/jobs/:zipcode/:distance
exports.getJobsInRadius = catchAsyncErrors(async (req, res,next) => {
    const {zipcode ,  distance} = req.params;
    
    //getting latitude and longitude from geocoder with zipcode
    const loc = await geoCoder.geocode(zipcode);
    const latitude = loc[0].latitude;
    const longitude  = loc[0].longitude;
    const radius  = distance / 3963;
    const jobs = await Job.find({
        //passing the longitude and latitude 
        location : {$geoWithin : {$centerSphere: [[longitude, latitude], radius]
        }}
    });
    res.status(200).json({
        success : true,
        results : jobs.length,
        data : jobs
    })
});

//get stats about a job topic => /api/v1/stats/:topic
exports.jobStats = catchAsyncErrors(async (req, res, next) => {
    const stats = await Job.aggregate([
        {
            $match : {$text : {$search : "\"" + req.params.topic + "\""}}
        },
        {
            $group: {
                _id : {$toUpper : '$experience'},
                totalJobs : {$sum : 1},
                avgPosition : {$avg : '$salary'},
                avgSalary : {$avg : '$salary'},
                minSalary : {$min : '$salary'},
                maxSalary : {$max : '$salary'}
            }
        }
    ]);

    if(stats.length === 0 )
    {
        return next(new ErrorHandler(`No stats found here - ${req.params.topic}`, 200));
    }

    res.status(200).json({
        success : true,
        data : stats
    });
});

//apply to job using resume => /api/v1/job/:id/apply
exports.applyjob = catchAsyncErrors(async(req,res,next)=>{
    let job = await Job.findById(req.params.id).select('+applicant');
    
    if(!job){
        return next(new ErrorHandler('Job not found', 404));
    }

    //check that if job last date has been passed or not
    if(job.lastdate < new Date(Date.now())){
        return next(new ErrorHandler('you cannot apply to this job. Date is expired.', 400));
    }

    //check if user applied before
    for(let i =0;i<job.applicant.length;i++)
    {
        if(job.applicant[i].id === req.user.id)
        {
            return next(new ErrorHandler('You have already applied to this job',400));
        }
    }

    // check the files
    if((!req.files)) {
        return next(new ErrorHandler('Please upload file.', 400));
    }
    const file = req.files.file;

    //check file type
    const supportedfiles = /.docs|.pdf/;
    if(!supportedfiles.test(path.extname(file.name))){ //check whether the extension path is the same as the supoorted file name 
        return next(new ErrorHandler('Please upload document file.',400));
    }

    //check document sizes
    if(file.size > process.env.MAX_FILE_SIZE)
    {
        return next(new ErrorHandler('Please upload file less than 2MB.',400));
    }

    //rename document or resume
    file.name = `${req.user.name.replace(' ', '_')}_${job._id}${path.parse(file.name).ext}`;

    file.mv(`${process.env.UPLOAD_PATH}/${file.name}`, async err=>{
        if(err)
        {
            console.log(err);
            return next(new ErrorHandler('Resume upload failed', 500));
        }

        await Job.findByIdAndUpdate(req.params.id,{$push : {
            applicant : {
                id : req.user.id,
                resume : file.name
            }
        }}, {
            new : true,
            runValidators : true,
            useFindAndMoidfy : false
        });

        res.status(200).json({
            success : true,
            message : 'Applied to job Succesfully',
            data : file.name
        })
    });
});

//why not .then & .catch is because in ./models/jobs we already specify each categories error handling when 
//there is an error