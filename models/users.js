const mongoose = require('mongoose');
const validator = require('validator');
const cryptic  = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');


const userSchema = new mongoose.Schema({
    name: {
        type : String,
        required : [true, 'Please enter your name']
    },

    email: {
        type : String,
        required : [true, 'Please enter your email'],
        unique : true,
        validate : [validator.isEmail, 'Please enter valid email']
    },

    role: {
        type : String,
        enum : {
            values : ['user', 'employer','admin'],
            message : 'Please select correct role'
        },
        default : 'user'
    },
    password : {
        type : String,
        required : [true, 'Please enter password for your account'],
        minlength : [8, 'Your password must be at least 8 characters'],
        select : false //not to show the password to the user
    },
    createdAt : {
        type : Date,
        default : Date.now
    },

    resetPasswordToken : String,
    resetPasswordExpire : Date
},
{
    toJSON : {virtuals : true},
    toObject : {virtuals : true}
});

//Encrypting passwrods before saving
userSchema.pre('save', async function(next){

    if(!this.isModified('password')){
        next();
    }
    this.password = await cryptic.hash(this.password, 10);
});

//return jwt
userSchema.methods.getJwtToken = function() {
    return jwt.sign({ id: this._id} , process.env.JWT_SECRET, {
        expiresIn : process.env.JWT_EXPIRES_TIME
    });
} 

//compare user password in databases password
userSchema.methods.comparePassword = async function(enterPassword){
    return await cryptic.compare(enterPassword,this.password);
}

//Generate Password Reset Token
userSchema.methods.getResetPasswordToken = function () {
    
    //Generate token
    const resetToken = crypto.randomBytes(20).toString('hex');

    //Hash and set to resetPasswordTOken 
    this.resetPasswordToken = crypto
            .createHash('sha256') 
            .update(resetToken)
            .digest('hex');

    console.log('This is reset token :',resetToken);
    //set token expire time 
    this.resetPasswordExpire = Date.now() + 30*60*1000;

    return resetToken;
}


// Show all job create by user using virtual
userSchema.virtual('jobsPublished', {
    ref : 'Job',
    localField : '_id',
    foreignField : 'user',
    justOne : false
});

module.exports = mongoose.model('User',userSchema);
