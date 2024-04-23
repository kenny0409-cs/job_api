const mongoose = require('mongoose');

// validate our inputs
const validator = require('validator');

//import slugify
const slugify = require('slugify');

const geocoder = require('../utils/geocoder')

const jobshceme = new mongoose.Schema({
    title : {
        type : String,
        required : [true , 'Please enter job title'],
        //remove blank space
        trim : true,
        maxlength : [100, 'Job title cannot exceed 100 character']
    },
    slug :  String,
    description : {
        type : String,
        require : [true , 'please enter job description'],
        maxlength : [1000, 'Job description cannot exceed 1000 characters']
    },

    email : {
        type : String,
        validate : [validator.isEmail, 'Please give me a valid email address']
    },

    address : {
        type : String,
        required : [true, 'Please add an address']
    },

    location :{
        type : {
            type : String,
            enum  : ['Point']
        },
        coordinates : {
            type : [Number],
            index : '2dSphere'
        },
        formattedAddress : String,
        city : String,
        state : String,
        zipcode : String,
        country : String 
    },

    company : {
        type : String,
        required : [true, 'Please add company name']
    },

    industry : {
        // string is set to array format because in values we gonna choose more than one strings
        type : [String],
        required : [true, 'Please enter industry for this job'],
        enum : {
            values : ['Business' , 
                    'Information Technology',
                    'Education',
                    'Banking',
                    'Others'
                    ],
            message : 'Please select correct option for industry.'
        }
    },

    jobType : {
        //there is no array format cause in the values we only need to select one
        type : String,
        require : [true, 'Please enter job type'],
        enum : {
            values : ['Permanent','Temporary', 'Internship'],
            message : 'Please select correct Job type'
        }
    },

    minEducation : {
        type : String,
        required : [true, 'Please enter minimum education for this job'],
        enum : {
            values : ['Bachelors', 'Master','PHD'],
            message : 'Please select correct option for education'
        }
    },

    position : {
        type : Number,
        default : 1,
    },

    experience : {
        type : String,
        required : [true, 'Please enter experience required for this job'],
        enum : {
            values : ['No Experience', '1 Year - 2 Year', '2 Year - 5 Year', '5Year+'],
            message : 'Please select the current experience you have.'
        }
    },

    salary : {
        type : Number,
        required : [true , 'Please enter the expected salary']
    },

    postingdate : {
        type :Date,
        default : Date.now
    },

    lastdate : {
        type : Date, 
        //adding 7 days after the posting date as a default lastdate
        default : new Date().setDate(new Date().getDate() + 7)
    },

    applicant : {
        type : [Object],
        select : false,
    },

    user : {
        type : mongoose.Schema.ObjectId,
        ref : 'User',
    }

    
});

// creating job slug before saving
jobshceme.pre('save', function(next){
    //creating slug before saving to DB
    this.slug = slugify(this.title,{lower : true});//seeing slug in small letters
    
    next();
});

//Setting up location
jobshceme.pre('save' ,async function(next) {
    const loc =await geocoder.geocode(this.address);

    this.location = {
        type : 'Point',
        coordinates : [loc[0].longitude, loc[0].latitude],
        fommatedAddress : loc[0].formattedAddress,
        city : loc[0].city,
        state : loc[0].stateCode,
        zipcode : loc[0].zipcode,
        country : loc[0].countryCode
    }
});


module.exports = mongoose.model('Job',jobshceme);